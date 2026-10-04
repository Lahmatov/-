import SwiftUI
#if canImport(GoogleSignIn)
import GoogleSignIn
#endif

@main
struct BookshelfApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var auth = BookshelfApp.makeAuthStore()

    private static func makeAuthStore() -> AuthStore {
        #if DEBUG
        if UITestSupport.isActive { return UITestSupport.makeAuthStore() }
        #endif
        return AuthStore(api: APIClient(baseURL: AppConfig.apiBaseURL, offline: .makeDefault()))
    }

    init() {
        CoverCache.configure()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(auth)
                .onOpenURL { url in
                    #if canImport(GoogleSignIn)
                    GIDSignIn.sharedInstance.handle(url)
                    #endif
                }
        }
    }
}

struct BookRoute: Hashable {
    let id: String
}

struct UserRoute: Hashable {
    let id: String
}

struct ListRoute: Hashable {
    let id: String
}

struct AuthorRoute: Hashable {
    let name: String
}

struct ChallengeRoute: Hashable {
    let id: String
}

struct ClubRoute: Hashable {
    let id: String
}

struct GenreRoute: Hashable {
    let slug: String
    let name: String
}

extension View {
    /// Переходы, общие для всех вкладок: книга, профиль человека, список.
    func appDestinations() -> some View {
        navigationDestination(for: BookRoute.self) { BookDetailView(bookId: $0.id) }
            .navigationDestination(for: UserRoute.self) { UserProfileView(userId: $0.id) }
            .navigationDestination(for: ListRoute.self) { ListDetailView(listId: $0.id) }
            .navigationDestination(for: AuthorRoute.self) { AuthorView(name: $0.name) }
            .navigationDestination(for: GenreRoute.self) { GenreView(slug: $0.slug, name: $0.name) }
            .navigationDestination(for: NotificationsRoute.self) { _ in NotificationsView() }
            .navigationDestination(for: ClubRoute.self) { ClubDetailView(clubId: $0.id) }
            .navigationDestination(for: ChallengeRoute.self) { ChallengeDetailView(challengeId: $0.id) }
    }
}

struct RootView: View {
    @Environment(AuthStore.self) private var auth

    var body: some View {
        Group {
            switch auth.state {
            case .restoring:
                ProgressView()
            case .signedOut:
                SignInView()
            case .signedIn:
                MainTabView()
                    .task {
                        #if DEBUG
                        // В UI-тестах системный запрос разрешения на уведомления перекрыл бы экран.
                        if UITestSupport.isActive { return }
                        #endif
                        await PushManager.shared.enable(api: auth.api)
                    }
            }
        }
        .task { await auth.restore() }
    }
}

struct MainTabView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        TabView {
            ShelfView()
                .tabItem { Label("Полка", systemImage: "books.vertical") }
            SearchView()
                .tabItem { Label("Поиск", systemImage: "magnifyingglass") }
            FeedView()
                .tabItem { Label("Лента", systemImage: "person.2") }
            StatsView()
                .tabItem { Label("Итоги", systemImage: "chart.bar") }
            ProfileView()
                .tabItem { Label("Профиль", systemImage: "person.crop.circle") }
        }
        .safeAreaInset(edge: .top, spacing: 0) { OfflineBanner(sync: auth.api.sync) }
        // Неотправленные изменения уходят, когда появилась сеть или пользователь вернулся в приложение.
        .task { await NetworkMonitor.shared.start { Task { await auth.api.flushOutbox() } } }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await auth.api.flushOutbox() } }
        }
    }
}

/// Полоска «нет сети / ждут отправки» над вкладками.
struct OfflineBanner: View {
    let sync: SyncStatus
    @State private var rejected: String?

    var body: some View {
        Group {
            if sync.isOffline || sync.pendingCount > 0 {
                HStack(spacing: 6) {
                    Image(systemName: sync.isOffline ? "wifi.slash" : "arrow.triangle.2.circlepath")
                    if sync.isOffline {
                        Text("Нет сети — показаны сохранённые данные")
                    }
                    if sync.pendingCount > 0 {
                        Text(L("Ждут отправки: %@", String(sync.pendingCount)))
                    }
                }
                .font(.footnote)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(.orange.opacity(0.2))
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier("offlineBanner")
            }
        }
        .animation(.default, value: sync.isOffline)
        .onChange(of: sync.lastRejected) { _, message in
            guard let message else { return }
            rejected = message
            sync.lastRejected = nil
        }
        .errorAlert($rejected, title: "Изменение не сохранилось")
    }
}
