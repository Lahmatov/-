import SwiftUI

struct SearchView: View {
    @Environment(AuthStore.self) private var auth
    @State private var query = ""
    @State private var results: SearchResults?
    @State private var isSearching = false
    @State private var addingKey: String?
    @State private var showAddBook = false
    @State private var showScanner = false
    /// «Добавить вручную» из сканера: форму открываем после того, как сканер закроется,
    /// иначе SwiftUI не покажет второй sheet, пока первый ещё уходит с экрана.
    @State private var pendingManualAdd = false
    @State private var path = NavigationPath()
    @State private var errorMessage: String?

    private var trimmedQuery: String { query.trimmingCharacters(in: .whitespacesAndNewlines) }

    var body: some View {
        NavigationStack(path: $path) {
            List {
                if trimmedQuery.isEmpty {
                    ContentUnavailableView(
                        "Найдите книгу",
                        systemImage: "magnifyingglass",
                        description: Text("Ищем по названию и автору в нашем каталоге и в Open Library")
                    )
                    .listRowBackground(Color.clear)
                } else {
                    resultSections
                    Section {
                        Button("Добавить книгу вручную", systemImage: "square.and.pencil") { showAddBook = true }
                    } footer: {
                        Text("Если книги нет ни у нас, ни в Open Library")
                    }
                }
            }
            .navigationTitle("Поиск")
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Название или автор")
            .autocorrectionDisabled()
            .task(id: trimmedQuery) { await search(trimmedQuery) }
            .overlay(alignment: .top) {
                if isSearching { ProgressView().padding(.top, 8) }
            }
            .appDestinations()
            .toolbar {
                Button("Сканировать штрихкод", systemImage: "barcode.viewfinder") { showScanner = true }
            }
            .sheet(isPresented: $showScanner, onDismiss: {
                if pendingManualAdd {
                    pendingManualAdd = false
                    showAddBook = true
                }
            }) {
                BarcodeScannerView { book in
                    showScanner = false
                    path.append(BookRoute(id: book.id))
                } onNotFound: {
                    pendingManualAdd = true
                    showScanner = false
                }
            }
            .sheet(isPresented: $showAddBook) {
                AddBookView(initialTitle: trimmedQuery) { book in
                    showAddBook = false
                    path.append(BookRoute(id: book.id))
                }
            }
            .errorAlert($errorMessage)
        }
    }

    @ViewBuilder
    private var resultSections: some View {
        if let results {
            if !results.local.isEmpty {
                Section("В каталоге") {
                    ForEach(results.local) { book in
                        NavigationLink(value: BookRoute(id: book.id)) {
                            BookRowView(book: book)
                        }
                    }
                }
            }
            if !results.openLibrary.isEmpty {
                Section("Open Library") {
                    ForEach(results.openLibrary) { hit in
                        Button {
                            Task { await add(hit) }
                        } label: {
                            HStack(spacing: 12) {
                                BookCoverView(url: hit.coverUrl, title: hit.title)
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(hit.title).font(.headline).lineLimit(2)
                                    Text(hit.subtitle).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                                }
                                Spacer()
                                if addingKey == hit.key {
                                    ProgressView()
                                } else {
                                    Image(systemName: "plus.circle.fill")
                                        .font(.title2)
                                        .foregroundStyle(.tint)
                                }
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .disabled(addingKey != nil)
                        .accessibilityHint("Добавить в каталог и открыть")
                    }
                }
            }
            if results.local.isEmpty && results.openLibrary.isEmpty && !isSearching {
                Text("Ничего не нашлось")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func search(_ query: String) async {
        guard query.count >= 2 else {
            results = nil
            return
        }
        // Небольшая пауза, чтобы не отправлять запрос на каждую букву. Новый ввод отменяет задачу.
        try? await Task.sleep(for: .milliseconds(350))
        guard !Task.isCancelled else { return }
        isSearching = true
        do {
            let found = try await auth.api.search(query)
            if !Task.isCancelled { results = found }
        } catch {
            if !Task.isCancelled { errorMessage = error.localizedDescription }
        }
        if !Task.isCancelled { isSearching = false }
    }

    private func add(_ hit: OpenLibraryHit) async {
        addingKey = hit.key
        defer { addingKey = nil }
        do {
            let book = try await auth.api.addFromOpenLibrary(hit)
            path.append(BookRoute(id: book.id))
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
