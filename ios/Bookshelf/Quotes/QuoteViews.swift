import SwiftUI

/// Раздел «Цитаты» на странице книги: свои (с правкой) и публичные чужие.
struct QuotesSection: View {
    let book: Book
    @Environment(AuthStore.self) private var auth
    @State private var quotes: BookQuotes?
    @State private var editing: QuoteEditorTarget?
    @State private var sharing: Quote?
    @State private var errorMessage: String?

    var body: some View {
        Section {
            if let quotes {
                ForEach(quotes.mine) { quote in
                    QuoteRow(quote: quote)
                        .contentShape(Rectangle())
                        .onTapGesture { editing = .edit(quote) }
                        .swipeActions {
                            Button("Удалить", systemImage: "trash", role: .destructive) { Task { await delete(quote) } }
                        }
                        .contextMenu { shareButton(quote) }
                }
                ForEach(quotes.others) { quote in
                    QuoteRow(quote: quote)
                        .contextMenu { shareButton(quote) }
                }
                if quotes.mine.isEmpty && quotes.others.isEmpty {
                    Text("Сохраняйте понравившиеся места из книги")
                        .foregroundStyle(.secondary)
                }
            }
            Button("Добавить цитату", systemImage: "plus") { editing = .new }
                .accessibilityIdentifier("addQuote")
        } header: {
            Text("Цитаты")
        }
        .task { await load() }
        .sheet(item: $editing) { target in
            QuoteEditor(bookId: book.id, quote: target.quote) { await load() }
        }
        .sheet(item: $sharing) { QuoteShareSheet(quote: $0, book: book) }
        .errorAlert($errorMessage)
    }

    private func shareButton(_ quote: Quote) -> some View {
        Button("Поделиться картинкой", systemImage: "square.and.arrow.up") { sharing = quote }
    }

