import SwiftUI

struct BookDetailView: View {
    let bookId: String

    @Environment(AuthStore.self) private var auth
    @State private var details: BookDetails?
    @State private var loadError: String?
    @State private var errorMessage: String?
    @State private var isUpdating = false
    @State private var confirmRemove = false

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

            Section("Моя полка") {
                if let status = details.myEntry?.status {
                    Label(status.title, systemImage: status.systemImage)
                        .foregroundStyle(.tint)
                }
                statusButtons(current: details.myEntry?.status)
            }

            if let entry = details.myEntry {
                Section("Оценка и отзыв") {
                    ReviewEditor(bookId: details.book.id, entry: entry) { await load() }
                        // Кнопки статуса меняют даты — пересоздаём редактор. Даты меняются только вместе со статусом.
                        .id(entry.status)
                }
            }

            Section("Отзывы читателей") {
                if details.reviews.isEmpty {
                    Text("Пока никто не оставил отзыв")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(details.reviews) { review in
                        ReviewRow(review: review)
                    }
                }
            }
        }
        .refreshable { await load() }
        .toolbar {
            if details.myEntry != nil {
                Menu {
                    Button("Убрать с полки", systemImage: "trash", role: .destructive) { confirmRemove = true }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
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
                Text(details.book.author)
                    .foregroundStyle(.secondary)
                if let year = details.book.year {
                    Text(String(year))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                HStack(spacing: 20) {
                    VStack(alignment: .leading) {
                        Text(details.stats.avgRating.map { String(format: "★ %.1f", $0) } ?? "—")
                            .font(.title3.bold())
                            .foregroundStyle(.orange)
                        Text("\(details.stats.ratingsCount) \(Plural.ru(details.stats.ratingsCount, "оценка", "оценки", "оценок"))")
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
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func removeFromShelf() async {
        do {
            try await auth.api.removeFromShelf(bookId: bookId)
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct ReviewRow: View {
    let review: Review

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(review.userName).font(.subheadline.bold())
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

        Toggle("Виден другим читателям", isOn: $isPublic)

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
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
