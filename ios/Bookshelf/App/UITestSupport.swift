#if DEBUG
import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Режим UI-тестов (аргумент запуска `-ui-testing`): приложение говорит с подставным сервером внутри себя,
/// поэтому тесты не зависят от сети и данных на настоящем сервере.
///   `-ui-testing-signed-out` — запуск без входа;
///   `-ui-testing-offline` — сети нет совсем.
enum UITestSupport {
    private static var arguments: [String] { ProcessInfo.processInfo.arguments }
    static var isActive: Bool { arguments.contains("-ui-testing") }

    @MainActor
    static func makeAuthStore() -> AuthStore {
        UITestStub.offline = arguments.contains("-ui-testing-offline")
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [UITestStub.self]
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("ui-test-\(UUID().uuidString)")
        let api = APIClient(
            baseURL: URL(string: "https://ui-test.local")!,
            session: URLSession(configuration: config),
            offline: OfflineStore(directory: directory)
        )
        // Профиль с прошлых запусков не должен влиять на тест. Без сети приложение открывается
        // с сохранённым профилем — подкладываем его, как будто вход уже был.
        if UITestStub.offline {
            UserDefaults.standard.set(Data(#"{"id":"u1","name":"Аня","email":"anya@example.com","emailVerified":true}"#.utf8), forKey: "currentUser")
        } else {
            UserDefaults.standard.removeObject(forKey: "currentUser")
        }
        let signedIn = !arguments.contains("-ui-testing-signed-out")
        return AuthStore(api: api, token: signedIn ? "ui-test-token" : nil)
    }
}

/// Подставной сервер: ответы на запросы, которые делают основные экраны.
final class UITestStub: URLProtocol {
    nonisolated(unsafe) static var offline = false
    nonisolated(unsafe) private static var quotes: [String] = [
        quote(id: "q1", text: "Рукописи не горят", page: 245),
    ]

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func stopLoading() {}

    override func startLoading() {
        if Self.offline {
            client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet))
            return
        }
        let path = request.url?.path.replacingOccurrences(of: "/api/v1/", with: "") ?? ""
        let (status, body) = Self.respond(method: request.httpMethod ?? "GET", path: path, body: bodyData())
        let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil,
                                       headerFields: ["Content-Type": "application/json"])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(body.utf8))
        client?.urlProtocolDidFinishLoading(self)
    }

    private func bodyData() -> Data? {
        if let body = request.httpBody { return body }
        guard let stream = request.httpBodyStream else { return nil }
        stream.open()
        defer { stream.close() }
        var data = Data()
        var buffer = [UInt8](repeating: 0, count: 4096)
        while stream.hasBytesAvailable {
            let read = stream.read(&buffer, maxLength: buffer.count)
            if read <= 0 { break }
            data.append(buffer, count: read)
        }
        return data
    }

    private static let date = "2026-10-01T10:00:00.000Z"
    private static let user = #"{"id":"u1","name":"Аня","email":"anya@example.com","emailVerified":true}"#
    private static let book = #"{"id":"b1","title":"Мастер и Маргарита","author":"Михаил Булгаков","year":1967,"isbn":null,"coverUrl":null,"pageCount":480}"#
    private static let entry = #"{"status":"READING","startedAt":"2026-09-20T00:00:00.000Z","finishedAt":null,"rating":null,"review":null,"isPublic":true,"currentPage":120,"totalPages":null,"updatedAt":"\#(date)"}"#

    private static func quote(id: String, text: String, page: Int?) -> String {
        let pageJSON = page.map(String.init) ?? "null"
        let escaped = text.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\"")
        return #"{"id":"\#(id)","text":"\#(escaped)","page":\#(pageJSON),"note":null,"isPublic":false,"createdAt":"\#(date)","mine":true,"user":{"id":"u1","name":"Аня"}}"#
    }

    private static func respond(method: String, path: String, body: Data?) -> (Int, String) {
        switch (method, path) {
        case ("GET", "me"):
            return (200, #"{"user":\#(user)}"#)
        case ("GET", "shelf"):
            return (200, #"{"counts":{"READING":1},"items":[{"book":\#(book),"entry":\#(entry),"genres":["classics"]}]}"#)
        case ("GET", "genres"):
            return (200, #"{"genres":[{"slug":"classics","name":"Классика","count":1}]}"#)
        case ("GET", "books/b1"):
            return (200, #"{"book":\#(book),"myEntry":\#(entry),"stats":{"avgRating":9,"ratingsCount":1,"readersCount":2},"reviews":[],"genres":[{"slug":"classics","name":"Классика"}]}"#)
        case ("GET", "books/b1/quotes"):
            return (200, #"{"mine":[\#(quotes.joined(separator: ","))],"others":[]}"#)
        case ("POST", "books/b1/quotes"):
            let text = body.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }?["text"] as? String ?? ""
            let new = quote(id: "q\(quotes.count + 1)", text: text, page: nil)
            quotes.append(new)
            return (201, #"{"quote":\#(new)}"#)
        case ("GET", "stats"):
            return (200, #"{"year":2026,"goal":12,"readCount":3,"byMonth":[0,1,0,0,0,0,0,0,1,1,0,0],"avgRating":8.5,"readingNow":1,"years":[2026]}"#)
        case ("GET", "challenges"):
            return (200, #"{"mine":[{"id":"c1","title":"Осенний марафон","description":null,"goal":5,"startsAt":"2026-09-01T00:00:00.000Z","endsAt":"2026-11-30T23:59:59.999Z","genre":null,"isPublic":true,"isOwner":true,"participantCount":3,"phase":"active","myProgress":2}],"open":[]}"#)
        case ("GET", "clubs"):
            return (200, #"{"clubs":[]}"#)
        case ("GET", "badges"):
            return (200, #"{"badges":[]}"#)
        case ("GET", "feed"):
            return (200, #"{"followingCount":0,"nextCursor":null,"items":[]}"#)
        case ("GET", "notifications"):
            return (200, #"{"unread":0,"items":[]}"#)
        case ("GET", "top"):
            return (200, #"{"top":[],"trending":[]}"#)
        case ("GET", "recommendations"):
            return (200, #"{"items":[]}"#)
        case ("POST", "auth/login"):
            return (401, #"{"error":"Неверный email или пароль"}"#)
        default:
            return (404, #"{"error":"Нет в подставном сервере: \#(method) \#(path)"}"#)
        }
    }
}
#endif
