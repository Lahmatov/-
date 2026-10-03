import SwiftUI
#if canImport(GoogleSignIn)
import GoogleSignIn
#endif

@main
struct BookshelfApp: App {
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
            ProfileView()
                .tabItem { Label("Профиль", systemImage: "person.crop.circle") }
        }
    }
}
