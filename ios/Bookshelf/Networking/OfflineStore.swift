import Foundation
import Observation

/// Офлайн-режим: последние ответы GET-запросов и очередь изменений, сделанных без сети.
/// Всё лежит в Application Support и стирается при выходе из аккаунта.
@MainActor
final class OfflineStore {
    struct PendingRequest: Codable, Equatable, Identifiable, Sendable {
        let id: UUID
        let method: String
        let path: String
        let body: Data?
        let createdAt: Date
    }

    private let responsesDir: URL
    private let outboxURL: URL
    private(set) var pending: [PendingRequest]

    init(directory: URL) {
        responsesDir = directory.appendingPathComponent("responses", isDirectory: true)
        outboxURL = directory.appendingPathComponent("outbox.json")
        try? FileManager.default.createDirectory(at: responsesDir, withIntermediateDirectories: true)
        pending = (try? Data(contentsOf: outboxURL))
            .flatMap { try? JSONDecoder().decode([PendingRequest].self, from: $0) } ?? []
    }

    static func makeDefault() -> OfflineStore {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return OfflineStore(directory: base.appendingPathComponent("Offline", isDirectory: true))
    }

    // MARK: Ответы

    func response(for key: String) -> Data? {
        try? Data(contentsOf: fileURL(for: key))
    }

    func saveResponse(_ data: Data, for key: String) {
        try? data.write(to: fileURL(for: key), options: .atomic)
    }

    private func fileURL(for key: String) -> URL {
        responsesDir.appendingPathComponent(Self.hash(key) + ".json")
    }

    /// FNV-1a: короткое стабильное имя файла для URL запроса.
    static func hash(_ key: String) -> String {
        var hash: UInt64 = 0xcbf2_9ce4_8422_2325
        for byte in key.utf8 {
            hash ^= UInt64(byte)
            hash = hash &* 0x0000_0100_0000_01b3
        }
        return String(hash, radix: 16)
    }

    // MARK: Очередь

    @discardableResult
    func enqueue(method: String, path: String, body: Data?) -> PendingRequest {
        let item = PendingRequest(id: UUID(), method: method, path: path, body: body, createdAt: Date())
        pending.append(item)
        persistOutbox()
        return item
    }

    func remove(id: UUID) {
        pending.removeAll { $0.id == id }
        persistOutbox()
    }

    /// Выход из аккаунта: чужие данные и неотправленные изменения не должны достаться следующему пользователю.
    func clear() {
        pending = []
        try? FileManager.default.removeItem(at: outboxURL)
        try? FileManager.default.removeItem(at: responsesDir)
        try? FileManager.default.createDirectory(at: responsesDir, withIntermediateDirectories: true)
    }

    private func persistOutbox() {
        if pending.isEmpty {
            try? FileManager.default.removeItem(at: outboxURL)
        } else if let data = try? JSONEncoder().encode(pending) {
            try? data.write(to: outboxURL, options: .atomic)
        }
    }
}

/// Состояние связи для интерфейса: баннер «нет сети» и счётчик неотправленных изменений.
@Observable
@MainActor
final class SyncStatus {
    var isOffline = false
    var pendingCount = 0
    /// Сервер отклонил изменение из очереди (например, книгу удалили) — показываем один раз.
    var lastRejected: String?
}
