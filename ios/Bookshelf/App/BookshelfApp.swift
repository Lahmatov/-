import SwiftUI
#if canImport(GoogleSignIn)
import GoogleSignIn
#endif

@main
struct BookshelfApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var auth = AuthStore(api: APIClient(baseURL: AppConfig.apiBaseURL))

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
                    .task { await PushManager.shared.enable(api: auth.api) }
            }
        }
        .task { await auth.restore() }
    }
}

struct MainTabView: View {
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
    }
}
