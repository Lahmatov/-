import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

enum APIError: LocalizedError, Equatable {
    case unauthorized
    case server(String)
    case invalidResponse
    /// Нет сети и нет сохранённой копии ответа.
    case offline
    /// Нет сети: изменение сохранено на телефоне и уйдёт на сервер позже.
    case queued

    var errorDescription: String? {
        switch self {
        case .unauthorized: L("Сессия истекла — войдите снова.")
        case .server(let message): message
        case .invalidResponse: L("Сервер вернул непонятный ответ.")
        case .offline: L("Нет подключения к интернету.")
        case .queued: L("Нет сети — изменение сохранено на телефоне и отправится, когда появится интернет.")
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

    /// Офлайн-копии ответов и очередь изменений; nil — без офлайн-режима (например, в тестах).
    let offline: OfflineStore?
    let sync = SyncStatus()
    private var isFlushing = false

    private let session: URLSession
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { try DateCoding.decode($0) }
        return decoder
    }()
    private let encoder = JSONEncoder()

    private struct ErrorBody: Decodable { let error: String }

    init(baseURL: URL, session: URLSession = .shared, offline: OfflineStore? = nil) {
        self.baseURL = baseURL
        self.session = session
        self.offline = offline
        sync.pendingCount = offline?.pending.count ?? 0
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
        let response: EntryResponse = try await sendQueueable("PUT", "shelf/\(bookId)", json: ["status": status.rawValue])
        return response.entry
    }

    func saveReview(_ update: ReviewUpdate, bookId: String) async throws -> ShelfEntry {
        let response: EntryResponse = try await sendQueueable("PATCH", "shelf/\(bookId)", json: update)
        return response.entry
    }

    func removeFromShelf(bookId: String) async throws {
        let _: OK = try await sendQueueable("DELETE", "shelf/\(bookId)")
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
        try await send("GET", "authors/\(Self.pathSegment(name))")
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
        let response: EntryResponse = try await sendQueueable(
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

    // MARK: Челленджи

    private struct ChallengeResponse: Decodable { let challenge: ChallengeDetails }
    private struct ChallengeIdResponse: Decodable { struct Item: Decodable { let id: String }; let challenge: Item }
    private struct BadgesResponse: Decodable { let badges: [Badge] }

    func challenges() async throws -> ChallengeList {
        try await send("GET", "challenges")
    }

    func challenge(id: String) async throws -> ChallengeDetails {
        let response: ChallengeResponse = try await send("GET", "challenges/\(id)")
        return response.challenge
    }

    /// Возвращает id нового челленджа.
    func createChallenge(_ draft: ChallengeDraft) async throws -> String {
        let response: ChallengeIdResponse = try await send("POST", "challenges", json: draft)
        return response.challenge.id
    }

    func joinChallenge(id: String) async throws {
        let _: OK = try await send("PUT", "challenges/\(id)/membership")
    }

    /// Закрытый челлендж по коду; возвращает его id.
    func joinChallenge(code: String) async throws -> String {
        let response: ChallengeIdResponse = try await send("POST", "challenges/join", json: ["code": code])
        return response.challenge.id
    }

    func leaveChallenge(id: String) async throws {
        let _: OK = try await send("DELETE", "challenges/\(id)/membership")
    }

    func deleteChallenge(id: String) async throws {
        let _: OK = try await send("DELETE", "challenges/\(id)")
    }

    func badges() async throws -> [Badge] {
        let response: BadgesResponse = try await send("GET", "badges")
        return response.badges
    }

    // MARK: Клубы

    private struct ClubsResponse: Decodable { let clubs: [ClubSummary] }
    private struct ClubResponse: Decodable { let club: ClubDetails }
    private struct ClubIdResponse: Decodable { struct Club: Decodable { let id: String }; let club: Club }
    private struct ClubPostsResponse: Decodable { let posts: [ClubPost] }
    private struct ClubPostResponse: Decodable { let post: ClubPost }
    private struct ChapterResponse: Decodable { let chapter: Int }

    func clubs() async throws -> [ClubSummary] {
        let response: ClubsResponse = try await send("GET", "clubs")
        return response.clubs
    }

    /// Возвращает id нового клуба.
    func createClub(_ draft: ClubDraft) async throws -> String {
        let response: ClubIdResponse = try await send("POST", "clubs", json: draft)
        return response.club.id
    }

    /// Вступить по коду приглашения; возвращает id клуба.
    func joinClub(code: String) async throws -> String {
        let response: ClubIdResponse = try await send("POST", "clubs/join", json: ["code": code])
        return response.club.id
    }

    func club(id: String) async throws -> ClubDetails {
        let response: ClubResponse = try await send("GET", "clubs/\(id)")
        return response.club
    }

    func leaveClub(id: String) async throws {
        let _: OK = try await send("DELETE", "clubs/\(id)/membership")
    }

    func deleteClub(id: String) async throws {
        let _: OK = try await send("DELETE", "clubs/\(id)")
    }

    func setClubChapter(_ chapter: Int, clubId: String) async throws -> Int {
        let response: ChapterResponse = try await send("PUT", "clubs/\(clubId)/progress", json: ["chapter": chapter])
        return response.chapter
    }

    func clubPosts(clubId: String) async throws -> [ClubPost] {
        let response: ClubPostsResponse = try await send("GET", "clubs/\(clubId)/posts")
        return response.posts
    }

    func addClubPost(_ text: String, chapter: Int?, clubId: String) async throws -> ClubPost {
        struct Body: Encodable {
            let text: String
            let chapter: Int?
        }
        let response: ClubPostResponse = try await send("POST", "clubs/\(clubId)/posts", json: Body(text: text, chapter: chapter))
        return response.post
    }

    func deleteClubPost(id: String) async throws {
        let _: OK = try await send("DELETE", "club-posts/\(id)")
    }

    // MARK: Цитаты

    private struct QuoteResponse: Decodable { let quote: Quote }

    func quotes(bookId: String) async throws -> BookQuotes {
        try await send("GET", "books/\(bookId)/quotes")
    }

    func addQuote(_ draft: QuoteDraft, bookId: String) async throws -> Quote {
        let response: QuoteResponse = try await sendQueueable("POST", "books/\(bookId)/quotes", json: draft)
        return response.quote
    }

    func updateQuote(id: String, _ draft: QuoteDraft) async throws -> Quote {
        let response: QuoteResponse = try await sendQueueable("PATCH", "quotes/\(id)", json: draft)
        return response.quote
    }

    func deleteQuote(id: String) async throws {
        let _: OK = try await sendQueueable("DELETE", "quotes/\(id)")
    }

    func myQuotes(cursor: String? = nil) async throws -> QuotePage {
        try await send("GET", "quotes", query: cursor.map { [URLQueryItem(name: "cursor", value: $0)] } ?? [])
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

    // MARK: - Аккаунт, жалобы, экспорт

    func forgotPassword(email: String) async throws {
        let _: OK = try await send("POST", "auth/forgot-password", json: ["email": email])
    }

    func resendVerification() async throws {
        let _: OK = try await send("POST", "auth/resend-verification")
    }

    func report(_ reason: ReportReason, entryId: String? = nil, commentId: String? = nil) async throws {
        struct Body: Encodable { let entryId: String?; let commentId: String?; let reason: String }
        let _: OK = try await send("POST", "reports", json: Body(entryId: entryId, commentId: commentId, reason: reason.rawValue))
    }

    /// Своя полка в CSV (формат совместим с импортом).
    func exportCSV() async throws -> Data {
        do {
            return try await fetch(makeRequest("GET", "export"))
        } catch let error where Self.isConnectivityError(error) {
            throw APIError.offline
        }
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

    /// Кодирует текст как один сегмент пути: «/» и «?» в имени автора не должны менять маршрут.
    nonisolated static func pathSegment(_ value: String) -> String {
        var allowed = CharacterSet.urlPathAllowed
        allowed.remove(charactersIn: "/?#;")
        return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
    }

    private func makeRequest(_ method: String, _ path: String, query: [URLQueryItem] = []) -> URLRequest {
        // path уже закодирован: id и слаги — ASCII, произвольный текст проходит через pathSegment.
        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
        var basePath = components.percentEncodedPath
        if basePath.hasSuffix("/") { basePath.removeLast() }
        components.percentEncodedPath = basePath + "/api/v1/" + path
        if !query.isEmpty { components.queryItems = query }
        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        // Жанры, причины рекомендаций и тексты уведомлений сервер отдаёт на языке интерфейса.
        request.setValue(AppLanguage.isEnglish ? "en" : "ru", forHTTPHeaderField: "Accept-Language")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        return request
    }

    private func send<T: Decodable>(
        _ method: String,
        _ path: String,
        query: [URLQueryItem] = [],
        json body: (any Encodable)? = nil
    ) async throws -> T {
        try await perform(try makeRequest(method, path, query: query, body: body))
    }

    private func makeRequest(_ method: String, _ path: String, query: [URLQueryItem] = [], body: (any Encodable)?) throws -> URLRequest {
        var request = makeRequest(method, path, query: query)
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try encoder.encode(body)
        }
        return request
    }

    /// Изменение, которое можно сделать без сети: при обрыве связи оно встаёт в очередь (APIError.queued)
    /// и уйдёт на сервер, когда связь вернётся. Порядок изменений сохраняется.
    private func sendQueueable<T: Decodable>(
        _ method: String,
        _ path: String,
        json body: (any Encodable)? = nil
    ) async throws -> T {
        let request = try makeRequest(method, path, body: body)
        guard let offline else { return try await perform(request) }
        // Сначала отправляем то, что накопилось, иначе новое изменение обгонит старые.
        if !offline.pending.isEmpty { await flushOutbox() }
        if !offline.pending.isEmpty {
            enqueue(request, path: path)
            throw APIError.queued
        }
        do {
            return try await perform(request)
        } catch APIError.offline {
            enqueue(request, path: path)
            throw APIError.queued
        }
    }

    private func enqueue(_ request: URLRequest, path: String) {
        guard let offline else { return }
        offline.enqueue(method: request.httpMethod ?? "GET", path: path, body: request.httpBody)
        sync.pendingCount = offline.pending.count
    }

    /// Отправляет очередь изменений по порядку. Вызывается при появлении сети и при возврате в приложение.
    func flushOutbox() async {
        guard let offline, !isFlushing, token != nil, !offline.pending.isEmpty else { return }
        isFlushing = true
        defer {
            isFlushing = false
            sync.pendingCount = offline.pending.count
        }
        for item in offline.pending {
            var request = makeRequest(item.method, item.path)
            if let body = item.body {
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.httpBody = body
            }
            do {
                _ = try await fetch(request)
                offline.remove(id: item.id)
                sync.isOffline = false
            } catch let error where Self.isConnectivityError(error) {
                sync.isOffline = true
                return
            } catch APIError.unauthorized {
                return
            } catch {
                // Сервер отклонил изменение (например, книгу удалили) — повтор не поможет.
                offline.remove(id: item.id)
                sync.lastRejected = error.localizedDescription
            }
        }
    }

    /// Сохраняет значение как офлайн-копию ответа GET (например, после изменения, поставленного в очередь).
    func updateCachedResponse<T: Encodable>(_ value: T, path: String, query: [URLQueryItem] = []) {
        guard let offline else { return }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(value) else { return }
        offline.saveResponse(data, for: cacheKey(makeRequest("GET", path, query: query)))
    }

    private func cacheKey(_ request: URLRequest) -> String {
        "\(request.url?.absoluteString ?? "")|\(request.value(forHTTPHeaderField: "Accept-Language") ?? "")"
    }

    static func isConnectivityError(_ error: Error) -> Bool {
        guard let error = error as? URLError else { return false }
        let codes: [URLError.Code] = [
            .notConnectedToInternet, .networkConnectionLost, .timedOut, .cannotConnectToHost,
            .cannotFindHost, .dnsLookupFailed, .dataNotAllowed, .internationalRoamingOff,
        ]
        return codes.contains(error.code)
    }

    /// GET без сети отдаёт последнюю сохранённую копию ответа; остальные запросы — APIError.offline.
    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let isGet = request.httpMethod == "GET"
        let data: Data
        do {
            data = try await fetch(request)
        } catch let error where Self.isConnectivityError(error) {
            sync.isOffline = true
            if isGet, let cached = offline?.response(for: cacheKey(request)) { return try decodeBody(cached) }
            throw APIError.offline
        }
        if sync.isOffline { sync.isOffline = false }
        let value: T = try decodeBody(data)
        if isGet { offline?.saveResponse(data, for: cacheKey(request)) }
        if let offline, !offline.pending.isEmpty, !isFlushing { Task { await flushOutbox() } }
        return value
    }

    private func decodeBody<T: Decodable>(_ data: Data) throws -> T {
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.invalidResponse
        }
    }

    /// Запрос без кэша: тело успешного ответа или ошибка сервера.
    private func fetch(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        if (200..<300).contains(http.statusCode) { return data }

        let message = (try? decoder.decode(ErrorBody.self, from: data))?.error
        if http.statusCode == 401, request.value(forHTTPHeaderField: "Authorization") != nil {
            onUnauthorized?()
            throw APIError.unauthorized
        }
        throw APIError.server(message ?? L("Ошибка сервера (%@)", String(http.statusCode)))
    }
}
