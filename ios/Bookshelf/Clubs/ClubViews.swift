import SwiftUI

/// Мои книжные клубы: создать новый или вступить по коду приглашения.
struct ClubsView: View {
    @Environment(AuthStore.self) private var auth
    @State private var clubs: [ClubSummary] = []
    @State private var isLoaded = false
    @State private var showCreate = false
    @State private var showJoin = false
    @State private var joinCode = ""
    @State private var openClub: ClubRoute?
    @State private var errorMessage: String?

    var body: some View {
        List {
            ForEach(clubs) { club in
                NavigationLink(value: ClubRoute(id: club.id)) {
                    HStack(spacing: 12) {
                        BookCoverView(url: club.book.coverUrl, title: club.book.title, width: 40)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(club.name).font(.headline)
                            Text(club.book.title).font(.subheadline).foregroundStyle(.secondary)
                            Text(L("Участников: %@ · сообщений: %@", String(club.memberCount), String(club.postCount)))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .overlay {
            if isLoaded && clubs.isEmpty {
                ContentUnavailableView {
                    Label("Клубов пока нет", systemImage: "person.3")
                } description: {
                    Text("Читайте одну книгу вместе с друзьями и обсуждайте её по главам — без спойлеров.")
                } actions: {
                    Button("Создать клуб") { showCreate = true }
                        .buttonStyle(.borderedProminent)
                    Button("Вступить по коду") { showJoin = true }
                }
            }
        }
        .navigationTitle("Книжные клубы")
        .toolbar {
            Menu {
                Button("Создать клуб", systemImage: "plus") { showCreate = true }
                Button("Вступить по коду", systemImage: "key") { showJoin = true }
            } label: {
                Image(systemName: "plus")
            }
        }
        .refreshable { await load() }
        .task { await load() }
        .sheet(isPresented: $showCreate) {
            CreateClubView { id in
                await load()
                openClub = ClubRoute(id: id)
            }
        }
        .alert("Код приглашения", isPresented: $showJoin) {
            TextField("Например, AB3DEF9K", text: $joinCode)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
            Button("Вступить") { Task { await join() } }
            Button("Отмена", role: .cancel) { joinCode = "" }
        } message: {
            Text("Код можно получить у участника клуба.")
        }
        .navigationDestination(item: $openClub) { ClubDetailView(clubId: $0.id) }
        .errorAlert($errorMessage)
    }

    private func load() async {
        do {
            clubs = try await auth.api.clubs()
            isLoaded = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func join() async {
        let code = joinCode
        joinCode = ""
        do {
            let id = try await auth.api.joinClub(code: code)
            await load()
            openClub = ClubRoute(id: id)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Новый клуб: название и книга с полки.
struct CreateClubView: View {
    let onCreated: (String) async -> Void

    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var description = ""
    @State private var chapters = ""
    @State private var books: [Book] = []
    @State private var bookId: String?
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Название клуба", text: $name)
                    TextField("Описание (необязательно)", text: $description, axis: .vertical)
                        .lineLimit(2...5)
                }
                Section {
                    if books.isEmpty {
                        Text("Добавьте книгу на полку — её можно будет выбрать для клуба.")
                            .foregroundStyle(.secondary)
                    } else {
                        Picker("Книга", selection: $bookId) {
                            Text("Не выбрана").tag(String?.none)
                            ForEach(books) { book in
                                Text(book.title).tag(Optional(book.id))
                            }
                        }
                    }
                    TextField("Глав в книге (необязательно)", text: $chapters)
                        .keyboardType(.numberPad)
                } footer: {
                    Text("Обсуждение делится по главам: сообщения о главах, до которых участник ещё не дочитал, скрыты.")
                }
            }
            .navigationTitle("Новый клуб")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Отмена") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Создать") { Task { await create() } }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || bookId == nil || isSaving)
                }
            }
            .task { await loadBooks() }
            .errorAlert($errorMessage)
        }
    }

    private func loadBooks() async {
        do {
            let shelf = try await auth.api.shelf()
            // Сначала то, что читаю или хочу прочитать.
            let order: [ReadingStatus] = [.reading, .want, .paused, .read, .dropped]
            books = shelf.items
                .sorted { (order.firstIndex(of: $0.entry.status) ?? 9) < (order.firstIndex(of: $1.entry.status) ?? 9) }
                .map(\.book)
            if bookId == nil { bookId = books.first?.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func create() async {
        guard let bookId else { return }
        isSaving = true
        defer { isSaving = false }
        let text = description.trimmingCharacters(in: .whitespacesAndNewlines)
        let draft = ClubDraft(
            name: name.trimmingCharacters(in: .whitespaces),
            description: text.isEmpty ? nil : text,
            bookId: bookId,
            chapters: Int(chapters.trimmingCharacters(in: .whitespaces)).flatMap { $0 > 0 ? $0 : nil }
        )
        do {
            let id = try await auth.api.createClub(draft)
            dismiss()
            await onCreated(id)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Клуб: книга, участники, мой прогресс по главам и обсуждение без спойлеров.
struct ClubDetailView: View {
    let clubId: String

    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var club: ClubDetails?
    @State private var posts: [ClubPost] = []
    @State private var myChapter = 0
    @State private var draft = ""
    /// 0 — общее сообщение без спойлеров.
    @State private var draftChapter = 0
    @State private var isSending = false
    @State private var confirmLeave = false
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if let club {
                content(club)
            } else {
                ProgressView()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .errorAlert($errorMessage)
    }

    private func content(_ club: ClubDetails) -> some View {
        List {
            Section {
                NavigationLink(value: BookRoute(id: club.book.id)) {
                    BookRowView(book: club.book)
                }
                if let description = club.description {
                    Text(description)
                }
            }

            Section {
                Stepper(value: $myChapter, in: 0...club.chapterRange.upperBound) {
                    Text(myChapter == 0 ? L("Ещё не начал") : L("Дочитал до главы %@", String(myChapter)))
                }
                .onChange(of: myChapter) { _, chapter in
                    Task { await saveChapter(chapter) }
                }
            } header: {
                Text("Мой прогресс")
            } footer: {
                Text("Сообщения о следующих главах откроются, когда вы до них дочитаете.")
            }

            Section("Участники") {
                ForEach(club.members) { member in
                    NavigationLink(value: UserRoute(id: member.user.id)) {
                        HStack {
                            Text(member.user.name)
                            if member.isOwner {
                                Image(systemName: "crown.fill")
                                    .foregroundStyle(.orange)
                                    .accessibilityLabel(Text("Владелец"))
                            }
                            Spacer()
                            Text(member.chapter == 0 ? L("не начал") : L("гл. %@", String(member.chapter)))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Section("Обсуждение") {
                if posts.isEmpty {
                    Text("Пока тихо. Начните обсуждение!")
                        .foregroundStyle(.secondary)
                }
                ForEach(posts) { post in
                    ClubPostRow(post: post)
                        .contextMenu {
                            if post.user.id == auth.user?.id || club.isOwner {
                                Button("Удалить", systemImage: "trash", role: .destructive) { Task { await delete(post) } }
                            }
                        }
                }
            }
        }
        .navigationTitle(club.name)
        .refreshable { await load() }
        .safeAreaInset(edge: .bottom) { composer(club) }
        .toolbar {
            ShareLink(
                item: L("Присоединяйтесь к книжному клубу «%@» в приложении «Полка». Код приглашения: %@", club.name, club.inviteCode),
                subject: Text(club.name)
            ) {
                Image(systemName: "person.badge.plus")
            }
            .accessibilityLabel(Text("Пригласить"))
            Menu {
                Section(L("Код приглашения: %@", club.inviteCode)) {
                    Button("Скопировать код", systemImage: "doc.on.doc") {
                        #if canImport(UIKit)
                        UIPasteboard.general.string = club.inviteCode
                        #endif
                    }
                }
                Button(club.isOwner ? "Удалить клуб" : "Выйти из клуба", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) {
                    confirmLeave = true
                }
            } label: {
                Image(systemName: "ellipsis.circle")
            }
        }
        .confirmationDialog(
            club.isOwner ? "Удалить клуб со всем обсуждением?" : "Выйти из клуба?",
            isPresented: $confirmLeave,
            titleVisibility: .visible
        ) {
            Button(club.isOwner ? "Удалить" : "Выйти", role: .destructive) { Task { await leave(club) } }
        }
    }

    private func composer(_ club: ClubDetails) -> some View {
        VStack(spacing: 6) {
            Picker("Глава", selection: $draftChapter) {
                Text("Общее, без спойлеров").tag(0)
                ForEach(Array(club.chapterRange), id: \.self) { chapter in
                    Text(L("Про главу %@", String(chapter))).tag(chapter)
                }
            }
            .pickerStyle(.menu)
            .frame(maxWidth: .infinity, alignment: .leading)
            HStack {
                TextField("Сообщение", text: $draft, axis: .vertical)
                    .lineLimit(1...4)
                    .textFieldStyle(.roundedBorder)
                Button {
                    Task { await send() }
                } label: {
                    Image(systemName: "arrow.up.circle.fill").font(.title2)
                }
                .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending)
                .accessibilityLabel(Text("Отправить"))
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.bar)
    }

    private func load() async {
        do {
            async let details = auth.api.club(id: clubId)
            async let messages = auth.api.clubPosts(clubId: clubId)
            let loaded = try await details
            posts = try await messages
            if club == nil { draftChapter = loaded.myChapter }
            club = loaded
            myChapter = loaded.myChapter
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func saveChapter(_ chapter: Int) async {
        guard let club, chapter != club.myChapter else { return }
        do {
            _ = try await auth.api.setClubChapter(chapter, clubId: clubId)
            // Могли открыться спойлеры к новым главам.
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func send() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        isSending = true
        defer { isSending = false }
        do {
            let post = try await auth.api.addClubPost(text, chapter: draftChapter == 0 ? nil : draftChapter, clubId: clubId)
            posts.append(post)
            draft = ""
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func delete(_ post: ClubPost) async {
        do {
            try await auth.api.deleteClubPost(id: post.id)
            posts.removeAll { $0.id == post.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func leave(_ club: ClubDetails) async {
        do {
            if club.isOwner {
                try await auth.api.deleteClub(id: club.id)
            } else {
                try await auth.api.leaveClub(id: club.id)
            }
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct ClubPostRow: View {
    let post: ClubPost

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Text(post.user.name).font(.subheadline.bold())
                if let chapter = post.chapter {
                    Text(L("гл. %@", String(chapter)))
                        .font(.caption)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1)
                        .background(.tint.opacity(0.15), in: Capsule())
                }
                Spacer()
                Text(post.createdAt, style: .relative)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if post.spoiler {
                Label(
                    L("Спойлер к главе %@ — откроется, когда дочитаете", String(post.chapter ?? 0)),
                    systemImage: "eye.slash"
                )
                .font(.callout)
                .foregroundStyle(.secondary)
            } else if let text = post.text {
                Text(text)
            }
        }
        .padding(.vertical, 2)
    }
}
