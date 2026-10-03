import Foundation
import WidgetKit

/// Обновляет данные виджета после загрузки полки.
enum WidgetSync {
    @MainActor
    static func update(shelf: Shelf, api: APIClient) async {
        let stats = try? await api.stats()
        let snapshot = WidgetSnapshot(
            reading: shelf.items
                .filter { $0.entry.status == .reading }
                .prefix(3)
                .map {
                    WidgetSnapshot.ReadingBook(
                        id: $0.book.id,
                        title: $0.book.title,
                        author: $0.book.author,
                        progress: $0.entry.progress(pageCount: $0.book.pageCount)
                    )
                },
            year: stats?.year ?? Calendar.current.component(.year, from: Date()),
            readThisYear: stats?.readCount ?? 0,
            goal: stats?.goal,
            updatedAt: Date()
        )
        guard snapshot != WidgetSnapshot.load().map({ var s = $0; s.updatedAt = snapshot.updatedAt; return s }) else { return }
        snapshot.save()
        WidgetCenter.shared.reloadAllTimelines()
    }

    /// При выходе виджет не должен показывать полку прошлого аккаунта.
    static func clear() {
        WidgetSnapshot.clear()
        WidgetCenter.shared.reloadAllTimelines()
    }
}
