import SwiftUI

struct FeedView: View {
    @Environment(AuthStore.self) private var auth
    @State private var feed: Feed?
    @State private var items: [FeedItem] = []
    @State private var isLoadingMore = false
    @State private var query = ""
    @State private var people: [PublicUser] = []
    @State private var errorMessage: String?
    @State private var path = NavigationPath()
    @State private var unread = 0

    private var trimmedQuery: String { query.trimmingCharacters(in: .whitespaces) }

    var body: some View {
        NavigationStack(path: $path) {
            List {
                if !trimmedQuery.isEmpty {
                    peopleSection
                } else if let feed {
                    if feed.followingCount == 0 {
                        ContentUnavailableView(
                            "Подпишитесь на друзей",
                            systemImage: "person.2",
                            description: Text("Найдите их по имени через поиск сверху или нажмите на автора отзыва на странице книги")
                        )
                        .listRowBackground(Color.clear)
                    } else if items.isEmpty {
                        ContentUnavailableView(
                            "Пока тихо",
                            systemImage: "text.bubble",
                            description: Text("Ваши подписки ещё ничего не отметили")
                        )
                        .listRowBackground(Color.clear)
                    } else {
                        ForEach(items) { item in
                            FeedRow(
                                item: item,
                                openUser: { path.append(UserRoute(id: item.user.id)) },
                                openBook: { path.append(BookRoute(id: item.book.id)) }
                            )
                        }
                        if feed.nextCursor != nil {
                            Button {
                                Task { await loadMore() }
                            } label: {
                                HStack {
                                    Text("Показать ещё")
                                    if isLoadingMore { ProgressView() }
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .disabled(isLoadingMore)
                        }
                    }
                } else if errorMessage == nil {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .listRowBackground(Color.clear)
                }
            }
            .navigationTitle("Лента")
            .toolbar {
                Button {
                    path.append(NotificationsRoute())
                } label: {
                    Image(systemName: unread > 0 ? "bell.badge" : "bell")
                }
                .accessibilityLabel(unread > 0 ? L("Уведомления, новых: %@", String(unread)) : L("Уведомления"))
            }
            .searchable(text: $query, prompt: "Найти людей по имени")
            .task(id: trimmedQuery) { await searchPeople(trimmedQuery) }
            .task { await load() }
            .refreshable { await load() }
            .appDestinations()
            .errorAlert($errorMessage)
        }
    }

    @ViewBuilder
    private var peopleSection: some View {
        let others = people.filter { $0.id != auth.user?.id }
        if others.isEmpty {
            Text(trimmedQuery.count < 2 ? L("Введите хотя бы две буквы") : L("Никого не нашли"))
                .foregroundStyle(.secondary)
        } else {
            Section("Люди") {
                ForEach(others) { user in
                    NavigationLink(value: UserRoute(id: user.id)) {
                        Label(user.name, systemImage: "person.crop.circle")
                    }
                }
            }
        }
    }

    private func load() async {
        unread = (try? await auth.api.notifications().unread) ?? 0
        do {
            let first = try await auth.api.feed()
            feed = first
            items = first.items
        } catch {
            if !Task.isCancelled { errorMessage = error.localizedDescription }
        }
    }

    private func loadMore() async {
        guard let cursor = feed?.nextCursor else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }
        do {
            let next = try await auth.api.feed(cursor: cursor)
            feed = next
            items += next.items
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func searchPeople(_ query: String) async {
        guard query.count >= 2 else {
            people = []
            return
        }
        try? await Task.sleep(for: .milliseconds(300))
        guard !Task.isCancelled else { return }
        do {
            let found = try await auth.api.searchUsers(query)
            if !Task.isCancelled { people = found }
        } catch {
            if !Task.isCancelled { errorMessage = error.localizedDescription }
        }
    }
}

/// В строке два перехода (к человеку и к книге), поэтому это кнопки со стилем .borderless —
/// иначе List сделал бы всю строку одной ссылкой.
private struct FeedRow: View {
    let item: FeedItem
    let openUser: () -> Void
    let openBook: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Button(action: openUser) {
                    Text(item.user.name).font(.subheadline.bold())
                }
                .buttonStyle(.borderless)
                .tint(.primary)
                Text(item.label)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if let rating = item.rating {
                    Label("\(rating)/10", systemImage: "star.fill")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
                Spacer()
                Text(item.createdAt, format: .relative(presentation: .named))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Button(action: openBook) {
                BookRowView(book: item.book)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.borderless)
            .tint(.primary)
            if let review = item.review {
                Text(review)
                    .lineLimit(6)
            }
            if item.type == .review, let entryId = item.entryId {
                HStack(spacing: 20) {
                    LikeButton(entryId: entryId, likes: item.likes ?? 0, likedByMe: item.likedByMe ?? false)
                    CommentsButton(entryId: entryId, count: item.comments ?? 0)
                }
            }
        }
        .padding(.vertical, 4)
    }
}
