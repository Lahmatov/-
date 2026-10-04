import XCTest
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
@testable import Bookshelf

/// Подменяет сеть: ответ задаёт handler, все запросы записываются.
final class StubProtocol: URLProtocol {
    nonisolated(unsafe) static var handler: ((URLRequest) throws -> (Int, Data))?
    nonisolated(unsafe) static var requests: [String] = []

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        Self.requests.append("\(request.httpMethod ?? "") \(request.url?.path ?? "")")
        do {
            let (status, data) = try Self.handler!(request)
            let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

@MainActor
final class OfflineTests: XCTestCase {
    private var directory: URL!

    override func setUp() async throws {
        directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        StubProtocol.requests = []
    }

    override func tearDown() async throws {
        try? FileManager.default.removeItem(at: directory)
    }

    private func makeClient() -> APIClient {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        let client = APIClient(
            baseURL: URL(string: "https://books.example")!,
            session: URLSession(configuration: config),
            offline: OfflineStore(directory: directory)
        )
        client.token = "token"
        return client
    }

    private static let offline: (URLRequest) throws -> (Int, Data) = { _ in throw URLError(.notConnectedToInternet) }

    func testServesLastResponseWhenOffline() async throws {
        let client = makeClient()
        StubProtocol.handler = { _ in (200, Data(#"{"user":{"id":"u1","name":"Аня","email":"a@b.c","emailVerified":true}}"#.utf8)) }
        _ = try await client.me()
        XCTAssertFalse(client.sync.isOffline)

        StubProtocol.handler = Self.offline
        let cached = try await client.me()
        XCTAssertEqual(cached.name, "Аня")
        XCTAssertTrue(client.sync.isOffline)

        do {
            _ = try await client.stats(year: 2026)
            XCTFail("без копии ответа должна быть ошибка")
        } catch APIError.offline {}
    }

    func testQueuesChangesAndReplaysInOrder() async throws {
        let client = makeClient()
        StubProtocol.handler = Self.offline
        do {
            _ = try await client.setStatus(.reading, bookId: "b1")
            XCTFail("ожидали очередь")
        } catch APIError.queued {}
        do {
            try await client.deleteQuote(id: "q1")
            XCTFail("ожидали очередь")
        } catch APIError.queued {}
        XCTAssertEqual(client.offline?.pending.map(\.method), ["PUT", "DELETE"])
        XCTAssertEqual(client.sync.pendingCount, 2)

        // Очередь переживает перезапуск приложения.
        XCTAssertEqual(OfflineStore(directory: directory).pending.count, 2)

        StubProtocol.requests = []
        StubProtocol.handler = { _ in (200, Data("{}".utf8)) }
        await client.flushOutbox()
        XCTAssertEqual(StubProtocol.requests, ["PUT /api/v1/shelf/b1", "DELETE /api/v1/quotes/q1"])
        XCTAssertEqual(client.offline?.pending.count, 0)
        XCTAssertEqual(client.sync.pendingCount, 0)
        XCTAssertFalse(client.sync.isOffline)
    }

    func testNewChangeWaitsBehindQueue() async throws {
        let client = makeClient()
        StubProtocol.handler = Self.offline
        do { try await client.deleteQuote(id: "q1") } catch APIError.queued {}

        // Сеть вернулась: новое изменение отправляется только после старого.
        StubProtocol.requests = []
        StubProtocol.handler = { request in
            request.httpMethod == "DELETE" ? (200, Data("{}".utf8)) : (200, Data(#"{"quote":{"id":"q2","text":"t","page":null,"note":null,"isPublic":false,"createdAt":"2026-10-04T10:00:00Z","mine":true,"user":{"id":"u","name":"Я"}}}"#.utf8))
        }
        let quote = try await client.addQuote(QuoteDraft(text: "t", page: nil, note: nil, isPublic: false), bookId: "b1")
        XCTAssertEqual(quote.id, "q2")
        XCTAssertEqual(StubProtocol.requests, ["DELETE /api/v1/quotes/q1", "POST /api/v1/books/b1/quotes"])
    }

    func testRejectedChangeIsDropped() async throws {
        let client = makeClient()
        StubProtocol.handler = Self.offline
        do { try await client.removeFromShelf(bookId: "gone") } catch APIError.queued {}

        StubProtocol.handler = { _ in (404, Data(#"{"error":"Книга не найдена"}"#.utf8)) }
        await client.flushOutbox()
        XCTAssertEqual(client.offline?.pending.count, 0)
        XCTAssertEqual(client.sync.lastRejected, "Книга не найдена")
    }

    func testClearRemovesEverything() async throws {
        let client = makeClient()
        StubProtocol.handler = { _ in (200, Data(#"{"user":{"id":"u1","name":"Аня","email":null,"emailVerified":null}}"#.utf8)) }
        _ = try await client.me()
        StubProtocol.handler = Self.offline
        do { try await client.removeFromShelf(bookId: "b1") } catch APIError.queued {}

        client.offline?.clear()
        XCTAssertEqual(client.offline?.pending.count, 0)
        do {
            _ = try await client.me()
            XCTFail("после выхода копий ответов быть не должно")
        } catch APIError.offline {}
    }
}
