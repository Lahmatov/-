import SwiftUI

struct ListSummaryRow: View {
    let title: String
    let count: Int
    let isPublic: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.headline)
            Text("\(count) \(Plural.ru(count, "книга", "книги", "книг"))" + (isPublic ? "" : " · личный"))
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

/// Мои списки (из вкладки «Профиль»).
struct MyListsView: View {
    @Environment(AuthStore.self) private var auth
    @State private var lists: [MyList]?
    @State private var showCreate = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let lists {
                if lists.isEmpty {
                    ContentUnavailableView(
                        "Списков пока нет",
                        systemImage: "list.bullet.rectangle",
                        description: Text("Соберите подборку: «Лучшее за год», «Посоветовать маме», «Взять в отпуск»")
                    )
                }
                ForEach(lists) { list in
                    NavigationLink(value: ListRoute(id: list.id)) {
                        HStack(spacing: 12) {
                            ZStack {
                                ForEach(Array(list.covers.prefix(3).enumerated()), id: \.offset) { index, url in
                                    BookCoverView(url: url, title: "", width: 30)
                                        .offset(x: CGFloat(index) * 8)
                                }
                                if list.covers.isEmpty {
                                    BookCoverView(url: nil, title: "", width: 30)
                                }
                            }
                            .frame(width: 50, alignment: .leading)
                            ListSummaryRow(title: list.title, count: list.count, isPublic: list.isPublic)
                        }
                    }
                }
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .navigationTitle("Мои списки")
        .toolbar {
            Button("Новый список", systemImage: "plus") { showCreate = true }
        }
        .sheet(isPresented: $showCreate) {
            ListEditorView(existing: nil) { _ in await load() }
        }
        .task { await load() }
        .refreshable { await load() }
        .errorAlert($errorMessage)
    }

    private func load() async {
        do {
            lists = try await auth.api.myLists()
        } catch {
            if !Task.isCancelled { errorMessage = error.localizedDescription }
        }
    }
}

struct ListDetailView: View {
    let listId: String

    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var details: ListDetails?
    @State private var showEdit = false
    @State private var confirmDelete = false
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if let details {
                content(details)
            } else if errorMessage != nil {
                ContentUnavailableView("Список недоступен", systemImage: "list.bullet.rectangle")
            } else {
                ProgressView()
            }
        }
        .navigationTitle(details?.list.title ?? "")
        .task { await load() }
        .errorAlert($errorMessage)
    }

    private func content(_ details: ListDetails) -> some View {
        List {
            Section {
                if let description = details.list.description {
                    Text(description)
                }
                NavigationLink(value: UserRoute(id: details.owner.id)) {
                    Text("Список: \(details.owner.name)" + (details.list.isPublic ? "" : " · личный"))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            Section {
                if details.books.isEmpty {
                    Text(details.isOwner ? "Добавляйте книги через меню «⋯» на странице книги" : "В списке пока нет книг")
                        .foregroundStyle(.secondary)
                }
                ForEach(details.books) { book in
                    NavigationLink(value: BookRoute(id: book.id)) { BookRowView(book: book) }
                }
                .onDelete(perform: details.isOwner ? { offsets in Task { await remove(offsets, from: details) } } : nil)
            }
        }
        .refreshable { await load() }
        .toolbar {
            if details.isOwner {
                Menu {
                    Button("Изменить", systemImage: "pencil") { showEdit = true }
                    Button("Удалить список", systemImage: "trash", role: .destructive) { confirmDelete = true }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .sheet(isPresented: $showEdit) {
            ListEditorView(existing: details.list) { _ in await load() }
        }
        .confirmationDialog("Удалить список «\(details.list.title)»?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Удалить", role: .destructive) { Task { await deleteList() } }
        } message: {
            Text("Книги останутся на полке, удалится только подборка.")
        }
    }

    private func load() async {
        do {
            details = try await auth.api.list(id: listId)
        } catch {
            if !Task.isCancelled { errorMessage = error.localizedDescription }
        }
    }

    private func remove(_ offsets: IndexSet, from details: ListDetails) async {
        do {
            for index in offsets {
                try await auth.api.setBook(details.books[index].id, inList: listId, false)
            }
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteList() async {
        do {
            try await auth.api.deleteList(id: listId)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Создание (existing == nil) или редактирование списка.
struct ListEditorView: View {
    let existing: ListSummary?
    let onSaved: (ListSummary) async -> Void

    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var title: String
    @State private var description: String
    @State private var isPublic: Bool
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(existing: ListSummary?, onSaved: @escaping (ListSummary) async -> Void) {
        self.existing = existing
        self.onSaved = onSaved
        _title = State(initialValue: existing?.title ?? "")
        _description = State(initialValue: existing?.description ?? "")
        _isPublic = State(initialValue: existing?.isPublic ?? true)
    }

    var body: some View {
        NavigationStack {
            Form {
                TextField("Название", text: $title)
                TextField("Описание (необязательно)", text: $description, axis: .vertical)
                    .lineLimit(2...6)
                Toggle("Виден в моём профиле", isOn: $isPublic)
            }
            .navigationTitle(existing == nil ? "Новый список" : "Список")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSaving {
                        ProgressView()
                    } else {
                        Button(existing == nil ? "Создать" : "Сохранить") { Task { await save() } }
                            .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
            }
            .errorAlert($errorMessage)
        }
    }

    private func save() async {
        let trimmed = description.trimmingCharacters(in: .whitespacesAndNewlines)
        let input = ListInput(
            title: title.trimmingCharacters(in: .whitespaces),
            description: trimmed.isEmpty ? nil : trimmed,
            isPublic: isPublic
        )
        isSaving = true
        defer { isSaving = false }
        do {
            let saved: ListSummary
            if let existing {
                saved = try await auth.api.updateList(id: existing.id, input)
            } else {
                saved = try await auth.api.createList(input)
            }
            await onSaved(saved)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// «Добавить в список» со страницы книги: отметки у списков, где книга уже есть.
struct AddToListSheet: View {
    let bookId: String

    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var lists: [MyList]?
    @State private var updating: String?
    @State private var showCreate = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            List {
                if let lists {
                    ForEach(lists) { list in
                        Button {
                            Task { await toggle(list) }
                        } label: {
                            HStack {
                                ListSummaryRow(title: list.title, count: list.count, isPublic: list.isPublic)
                                Spacer()
                                if updating == list.id {
                                    ProgressView()
                                } else if list.containsBook == true {
                                    Image(systemName: "checkmark.circle.fill").foregroundStyle(.tint)
                                } else {
                                    Image(systemName: "circle").foregroundStyle(.secondary)
                                }
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .disabled(updating != nil)
                    }
                    Button("Новый список", systemImage: "plus") { showCreate = true }
                } else {
                    ProgressView().frame(maxWidth: .infinity)
                }
            }
            .navigationTitle("В списки")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Готово") { dismiss() }
                }
            }
            .sheet(isPresented: $showCreate) {
                ListEditorView(existing: nil) { created in
                    // Новый список сразу с этой книгой.
                    try? await auth.api.setBook(bookId, inList: created.id, true)
                    await load()
                }
            }
            .task { await load() }
            .errorAlert($errorMessage)
        }
        .presentationDetents([.medium, .large])
    }

    private func load() async {
        do {
            lists = try await auth.api.myLists(bookId: bookId)
        } catch {
            if !Task.isCancelled { errorMessage = error.localizedDescription }
        }
    }

    private func toggle(_ list: MyList) async {
        updating = list.id
        defer { updating = nil }
        do {
            try await auth.api.setBook(bookId, inList: list.id, !(list.containsBook ?? false))
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
