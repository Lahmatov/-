import Foundation

// Модели повторяют JSON сервера (см. app/api/v1 и lib/api.ts в веб-проекте).

enum ReadingStatus: String, Codable, CaseIterable, Identifiable, Sendable {
    case want = "WANT"
    case reading = "READING"
    case paused = "PAUSED"
    case read = "READ"
    case dropped = "DROPPED"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .want: L("Хочу прочитать")
        case .reading: L("Читаю")
        case .paused: L("Отложил")
        case .read: L("Прочитал")
        case .dropped: L("Бросил")
        }
    }

    var systemImage: String {
        switch self {
        case .want: "bookmark"
        case .reading: "book"
        case .paused: "pause.circle"
        case .read: "checkmark.circle"
        case .dropped: "xmark.circle"
        }
    }

    struct Action: Hashable, Sendable {
        let target: ReadingStatus
        let title: String
    }

    /// Какие кнопки показывать на карточке книги при текущем статусе (nil — книги нет на полке).
    static func actions(for current: ReadingStatus?) -> [Action] {
        switch current {
        case nil:
            [.init(target: .reading, title: L("Начал читать")),
             .init(target: .want, title: L("Хочу прочитать")),
             .init(target: .read, title: L("Уже прочитал"))]
        case .want:
            [.init(target: .reading, title: L("Начал читать")),
             .init(target: .read, title: L("Уже прочитал"))]
        case .reading:
            [.init(target: .read, title: L("Закончил читать")),
             .init(target: .paused, title: L("Отложить")),
             .init(target: .dropped, title: L("Бросил"))]
        case .paused:
            [.init(target: .reading, title: L("Продолжить")),
             .init(target: .read, title: L("Закончил читать")),
             .init(target: .dropped, title: L("Бросил"))]
        case .read:
            [.init(target: .reading, title: L("Перечитать"))]
        case .dropped:
            [.init(target: .reading, title: L("Начать заново"))]
        }
    }
}

struct User: Codable, Hashable, Sendable {
    let id: String
    let name: String?
    let email: String?
}

struct Book: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let author: String
    let year: Int?
    let isbn: String?
    let coverUrl: URL?
    let pageCount: Int?

    var subtitle: String {
        [author, year.map(String.init)].compactMap { $0 }.joined(separator: " · ")
    }

    /// «Илья Ильф, Евгений Петров» → два автора (как lib/discover.ts на сервере).
    var authors: [String] {
        author.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    }
}

struct ShelfEntry: Codable, Hashable, Sendable {
    let status: ReadingStatus
    let startedAt: Date?
    let finishedAt: Date?
    let rating: Int?
    let review: String?
    let isPublic: Bool
    let currentPage: Int?
    let totalPages: Int?
    let updatedAt: Date

    /// Доля прочитанного 0...1, если известно число страниц.
    func progress(pageCount: Int?) -> Double? {
        guard let current = currentPage, let total = totalPages ?? pageCount, total > 0 else { return nil }
        return min(1, Double(current) / Double(total))
    }
}

struct BookStats: Codable, Hashable, Sendable {
    let avgRating: Double?
    let ratingsCount: Int
    let readersCount: Int
}

struct Review: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let userId: String
    let userName: String
    let rating: Int?
    let review: String?
    let updatedAt: Date
    let likes: Int?
    let likedByMe: Bool?
    let comments: Int?
}

struct BookDetails: Codable, Sendable {
    let book: Book
    let myEntry: ShelfEntry?
    let stats: BookStats
    let reviews: [Review]
    let genres: [GenreRef]?
}

struct OpenLibraryHit: Codable, Identifiable, Hashable, Sendable {
    let key: String
    let title: String
    let author: String
    let year: Int?
    let isbn: String?
    let coverUrl: URL?
    let pageCount: Int?
    let subjects: [String]?

    var id: String { key }
    var subtitle: String {
        [author, year.map(String.init)].compactMap { $0 }.joined(separator: " · ")
    }
}

struct SearchResults: Codable, Sendable {
    let local: [Book]
    let openLibrary: [OpenLibraryHit]
}

struct ShelfItem: Codable, Identifiable, Hashable, Sendable {
    let book: Book
    let entry: ShelfEntry
    let genres: [String]?
    var id: String { book.id }
}

struct Shelf: Codable, Sendable {
    /// Ключи — rawValue статуса.
    let counts: [String: Int]
    let items: [ShelfItem]

    func count(_ status: ReadingStatus) -> Int { counts[status.rawValue] ?? 0 }
}

struct ImportResult: Codable, Sendable {
    let found: Int
    let added: Int
}

/// Что отправляем при сохранении оценки/отзыва. Даты — календарные дни в формате yyyy-MM-dd.
struct ReviewUpdate: Encodable, Sendable {
    var rating: Int?
    var review: String?
    var isPublic: Bool
    var startedAt: String?
    var finishedAt: String?
}

enum ImportKind: String, Sendable {
    case kindle
    case csv
}

