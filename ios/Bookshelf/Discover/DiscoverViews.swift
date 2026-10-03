import SwiftUI

/// Данные обзора. Загружает экран поиска: `.task` на группе секций сработал бы для каждой секции отдельно.
struct DiscoverData {
    var recommendations: [Recommendation] = []
    var top: TopBooks?
    var genres: [Genre] = []
    var loaded = false

    @MainActor
    static func load(_ api: APIClient) async -> DiscoverData {
        // Обзор — дополнение к поиску: если что-то не загрузилось, просто не показываем секцию.
        async let recs = try? api.recommendations()
        async let topBooks = try? api.top()
        async let allGenres = try? api.genres()
        return DiscoverData(
            recommendations: await recs ?? [],
            top: await topBooks,
            genres: (await allGenres ?? []).filter { $0.count > 0 },
            loaded: true
        )
    }
}

/// Обзор во вкладке «Поиск», пока запрос пустой: рекомендации, лучшие, популярное, жанры.
/// Секции встраиваются прямо в List экрана поиска.
struct DiscoverSections: View {
    let data: DiscoverData

    private var recommendations: [Recommendation] { data.recommendations }
    private var top: TopBooks? { data.top }
    private var genres: [Genre] { data.genres }
    private var loaded: Bool { data.loaded }

    var body: some View {
        Group {
            if !recommendations.isEmpty {
                Section {
                    ForEach(recommendations.prefix(8)) { item in
                        NavigationLink(value: BookRoute(id: item.book.id)) {
                            VStack(alignment: .leading, spacing: 4) {
                                BookRowView(book: item.book)
                                Text(item.reason).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                } header: {
                    Text("Что почитать дальше")
                } footer: {
                    Text("По вашим оценкам: книги, которые высоко оценили читатели с похожим вкусом.")
                }
            }

            if let top, !top.top.isEmpty {
                Section("Лучшие по оценкам") {
                    ForEach(top.top.prefix(8)) { item in
                        NavigationLink(value: BookRoute(id: item.book.id)) {
                            RatedBookRow(item: item)
                        }
                    }
                }
            }

            if let trending = top?.trending, !trending.isEmpty {
                Section("Популярное за месяц") {
                    ForEach(trending.prefix(8)) { item in
                        NavigationLink(value: BookRoute(id: item.book.id)) {
                            BookRowView(book: item.book)
                        }
                    }
                }
            }

            if !genres.isEmpty {
                Section("Жанры") {
                    ForEach(genres) { genre in
                        NavigationLink(value: GenreRoute(slug: genre.slug, name: genre.name)) {
                            LabeledContent(genre.name, value: "\(genre.count)")
                        }
                    }
                }
            }

            if !loaded {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
            } else if recommendations.isEmpty && (top?.top.isEmpty ?? true) && genres.isEmpty {
                ContentUnavailableView(
                    "Найдите книгу",
                    systemImage: "magnifyingglass",
                    description: Text("Ищем по названию, автору и ISBN в нашем каталоге и в Open Library")
                )
                .listRowBackground(Color.clear)
            }
        }
    }
}

struct RatedBookRow: View {
    let item: RatedBook

    var body: some View {
        HStack {
            BookRowView(book: item.book)
            Spacer()
            if let avg = item.avgRating {
                VStack(alignment: .trailing) {
                    Label(String(format: "%.1f", avg), systemImage: "star.fill")
                        .font(.subheadline.bold())
                        .foregroundStyle(.orange)
                    Text("\(item.ratingsCount)").font(.caption2).foregroundStyle(.secondary)
                }
            }
        }
    }
}

struct AuthorView: View {
    let name: String

    @Environment(AuthStore.self) private var auth
    @State private var author: AuthorDetails?
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let author {
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(author.books.count) \(Plural.ru(author.books.count, "книга", "книги", "книг")) в каталоге")
                        if let avg = author.avgRating {
                            Label(
                                "\(String(format: "%.1f", avg)) · \(author.ratingsCount) \(Plural.ru(author.ratingsCount, "оценка", "оценки", "оценок"))",
                                systemImage: "star.fill"
                            )
                            .foregroundStyle(.orange)
                        }
                    }
                }
                Section("Книги") {
                    ForEach(author.books) { item in
                        NavigationLink(value: BookRoute(id: item.book.id)) { RatedBookRow(item: item) }
                    }
                }
            } else if errorMessage != nil {
                ContentUnavailableView("Автор не найден", systemImage: "person.fill.questionmark")
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .navigationTitle(author?.name ?? name)
        .task {
            do {
                author = try await auth.api.author(name: name)
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}

struct GenreView: View {
    let slug: String
    let name: String

    @Environment(AuthStore.self) private var auth
    @State private var best: [RatedBook] = []
    @State private var books: [Book]?
    @State private var errorMessage: String?

    var body: some View {
        List {
            if !best.isEmpty {
                Section("Лучшее в жанре") {
                    ForEach(best.prefix(5)) { item in
                        NavigationLink(value: BookRoute(id: item.book.id)) { RatedBookRow(item: item) }
                    }
                }
            }
            Section("Все книги") {
                if let books {
                    if books.isEmpty {
                        Text("Пока ни одной книги. Жанр можно отметить на странице книги.").foregroundStyle(.secondary)
                    }
                    ForEach(books) { book in
                        NavigationLink(value: BookRoute(id: book.id)) { BookRowView(book: book) }
                    }
                } else if errorMessage == nil {
                    ProgressView().frame(maxWidth: .infinity)
                }
            }
        }
        .navigationTitle(name)
        .task {
            do {
                async let top = auth.api.top(genre: slug)
                async let all = auth.api.genre(slug: slug)
                best = try await top.top
                books = try await all.books
            } catch {
                errorMessage = error.localizedDescription
            }
        }
        .errorAlert($errorMessage)
    }
}
