import Foundation
import Observation

/// Состояние входа. Токен хранится в Keychain, профиль — в UserDefaults, чтобы приложение
/// открывалось сразу, даже без сети.
@MainActor
@Observable
final class AuthStore {
    enum State: Equatable {
        case restoring
        case signedOut
        case signedIn(User)
    }

    private(set) var state: State = .restoring
    let api: APIClient

    private static let tokenKey = "apiToken"
    private static let userKey = "currentUser"

    init(api: APIClient) {
        self.api = api
        api.token = Keychain.read(Self.tokenKey)
        api.onUnauthorized = { [weak self] in self?.clearSession() }
    }

    var user: User? {
        if case .signedIn(let user) = state { return user }
        return nil
    }

    func restore() async {
        guard api.token != nil else {
            state = .signedOut
            return
        }
        if let data = UserDefaults.standard.data(forKey: Self.userKey),
           let cached = try? JSONDecoder().decode(User.self, from: data) {
            state = .signedIn(cached)
        }
        do {
            let user = try await api.me()
            store(user: user)
        } catch APIError.unauthorized {
            clearSession()
        } catch {
            // Нет сети: остаёмся с сохранённым профилем, если он есть.
            if state == .restoring { state = .signedOut }
        }
    }

    func login(email: String, password: String) async throws {
        accept(try await api.login(email: email, password: password))
    }

    func register(name: String, email: String, password: String) async throws {
        accept(try await api.register(name: name, email: email, password: password))
    }

    func signInWithApple(identityToken: String, name: String?) async throws {
        accept(try await api.signInWithApple(identityToken: identityToken, name: name))
    }

    func signInWithGoogle(idToken: String) async throws {
        accept(try await api.signInWithGoogle(idToken: idToken))
    }

    func updateName(_ name: String) async throws {
        store(user: try await api.updateName(name))
    }

    func logout() async {
        #if canImport(UIKit)
        await PushManager.shared.disable(api: api)
        #endif
        try? await api.logout()
        clearSession()
    }

    func deleteAccount() async throws {
        try await api.deleteAccount()
        clearSession()
    }

    private func accept(_ response: APIClient.AuthResponse) {
        api.token = response.token
        Keychain.save(response.token, for: Self.tokenKey)
        store(user: response.user)
    }

    private func store(user: User) {
        if let data = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(data, forKey: Self.userKey)
        }
        state = .signedIn(user)
    }

    private func clearSession() {
        api.token = nil
        Keychain.delete(Self.tokenKey)
        UserDefaults.standard.removeObject(forKey: Self.userKey)
        api.offline?.clear()
        api.sync.pendingCount = 0
        api.sync.isOffline = false
        #if canImport(WidgetKit)
        WidgetSync.clear()
        #endif
        state = .signedOut
    }
}
