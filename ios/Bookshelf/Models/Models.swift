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
        case .want: "Хочу прочитать"
        case .reading: "Читаю"
        case .paused: "Отложил"
        case .read: "Прочитал"
        case .dropped: "Бросил"
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
            [.init(target: .reading, title: "Начал читать"),
             .init(target: .want, title: "Хочу прочитать"),
             .init(target: .read, title: "Уже прочитал")]
        case .want:
            [.init(target: .reading, title: "Начал читать"),
             .init(target: .read, title: "Уже прочитал")]
        case .reading:
            [.init(target: .read, title: "Закончил читать"),
             .init(target: .paused, title: "Отложить"),
             .init(target: .dropped, title: "Бросил")]
        case .paused:
            [.init(target: .reading, title: "Продолжить"),
             .init(target: .read, title: "Закончил читать"),
             .init(target: .dropped, title: "Бросил")]
        case .read:
            [.init(target: .reading, title: "Перечитать")]
        case .dropped:
            [.init(target: .reading, title: "Начать заново")]
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

    var subtitle: String {
        [author, year.map(String.init)].compactMap { $0 }.joined(separator: " · ")
    }
}

struct ShelfEntry: Codable, Hashable, Sendable {
    let status: ReadingStatus
    let startedAt: Date?
    let finishedAt: Date?
    let rating: Int?
    let review: String?
    let isPublic: Bool
    let updatedAt: Date
}

struct BookStats: Codable, Hashable, Sendable {
    let avgRating: Double?
    let ratingsCount: Int
    let readersCount: Int
}

struct Review: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let userName: String
    let rating: Int?
    let review: String?
    let updatedAt: Date
}

struct BookDetails: Codable, Sendable {
    let book: Book
    let myEntry: ShelfEntry?
    let stats: BookStats
    let reviews: [Review]
}

struct OpenLibraryHit: Codable, Identifiable, Hashable, Sendable {
    let key: String
    let title: String
    let author: String
    let year: Int?
    let isbn: String?
    let coverUrl: URL?

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
