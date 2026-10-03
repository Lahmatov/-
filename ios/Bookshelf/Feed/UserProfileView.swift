import SwiftUI

struct UserProfileView: View {
    let userId: String

    @Environment(AuthStore.self) private var auth
    @State private var profile: UserProfile?
    @State private var isUpdatingFollow = false
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if let profile {
                content(profile)
            } else if errorMessage != nil {
                ContentUnavailableView("Профиль недоступен", systemImage: "person.crop.circle.badge.exclamationmark")
            } else {
                ProgressView()
            }
        }
        .navigationTitle(profile?.user.name ?? "")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let profile {
                ShareLink(item: ShareURL.make("u/\(profile.user.id)"), subject: Text(profile.user.name)) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
        .task { await load() }
        .errorAlert($errorMessage)
    }

    private func content(_ profile: UserProfile) -> some View {
        List {
            Section {
                HStack(spacing: 16) {
                    Text(String(profile.user.name.prefix(1)).uppercased())
                        .font(.title.bold())
                        .foregroundStyle(.black)
                        .frame(width: 56, height: 56)
                        .background(Color.accentColor, in: Circle())
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(profile.user.name).font(.title2.bold())
                        Text(countsText(profile.counts))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                if !profile.isMe {
                    Button {
                        Task { await toggleFollow() }
                    } label: {
                        Text(profile.isFollowing ? L("Вы подписаны") : L("Подписаться"))
                            .frame(maxWidth: .infinity, minHeight: 30)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(profile.isFollowing ? Color.secondary : Color.accentColor)
                    .disabled(isUpdatingFollow)
                }
            }

            if !profile.readingNow.isEmpty {
                Section("Читает сейчас") {
                    ForEach(profile.readingNow) { book in
                        NavigationLink(value: BookRoute(id: book.id)) { BookRowView(book: book) }
                    }
                }
            }

            Section("Недавно прочитано") {
                if profile.recentlyRead.isEmpty {
                    Text("Пока ничего").foregroundStyle(.secondary)
                }
                ForEach(profile.recentlyRead) { item in
                    NavigationLink(value: BookRoute(id: item.book.id)) {
                        HStack {
                            BookRowView(book: item.book)
                            Spacer()
                            if let rating = item.rating {
                                Label("\(rating)", systemImage: "star.fill")
                                    .font(.caption)
                                    .foregroundStyle(.orange)
                            }
                        }
                    }
                }
            }

            if !profile.lists.isEmpty {
                Section("Списки") {
                    ForEach(profile.lists) { list in
                        NavigationLink(value: ListRoute(id: list.id)) {
                            ListSummaryRow(title: list.title, count: list.count, isPublic: list.isPublic)
                        }
                    }
                }
            }
        }
        .refreshable { await load() }
    }

    private func countsText(_ counts: UserProfile.Counts) -> String {
        [
            "\(counts.read) \(Plural.localized(counts.read, "книга", "книги", "книг"))",
            "\(counts.followers) \(Plural.localized(counts.followers, "подписчик", "подписчика", "подписчиков"))",
            "\(counts.following) \(Plural.localized(counts.following, "подписка", "подписки", "подписок"))",
        ].joined(separator: " · ")
    }

    private func load() async {
        do {
            profile = try await auth.api.profile(userId: userId)
        } catch {
            if !Task.isCancelled { errorMessage = error.localizedDescription }
        }
    }

    private func toggleFollow() async {
        guard let current = profile else { return }
        isUpdatingFollow = true
        defer { isUpdatingFollow = false }
        do {
            _ = try await auth.api.setFollowing(!current.isFollowing, userId: userId)
            await load() // счётчик подписчиков тоже изменился
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Список людей, на которых подписан пользователь.
struct FollowingView: View {
    @Environment(AuthStore.self) private var auth
    @State private var users: [PublicUser]?
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let users {
                if users.isEmpty {
                    ContentUnavailableView(
                        "Нет подписок",
                        systemImage: "person.2",
                        description: Text("Найдите друзей во вкладке «Лента»")
                    )
                }
                ForEach(users) { user in
                    NavigationLink(value: UserRoute(id: user.id)) {
                        Label(user.name, systemImage: "person.crop.circle")
                    }
                }
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .navigationTitle("Подписки")
        .task {
            do {
                users = try await auth.api.following()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
        .errorAlert($errorMessage)
    }
}
