import Foundation

/// Данные для виджета. Приложение сохраняет их в общий контейнер App Group, виджет читает.
struct WidgetSnapshot: Codable, Equatable {
    struct ReadingBook: Codable, Equatable, Identifiable {
        let id: String
        let title: String
        let author: String
        let progress: Double?
    }

    var reading: [ReadingBook]
    var year: Int
    var readThisYear: Int
    var goal: Int?
    var updatedAt: Date

    static let placeholder = WidgetSnapshot(
        reading: [
            ReadingBook(id: "1", title: "Мастер и Маргарита", author: "Михаил Булгаков", progress: 0.42),
            ReadingBook(id: "2", title: "Дюна", author: "Фрэнк Герберт", progress: 0.1),
        ],
        year: Calendar.current.component(.year, from: Date()),
        readThisYear: 12,
        goal: 24,
        updatedAt: Date()
    )

    private static let key = "widgetSnapshot"

    /// Идентификатор App Group берётся из Info.plist (AppGroupID = $(APP_GROUP_ID) из xcconfig).
    private static var defaults: UserDefaults? {
        guard let group = Bundle.main.object(forInfoDictionaryKey: "AppGroupID") as? String, !group.isEmpty else { return nil }
        return UserDefaults(suiteName: group)
    }

    static func load() -> WidgetSnapshot? {
        guard let data = defaults?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }

    static func clear() {
        defaults?.removeObject(forKey: key)
    }

    func save() {
        guard let data = try? JSONEncoder().encode(self) else { return }
        Self.defaults?.set(data, forKey: Self.key)
    }
}