    private func load() async {
        do {
            quotes = try await auth.api.quotes(bookId: book.id)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func delete(_ quote: Quote) async {
        do {
            try await auth.api.deleteQuote(id: quote.id)
            await load()
        } catch APIError.queued {
            if let current = quotes {
                quotes = BookQuotes(mine: current.mine.filter { $0.id != quote.id }, others: current.others)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

enum QuoteEditorTarget: Identifiable {
    case new
    case edit(Quote)

    var id: String {
        switch self {
        case .new: "new"
        case .edit(let quote): quote.id
        }
    }

    var quote: Quote? {
        if case .edit(let quote) = self { return quote }
        return nil
    }
}

struct QuoteRow: View {
    let quote: Quote
    var showBook = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("«\(quote.text)»")
                .italic()
                .lineLimit(8)
            if let note = quote.note, !note.isEmpty {
                Text(note)
                    .font(.callout)
                    .foregroundStyle(.secondary)
            }
            HStack(spacing: 6) {
                if showBook, let book = quote.book {
                    Text(book.title).lineLimit(1)
                } else if !quote.mine {
                    Text(quote.user.name)
                }
                if let page = quote.page {
                    Text(L("стр. %@", String(page)))
                }
                Spacer()
                if quote.mine && !quote.isPublic {
                    Image(systemName: "lock.fill")
                        .accessibilityLabel(Text("Видна только вам"))
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}

/// Новая цитата или правка своей.
struct QuoteEditor: View {
    let bookId: String
    let quote: Quote?
    let onSaved: () async -> Void

    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var text: String
    @State private var page: String
    @State private var note: String
    @State private var isPublic: Bool
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(bookId: String, quote: Quote?, onSaved: @escaping () async -> Void) {
        self.bookId = bookId
        self.quote = quote
        self.onSaved = onSaved
        _text = State(initialValue: quote?.text ?? "")
        _page = State(initialValue: quote?.page.map(String.init) ?? "")
        _note = State(initialValue: quote?.note ?? "")
        _isPublic = State(initialValue: quote?.isPublic ?? false)
    }

    private var trimmed: String { text.trimmingCharacters(in: .whitespacesAndNewlines) }

    var body: some View {
        NavigationStack {
            Form {
                Section("Цитата") {
                    TextEditor(text: $text)
                        .frame(minHeight: 140)
                        .accessibilityIdentifier("quoteText")
                }
                Section {
                    TextField("Страница", text: $page)
                        .keyboardType(.numberPad)
                    TextField("Заметка для себя", text: $note, axis: .vertical)
                        .lineLimit(2...6)
                }
                Section {
                    Toggle("Видна другим читателям", isOn: $isPublic)
                } footer: {
                    Text("Публичные цитаты видны на странице книги. Заметка всегда остаётся личной.")
                }
            }
            .navigationTitle(quote == nil ? L("Новая цитата") : L("Цитата"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") { Task { await save() } }
                        .disabled(trimmed.isEmpty || isSaving)
                        .accessibilityIdentifier("saveQuote")
                }
            }
            .errorAlert($errorMessage)
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        let noteText = note.trimmingCharacters(in: .whitespacesAndNewlines)
        let draft = QuoteDraft(
            text: trimmed,
            page: Int(page.trimmingCharacters(in: .whitespaces)).flatMap { $0 > 0 ? $0 : nil },
            note: noteText.isEmpty ? nil : noteText,
            isPublic: isPublic
        )
        do {
            if let quote {
                _ = try await auth.api.updateQuote(id: quote.id, draft)
            } else {
                _ = try await auth.api.addQuote(draft, bookId: bookId)
            }
            await onSaved()
            dismiss()
        } catch APIError.queued {
            dismiss() // без сети: цитата уйдёт на сервер из очереди
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Все мои цитаты, с поиском по тексту и названию книги.
struct MyQuotesView: View {
    @Environment(AuthStore.self) private var auth
    @State private var quotes: [Quote] = []
    @State private var nextCursor: String?
    @State private var isLoaded = false
    @State private var query = ""
    @State private var sharing: Quote?
    @State private var errorMessage: String?

    private var filtered: [Quote] {
        let q = query.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return quotes }
        return quotes.filter {
            $0.text.localizedCaseInsensitiveContains(q)
                || ($0.book?.title.localizedCaseInsensitiveContains(q) ?? false)
                || ($0.book?.author.localizedCaseInsensitiveContains(q) ?? false)
        }
    }

    var body: some View {
        List {
            ForEach(filtered) { quote in
                Group {
                    if let book = quote.book {
                        NavigationLink(value: BookRoute(id: book.id)) { QuoteRow(quote: quote, showBook: true) }
                    } else {
                        QuoteRow(quote: quote, showBook: true)
                    }
                }
                .swipeActions {
                    Button("Удалить", systemImage: "trash", role: .destructive) { Task { await delete(quote) } }
                }
                .contextMenu {
                    if quote.book != nil {
                        Button("Поделиться картинкой", systemImage: "square.and.arrow.up") { sharing = quote }
                    }
                }
            }
            if nextCursor != nil && query.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .task { await loadMore() }
            }
        }
        .overlay {
            if isLoaded && quotes.isEmpty {
                ContentUnavailableView(
                    "Цитат пока нет",
                    systemImage: "quote.opening",
                    description: Text("Добавляйте их на странице книги или импортируйте выделения из Kindle в профиле.")
                )
            }
        }
        .searchable(text: $query)
        .navigationTitle("Мои цитаты")
        .refreshable { await reload() }
        .task { if !isLoaded { await reload() } }
        .sheet(item: $sharing) { quote in
            if let book = quote.book { QuoteShareSheet(quote: quote, book: book) }
        }
        .errorAlert($errorMessage)
    }

    private func reload() async {
        do {
            let page = try await auth.api.myQuotes()
            quotes = page.quotes
            nextCursor = page.nextCursor
            isLoaded = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadMore() async {
        guard let cursor = nextCursor else { return }
        do {
            let page = try await auth.api.myQuotes(cursor: cursor)
            quotes += page.quotes
            nextCursor = page.nextCursor
        } catch {
            nextCursor = nil
            errorMessage = error.localizedDescription
        }
    }

    private func delete(_ quote: Quote) async {
        do {
            try await auth.api.deleteQuote(id: quote.id)
            quotes.removeAll { $0.id == quote.id }
        } catch APIError.queued {
            quotes.removeAll { $0.id == quote.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Карточка цитаты картинкой 1080×1350 для сторис и постов.
struct QuoteShareSheet: View {
    let quote: Quote
    let book: Book
    @Environment(\.dismiss) private var dismiss
    @State private var image: Image?

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                QuoteCard(quote: quote, book: book)
                    .frame(width: 288, height: 360)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(radius: 8)
                if let image {
                    ShareLink(item: image, preview: SharePreview(book.title, image: image)) {
                        Label("Поделиться", systemImage: "square.and.arrow.up")
                            .frame(maxWidth: .infinity, minHeight: 38)
                    }
                    .buttonStyle(.borderedProminent)
                    .padding(.horizontal)
                }
            }
            .padding()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Закрыть") { dismiss() } }
            }
            .task { render() }
        }
        .presentationDetents([.large])
    }

    @MainActor
    private func render() {
        let renderer = ImageRenderer(content: QuoteCard(quote: quote, book: book).frame(width: 360, height: 450))
        renderer.scale = 3
        if let uiImage = renderer.uiImage { image = Image(uiImage: uiImage) }
    }
}

struct QuoteCard: View {
    let quote: Quote
    let book: Book

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(red: 0.16, green: 0.12, blue: 0.08), Color(red: 0.35, green: 0.22, blue: 0.1)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
            VStack(alignment: .leading, spacing: 16) {
                Image(systemName: "quote.opening")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(.orange)
                Text(quote.text)
                    .font(.system(size: 22, weight: .medium, design: .serif))
                    .foregroundStyle(.white)
                    .minimumScaleFactor(0.4)
                Spacer(minLength: 0)
                VStack(alignment: .leading, spacing: 2) {
                    Text(book.title)
                        .font(.headline)
                    Text(book.author)
                        .font(.subheadline)
                }
                .foregroundStyle(.white.opacity(0.85))
            }
            .padding(28)
        }
    }
}