struct YearStats: Codable, Sendable {
    let year: Int
    let goal: Int?
    let readCount: Int
    /// Январь — индекс 0.
    let byMonth: [Int]
    let avgRating: Double?
    let readingNow: Int
    let years: [Int]
}

// MARK: - Люди и лента

struct PublicUser: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let name: String
}

struct FeedItem: Codable, Identifiable, Hashable, Sendable {
    enum Kind: String, Codable, Sendable {
        case status = "STATUS"
        case review = "REVIEW"
    }

    let id: String
    let type: Kind
    let status: ReadingStatus?
    let rating: Int?
    let review: String?
    let createdAt: Date
    let user: PublicUser
    let book: Book
    let entryId: String?
    let likes: Int?
    let likedByMe: Bool?
    let comments: Int?

    /// Подпись без глаголов прошедшего времени, чтобы не угадывать род.
    var label: String {
        switch type {
        case .review:
            return review == nil ? L("оценка") : L("отзыв")
        case .status:
            switch status {
            case .want: return L("хочет прочитать")
            case .reading: return L("читает")
            case .paused: return L("отложено")
            case .read: return L("прочитано")
            case .dropped: return L("брошено")
            case nil: return ""
            }
        }
    }
}

struct Feed: Codable, Sendable {
    let followingCount: Int
    let nextCursor: String?
    let items: [FeedItem]
}

struct UserProfile: Codable, Sendable {
    struct Counts: Codable, Sendable {
        let followers: Int
        let following: Int
        let read: Int
    }

    struct ReadBook: Codable, Identifiable, Hashable, Sendable {
        let book: Book
        let rating: Int?
        let finishedAt: Date?
        var id: String { book.id }
    }

    let user: PublicUser
    let isMe: Bool
    var isFollowing: Bool
    let counts: Counts
    let readingNow: [Book]
    let recentlyRead: [ReadBook]
    let lists: [ListSummary]
}

// MARK: - Списки

struct ListSummary: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let description: String?
    let isPublic: Bool
    let count: Int
}

/// Мой список с первыми обложками; containsBook есть, если список запрашивали для конкретной книги.
struct MyList: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let description: String?
    let isPublic: Bool
    let count: Int
    let covers: [URL]
    let containsBook: Bool?
}

struct ListDetails: Codable, Sendable {
    let list: ListSummary
    let owner: PublicUser
    let isOwner: Bool
    let books: [Book]
}

struct ListInput: Encodable, Sendable {
    var title: String
    var description: String?
    var isPublic: Bool
}

// MARK: - Обзор: авторы, жанры, топы, рекомендации

struct GenreRef: Codable, Identifiable, Hashable, Sendable {
    let slug: String
    let name: String
    var id: String { slug }
}

struct Genre: Codable, Identifiable, Hashable, Sendable {
    let slug: String
    let name: String
    let count: Int
    var id: String { slug }
}

struct GenreBooks: Codable, Sendable {
    let slug: String
    let name: String
    let books: [Book]
}

struct RatedBook: Codable, Identifiable, Hashable, Sendable {
    let book: Book
    let avgRating: Double?
    let ratingsCount: Int
    var id: String { book.id }
}

struct AuthorDetails: Codable, Sendable {
    let name: String
    let avgRating: Double?
    let ratingsCount: Int
    let readersCount: Int
    let books: [RatedBook]
}

struct TrendingBook: Codable, Identifiable, Hashable, Sendable {
    let book: Book
    let count: Int
    var id: String { book.id }
}

struct TopBooks: Codable, Sendable {
    let top: [RatedBook]
    let trending: [TrendingBook]
}

struct Recommendation: Codable, Identifiable, Hashable, Sendable {
    let book: Book
    let reason: String
    var id: String { book.id }
}

// MARK: - Лайки, комментарии, уведомления

struct LikeState: Codable, Hashable, Sendable {
    let likes: Int
    let likedByMe: Bool
}

struct Comment: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let text: String
    let createdAt: Date
    let user: PublicUser
}

struct CommentThread: Codable, Sendable {
    let reviewAuthorId: String
    let comments: [Comment]
}

struct AppNotification: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let type: String
    let read: Bool
    let createdAt: Date
    let actor: PublicUser
    let book: Book?
    let text: String
}

struct NotificationList: Codable, Sendable {
    let unread: Int
    let items: [AppNotification]
}

// MARK: - Итоги года

struct Wrapped: Codable, Sendable {
    struct Count: Codable, Sendable { let value: String; let count: Int }
    struct TopGenre: Codable, Sendable { let slug: String; let name: String; let count: Int }
    struct RatedPick: Codable, Sendable { let book: Book; let rating: Int }
    struct LongPick: Codable, Sendable { let book: Book; let pages: Int }

    let year: Int
    let name: String
    let booksRead: Int
    let pagesRead: Int
    let avgRating: Double?
    let topAuthor: Count?
    let topGenre: TopGenre?
    let bestBook: RatedPick?
    let longestBook: LongPick?
    let busiestMonth: Int?
    let byMonth: [Int]
}
