import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

enum APIError: LocalizedError, Equatable {
    case unauthorized
    case server(String)
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .unauthorized: "Сессия истекла — войдите снова."
        case .server(let message): message
        case .invalidResponse: "Сервер вернул непонятный ответ."
        }
    }
}

/// Клиент JSON API веб-приложения (/api/v1). Токен передаётся в заголовке Authorization.
@MainActor
final class APIClient {
    let baseURL: URL
    var token: String?
    /// Вызывается, когда сервер ответил 401 на запрос с токеном (токен отозван или аккаунт удалён).
    var onUnauthorized: (() -> Void)?

    private let session: URLSession
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { try DateCoding.decode($0) }
        return decoder
    }()
    private let encoder = JSONEncoder()

    private struct ErrorBody: Decodable { let error: String }

    init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    // MARK: - Авторизация

    struct AuthResponse: Decodable { let token: String; let user: User }
    private struct MeResponse: Decodable { let user: User }
    private struct OK: Decodable {}

    func register(name: String, email: String, password: String) async throws -> AuthResponse {
        try await send("POST", "auth/register", json: ["name": name, "email": email, "password": password])
    }

    func login(email: String, password: String) async throws -> AuthResponse {
        try await send("POST", "auth/login", json: ["email": email, "password": password])
    }

    func signInWithGoogle(idToken: String) async throws -> AuthResponse {
        try await send("POST", "auth/google", json: ["idToken": idToken])
    }

    func signInWithApple(identityToken: String, name: String?) async throws -> AuthResponse {
        struct Body: Encodable { let identityToken: String; let name: String? }
        return try await send("POST", "auth/apple", json: Body(identityToken: identityToken, name: name))
    }

    func logout() async throws {
        let _: OK = try await send("POST", "auth/logout")
    }

    func me() async throws -> User {
        let response: MeResponse = try await send("GET", "me")
        return response.user
    }

    func deleteAccount() async throws {
        let _: OK = try await send("DELETE", "me")
    }

    // MARK: - Каталог

    private struct BookResponse: Decodable { let book: Book }
    struct AddBookResponse: Decodable { let book: Book; let existing: Bool }

    func search(_ query: String) async throws -> SearchResults {
        try await send("GET", "search", query: [URLQueryItem(name: "q", value: query)])
    }

    func book(id: String) async throws -> BookDetails {
        try await send("GET", "books/\(id)")
    }

    func addBook(title: String, author: String, year: Int?) async throws -> AddBookResponse {
        struct Body: Encodable { let title: String; let author: String; let year: Int? }
        return try await send("POST", "books", json: Body(title: title, author: author, year: year))
    }

    func addFromOpenLibrary(_ hit: OpenLibraryHit) async throws -> Book {
        let response: BookResponse = try await send("POST", "books/openlibrary", json: hit)
        return response.book
    }

    // MARK: - Полка

    private struct EntryResponse: Decodable { let entry: ShelfEntry }

    func shelf(status: ReadingStatus? = nil) async throws -> Shelf {
        try await send("GET", "shelf", query: status.map { [URLQueryItem(name: "status", value: $0.rawValue)] } ?? [])
    }

    func setStatus(_ status: ReadingStatus, bookId: String) async throws -> ShelfEntry {
        let response: EntryResponse = try await send("PUT", "shelf/\(bookId)", json: ["status": status.rawValue])
        return response.entry
    }

    func saveReview(_ update: ReviewUpdate, bookId: String) async throws -> ShelfEntry {
        let response: EntryResponse = try await send("PATCH", "shelf/\(bookId)", json: update)
        return response.entry
    }

    func removeFromShelf(bookId: String) async throws {
        let _: OK = try await send("DELETE", "shelf/\(bookId)")
    }

    func book(isbn: String) async throws -> Book {
        let response: BookResponse = try await send("GET", "books/isbn/\(isbn)")
        return response.book
    }

    // MARK: - Обзор

    private struct GenresResponse: Decodable { let genres: [Genre] }
    private struct BookGenresResponse: Decodable { let genres: [GenreRef] }
    private struct RecommendationsResponse: Decodable { let items: [Recommendation] }

    func author(name: String) async throws -> AuthorDetails {
        try await send("GET", "authors/\(name)")
    }

    func genres() async throws -> [Genre] {
        let response: GenresResponse = try await send("GET", "genres")
        return response.genres
    }

    func genre(slug: String) async throws -> GenreBooks {
        try await send("GET", "genres/\(slug)")
    }

    func addGenre(_ slug: String, bookId: String) async throws -> [GenreRef] {
        let response: BookGenresResponse = try await send("POST", "books/\(bookId)/genres", json: ["slug": slug])
        return response.genres
    }

    func top(genre: String? = nil) async throws -> TopBooks {
        try await send("GET", "top", query: genre.map { [URLQueryItem(name: "genre", value: $0)] } ?? [])
    }

    func recommendations() async throws -> [Recommendation] {
        let response: RecommendationsResponse = try await send("GET", "recommendations")
        return response.items
    }

    /// currentPage = nil сбрасывает прогресс; totalPages — число страниц в издании читателя.
    func setProgress(currentPage: Int?, totalPages: Int?, bookId: String) async throws -> ShelfEntry {
        struct Body: Encodable {
            let currentPage: Int?
            let totalPages: Int?
            func encode(to encoder: Encoder) throws {
                var container = encoder.container(keyedBy: CodingKeys.self)
                try container.encode(currentPage, forKey: .currentPage) // null явно — сброс прогресса
                try container.encodeIfPresent(totalPages, forKey: .totalPages)
            }
            enum CodingKeys: String, CodingKey { case currentPage, totalPages }
        }
        let response: EntryResponse = try await send(
            "PUT", "shelf/\(bookId)/progress", json: Body(currentPage: currentPage, totalPages: totalPages)
        )
        return response.entry
    }

    // MARK: - Лайки, комментарии, уведомления

    private struct CommentResponse: Decodable { let comment: Comment }

    func setLiked(_ liked: Bool, entryId: String) async throws -> LikeState {
        try await send(liked ? "POST" : "DELETE", "reviews/\(entryId)/like")
    }

    func comments(entryId: String) async throws -> CommentThread {
        try await send("GET", "reviews/\(entryId)/comments")
    }

    func addComment(_ text: String, entryId: String) async throws -> Comment {
        let response: CommentResponse = try await send("POST", "reviews/\(entryId)/comments", json: ["text": text])
        return response.comment
    }

    func deleteComment(id: String) async throws {
        let _: OK = try await send("DELETE", "comments/\(id)")
    }

    func notifications() async throws -> NotificationList {
        try await send("GET", "notifications")
    }

    func markNotificationsRead() async throws {
        let _: OK = try await send("POST", "notifications/read")
    }

    func registerDevice(token: String) async throws {
        let _: OK = try await send("POST", "devices", json: ["token": token])
    }

    func unregisterDevice(token: String) async throws {
        let _: OK = try await send("DELETE", "devices/\(token)")
    }

    // MARK: - Люди и лента

    private struct UsersResponse: Decodable { let users: [PublicUser] }
    private struct FollowResponse: Decodable { let isFollowing: Bool }
    private struct UserResponse: Decodable { let user: User }

    func feed(cursor: String? = nil) async throws -> Feed {
        try await send("GET", "feed", query: cursor.map { [URLQueryItem(name: "cursor", value: $0)] } ?? [])
    }

    func searchUsers(_ query: String) async throws -> [PublicUser] {
        let response: UsersResponse = try await send("GET", "users", query: [URLQueryItem(name: "q", value: query)])
        return response.users
    }

    func profile(userId: String) async throws -> UserProfile {
        try await send("GET", "users/\(userId)")
    }

    func setFollowing(_ follow: Bool, userId: String) async throws -> Bool {
        let response: FollowResponse = try await send(follow ? "POST" : "DELETE", "users/\(userId)/follow")
        return response.isFollowing
    }

    func following() async throws -> [PublicUser] {
        let response: UsersResponse = try await send("GET", "me/following")
        return response.users
    }

    func updateName(_ name: String) async throws -> User {
        let response: UserResponse = try await send("PATCH", "me", json: ["name": name])
        return response.user
    }

    // MARK: - Списки

    private struct MyListsResponse: Decodable { let lists: [MyList] }
    private struct ListResponse: Decodable { let list: ListSummary }

    /// С bookId у каждого списка заполнено containsBook.
    func myLists(bookId: String? = nil) async throws -> [MyList] {
        let response: MyListsResponse = try await send(
            "GET", "lists", query: bookId.map { [URLQueryItem(name: "bookId", value: $0)] } ?? []
        )
        return response.lists
    }

    func createList(_ input: ListInput) async throws -> ListSummary {
        let response: ListResponse = try await send("POST", "lists", json: input)
        return response.list
    }

    func list(id: String) async throws -> ListDetails {
        try await send("GET", "lists/\(id)")
    }

    func updateList(id: String, _ input: ListInput) async throws -> ListSummary {
        let response: ListResponse = try await send("PATCH", "lists/\(id)", json: input)
        return response.list
    }

    func deleteList(id: String) async throws {
        let _: OK = try await send("DELETE", "lists/\(id)")
    }

    func setBook(_ bookId: String, inList listId: String, _ included: Bool) async throws {
        if included {
            let _: OK = try await send("POST", "lists/\(listId)/items", json: ["bookId": bookId])
        } else {
            let _: OK = try await send("DELETE", "lists/\(listId)/items/\(bookId)")
        }
    }

    // MARK: - Итоги

    func stats(year: Int? = nil) async throws -> YearStats {
        try await send("GET", "stats", query: year.map { [URLQueryItem(name: "year", value: String($0))] } ?? [])
    }

    /// target = nil убирает цель.
    func setGoal(year: Int, target: Int?) async throws -> YearStats {
        struct Body: Encodable {
            let year: Int
            let target: Int?
            func encode(to encoder: Encoder) throws {
                var container = encoder.container(keyedBy: CodingKeys.self)
                try container.encode(year, forKey: .year)
                try container.encode(target, forKey: .target) // null явно — сервер так убирает цель
            }
            enum CodingKeys: String, CodingKey { case year, target }
        }
        return try await send("PUT", "goal", json: Body(year: year, target: target))
    }

    func wrapped(year: Int) async throws -> Wrapped {
        try await send("GET", "wrapped", query: [URLQueryItem(name: "year", value: String(year))])
    }

    // MARK: - Импорт

    func importFile(_ data: Data, filename: String, kind: ImportKind) async throws -> ImportResult {
        let boundary = "Boundary-\(UUID().uuidString)"
        var body = Data()
        func append(_ string: String) { body.append(Data(string.utf8)) }
        append("--\(boundary)\r\nContent-Disposition: form-data; name=\"kind\"\r\n\r\n\(kind.rawValue)\r\n")
        append("--\(boundary)\r\nContent-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n")
        append("Content-Type: application/octet-stream\r\n\r\n")
        body.append(data)
        append("\r\n--\(boundary)--\r\n")

        var request = makeRequest("POST", "import")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        return try await perform(request)
    }

    // MARK: - Транспорт

    private func makeRequest(_ method: String, _ path: String, query: [URLQueryItem] = []) -> URLRequest {
        var components = URLComponents(
            url: baseURL.appendingPathComponent("api/v1").appendingPathComponent(path),
            resolvingAgainstBaseURL: false
        )!
        if !query.isEmpty { components.queryItems = query }
        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        return request
    }

    private func send<T: Decodable>(
        _ method: String,
        _ path: String,
        query: [URLQueryItem] = [],
        json body: (any Encodable)? = nil
    ) async throws -> T {
        var request = makeRequest(method, path, query: query)
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try encoder.encode(body)
        }
        return try await perform(request)
    }

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }

        if (200..<300).contains(http.statusCode) {
            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                throw APIError.invalidResponse
            }
        }

        let message = (try? decoder.decode(ErrorBody.self, from: data))?.error
        if http.statusCode == 401, request.value(forHTTPHeaderField: "Authorization") != nil {
            onUnauthorized?()
            throw APIError.unauthorized
        }
        throw APIError.server(message ?? "Ошибка сервера (\(http.statusCode))")
    }
}
