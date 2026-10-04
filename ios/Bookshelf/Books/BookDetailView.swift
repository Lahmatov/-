import SwiftUI

struct BookDetailView: View {
    let bookId: String

    @Environment(AuthStore.self) private var auth
    @State private var details: BookDetails?
    @State private var loadError: String?
    @State private var errorMessage: String?
    @State private var isUpdating = false
    @State private var confirmRemove = false
    @State private var showLists = false
    @State private var openUser: UserRoute?

    var body: some View {
        Group {
            if let details {
                content(details)
            } else if let loadError {
                ContentUnavailableView {
                    Label("Не удалось загрузить", systemImage: "exclamationmark.triangle")
                } description: {
                    Text(loadError)
                } actions: {
                    Button("Повторить") { Task { await load() } }
                }
            } else {
                ProgressView()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .errorAlert($errorMessage)
    }

    private func content(_ details: BookDetails) -> some View {
        List {
            Section { header(details) }

            Section("Жанры") {
                genreChips(details)
            }

            Section("Моя полка") {
                if let status = details.myEntry?.status {
                    Label(status.title, systemImage: status.systemImage)
                        .foregroundStyle(.tint)
                }
                statusButtons(current: details.myEntry?.status)
                if let entry = details.myEntry, entry.status == .reading || entry.status == .paused {
                    ProgressEditor(bookId: details.book.id, entry: entry, pageCount: details.book.pageCount) { await load() }
                        .id("progress-\(entry.status.rawValue)")
                }
            }

            if let entry = details.myEntry {
                Section("Оценка и отзыв") {
                    ReviewEditor(bookId: details.book.id, entry: entry) { await load() }
                        // Кнопки статуса меняют даты — пересоздаём редактор. Даты меняются только вместе со статусом.
                        .id(entry.status)
                }
            }

            QuotesSection(book: details.book)

            Section("Отзывы читателей") {
                if details.reviews.isEmpty {
                    Text("Пока никто не оставил отзыв")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(details.reviews) { review in
                        ReviewRow(review: review) { openUser = UserRoute(id: review.userId) }
                            .contextMenu { ReportMenu(entryId: review.id) }
                    }
                }
            }
        }
        .refreshable { await load() }
        .toolbar {
            ShareLink(item: ShareURL.make("books/\(details.book.id)"), subject: Text(details.book.title)) {
                Image(systemName: "square.and.arrow.up")
            }
            Menu {
                Button("В списки…", systemImage: "list.bullet.rectangle") { showLists = true }
                if details.myEntry != nil {
                    Button("Убрать с полки", systemImage: "trash", role: .destructive) { confirmRemove = true }
                }
            } label: {
                Image(systemName: "ellipsis.circle")
            }
        }
        // В строке отзыва несколько кнопок, поэтому переход к автору — через состояние, а не NavigationLink.
        .navigationDestination(item: $openUser) { UserProfileView(userId: $0.id) }
        .sheet(isPresented: $showLists) {
            AddToListSheet(bookId: details.book.id)
        }
        .confirmationDialog("Убрать книгу с полки?", isPresented: $confirmRemove, titleVisibility: .visible) {
            Button("Убрать", role: .destructive) { Task { await removeFromShelf() } }
        } message: {
            Text("Оценка и отзыв тоже удалятся.")
        }
    }

    private func header(_ details: BookDetails) -> some View {
        HStack(alignment: .top, spacing: 16) {
            BookCoverView(url: details.book.coverUrl, title: details.book.title, width: 100)
            VStack(alignment: .leading, spacing: 6) {
                Text(details.book.title)
                    .font(.title2.bold())
                // Каждый соавтор — ссылка на свою страницу.
                ForEach(details.book.authors, id: \.self) { name in
                    NavigationLink(value: AuthorRoute(name: name)) {
                        Text(name).foregroundStyle(.tint)
                    }
                    .buttonStyle(.borderless)
                }
                let meta = [details.book.year.map(String.init), details.book.pageCount.map { L("%@ стр.", String($0)) }].compactMap { $0 }
                if !meta.isEmpty {
                    Text(meta.joined(separator: " · "))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                HStack(spacing: 20) {
                    VStack(alignment: .leading) {
                        Text(details.stats.avgRating.map { String(format: "★ %.1f", $0) } ?? "—")
                            .font(.title3.bold())
                            .foregroundStyle(.orange)
                        Text("\(details.stats.ratingsCount) \(Plural.localized(details.stats.ratingsCount, "оценка", "оценки", "оценок"))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    VStack(alignment: .leading) {
                        Text("\(details.stats.readersCount)")
                            .font(.title3.bold())
                        Text("прочитали")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding(.vertical, 4)
    }

    @State private var allGenres: [Genre] = []

    private func genreChips(_ details: BookDetails) -> some View {
        let current = details.genres ?? []
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(current) { genre in
                    NavigationLink(value: GenreRoute(slug: genre.slug, name: genre.name)) {
                        Text(genre.name)
                            .font(.subheadline)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Color.secondary.opacity(0.15), in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
                Menu {
                    ForEach(allGenres.filter { g in !current.contains { $0.slug == g.slug } }) { genre in
                        Button(genre.name) { Task { await addGenre(genre.slug) } }
                    }
                } label: {
                    Label(current.isEmpty ? L("Отметить жанр") : L("Жанр"), systemImage: "plus")
                        .font(.subheadline)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .overlay(Capsule().stroke(Color.secondary.opacity(0.4)))
                }
                .task { if allGenres.isEmpty { allGenres = (try? await auth.api.genres()) ?? [] } }
            }
        }
    }

    private func addGenre(_ slug: String) async {
        do {
            _ = try await auth.api.addGenre(slug, bookId: bookId)
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func statusButtons(current: ReadingStatus?) -> some View {
        let actions = ReadingStatus.actions(for: current)
        return VStack(spacing: 8) {
            ForEach(actions, id: \.self) { action in
                let button = Button {
                    Task { await setStatus(action.target) }
                } label: {
                    Text(action.title).frame(maxWidth: .infinity, minHeight: 30)
                }
                // Отдельный стиль у каждой кнопки, чтобы в строке списка срабатывала только нажатая.
                if action == actions.first {
                    button.buttonStyle(.borderedProminent)
                } else {
                    button.buttonStyle(.bordered)
                }
            }
        }
        .disabled(isUpdating)
        .padding(.vertical, 4)
    }

    private func load() async {
        do {
            details = try await auth.api.book(id: bookId)
            loadError = nil
        } catch {
            if !Task.isCancelled && details == nil { loadError = error.localizedDescription }
        }
    }

    private func setStatus(_ status: ReadingStatus) async {
        isUpdating = true
        defer { isUpdating = false }
        do {
            _ = try await auth.api.setStatus(status, bookId: bookId)
            await load()
        } catch APIError.queued {
            // Без сети: показываем новый статус сразу, на сервер он уйдёт из очереди.
            applyOffline(status: status)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func applyOffline(status: ReadingStatus?) {
        guard let details else { return }
        let old = details.myEntry
        let entry = status.map {
            ShelfEntry(
                status: $0,
                startedAt: old?.startedAt ?? ($0 == .reading ? Date() : nil),
                finishedAt: $0 == .read ? Date() : old?.finishedAt,
                rating: old?.rating,
                review: old?.review,
                isPublic: old?.isPublic ?? true,
                currentPage: old?.currentPage,
                totalPages: old?.totalPages,
                updatedAt: Date()
            )
        }
        let updated = BookDetails(book: details.book, myEntry: entry, stats: details.stats, reviews: details.reviews, genres: details.genres)
        self.details = updated
        auth.api.updateCachedResponse(updated, path: "books/\(bookId)")
    }

    private func removeFromShelf() async {
        do {
            try await auth.api.removeFromShelf(bookId: bookId)
            await load()
        } catch APIError.queued {
            applyOffline(status: nil)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct ReviewRow: View {
    let review: Review
    let openAuthor: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Button(action: openAuthor) {
                    Text(review.userName).font(.subheadline.bold())
                }
                .buttonStyle(.borderless)
                .tint(.primary)
                if let rating = review.rating {
                    Label("\(rating)/10", systemImage: "star.fill")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
                Spacer()
                Text(review.updatedAt, format: .dateTime.day().month().year())
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let text = review.review {
                Text(text)
            }
            HStack(spacing: 20) {
                LikeButton(entryId: review.id, likes: review.likes ?? 0, likedByMe: review.likedByMe ?? false)
                CommentsButton(entryId: review.id, count: review.comments ?? 0)
            }
        }
        .padding(.vertical, 4)
    }
}

/// Оценка, даты, отзыв и публичность. Строки встраиваются прямо в секцию списка.
private struct ReviewEditor: View {
    let bookId: String
    let onSaved: () async -> Void

    @Environment(AuthStore.self) private var auth
    @State private var rating: Int?
    @State private var review: String
    @State private var isPublic: Bool
    @State private var hasStart: Bool
    @State private var startedAt: Date
    @State private var hasFinish: Bool
    @State private var finishedAt: Date
    @State private var isSaving = false
    @State private var savedCount = 0
    @State private var errorMessage: String?

    init(bookId: String, entry: ShelfEntry, onSaved: @escaping () async -> Void) {
        self.bookId = bookId
        self.onSaved = onSaved
        _rating = State(initialValue: entry.rating)
        _review = State(initialValue: entry.review ?? "")
        _isPublic = State(initialValue: entry.isPublic)
        _hasStart = State(initialValue: entry.startedAt != nil)
        _startedAt = State(initialValue: entry.startedAt ?? Date())
        _hasFinish = State(initialValue: entry.finishedAt != nil)
        _finishedAt = State(initialValue: entry.finishedAt ?? Date())
    }

    var body: some View {
        RatingPicker(rating: $rating)
            .padding(.vertical, 4)

        Toggle("Дата начала", isOn: $hasStart.animation())
        if hasStart {
            DatePicker("Начал", selection: $startedAt, in: ...Date(), displayedComponents: .date)
                .environment(\.timeZone, DateCoding.utcCalendar.timeZone)
        }
        Toggle("Дата окончания", isOn: $hasFinish.animation())
        if hasFinish {
            DatePicker("Закончил", selection: $finishedAt, in: ...Date(), displayedComponents: .date)
                .environment(\.timeZone, DateCoding.utcCalendar.timeZone)
        }

        TextField("Что думаете о книге?", text: $review, axis: .vertical)
            .lineLimit(3...12)

        Toggle("Видно другим — в профиле, ленте и отзывах", isOn: $isPublic)

        Button {
            Task { await save() }
        } label: {
            HStack {
                Text("Сохранить")
                if isSaving { ProgressView() }
            }
            .frame(maxWidth: .infinity)
        }
        .disabled(isSaving)
        .sensoryFeedback(.success, trigger: savedCount)
        .errorAlert($errorMessage)
    }

    private func save() async {
        let text = review.trimmingCharacters(in: .whitespacesAndNewlines)
        let update = ReviewUpdate(
            rating: rating,
            review: text.isEmpty ? nil : text,
            isPublic: isPublic,
            startedAt: hasStart ? DateCoding.dayString(startedAt) : nil,
            finishedAt: hasFinish ? DateCoding.dayString(finishedAt) : nil
        )
        isSaving = true
        defer { isSaving = false }
        do {
            _ = try await auth.api.saveReview(update, bookId: bookId)
            savedCount += 1
            await onSaved()
        } catch APIError.queued {
            savedCount += 1 // сохранено на телефоне, отправится при появлении сети
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// «Страница 120 из 350» и полоска прогресса.
private struct ProgressEditor: View {
    let bookId: String
    let pageCount: Int?
    let onSaved: () async -> Void

    @Environment(AuthStore.self) private var auth
    @State private var current: String
    @State private var total: String
    @State private var savedProgress: Double?
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(bookId: String, entry: ShelfEntry, pageCount: Int?, onSaved: @escaping () async -> Void) {
        self.bookId = bookId
        self.pageCount = pageCount
        self.onSaved = onSaved
        _current = State(initialValue: entry.currentPage.map(String.init) ?? "")
        _total = State(initialValue: (entry.totalPages ?? pageCount).map(String.init) ?? "")
        _savedProgress = State(initialValue: entry.progress(pageCount: pageCount))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Страница")
                TextField("0", text: $current)
                    .keyboardType(.numberPad)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 70)
                Text("из")
                TextField("?", text: $total)
                    .keyboardType(.numberPad)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 70)
                Spacer()
                Button {
                    Task { await save() }
                } label: {
                    if isSaving { ProgressView() } else { Text("Сохранить") }
                }
                .buttonStyle(.bordered)
                .disabled(isSaving)
            }
            if let savedProgress {
                ProgressView(value: savedProgress) {
                    Text(L("Прочитано %@%%", String(Int(savedProgress * 100)))).font(.caption).foregroundStyle(.secondary)
                }
                .tint(.accentColor)
            }
        }
        .padding(.vertical, 4)
        .errorAlert($errorMessage)
    }

    private func save() async {
        let page = Int(current.trimmingCharacters(in: .whitespaces))
        let pages = Int(total.trimmingCharacters(in: .whitespaces))
        isSaving = true
        defer { isSaving = false }
        do {
            let entry = try await auth.api.setProgress(currentPage: page, totalPages: pages, bookId: bookId)
            savedProgress = entry.progress(pageCount: pageCount)
            await onSaved()
        } catch APIError.queued {
            if let page, let total = pages ?? pageCount, total > 0 { savedProgress = min(1, Double(page) / Double(total)) }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
