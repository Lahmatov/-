import SwiftUI

/// ♥ с числом лайков. Сам обновляет состояние; стиль .borderless — чтобы работать внутри строки списка.
struct LikeButton: View {
    let entryId: String
    @State private var state: LikeState
    @State private var isBusy = false
    @Environment(AuthStore.self) private var auth

    init(entryId: String, likes: Int, likedByMe: Bool) {
        self.entryId = entryId
        _state = State(initialValue: LikeState(likes: likes, likedByMe: likedByMe))
    }

    var body: some View {
        Button {
            Task { await toggle() }
        } label: {
            Label(state.likes > 0 ? "\(state.likes)" : "", systemImage: state.likedByMe ? "heart.fill" : "heart")
                .foregroundStyle(state.likedByMe ? Color.red : Color.secondary)
                .font(.subheadline)
        }
        .buttonStyle(.borderless)
        .disabled(isBusy)
        .sensoryFeedback(.impact(weight: .light), trigger: state.likedByMe)
        .accessibilityLabel(state.likedByMe ? L("Убрать лайк") : L("Нравится"))
        .accessibilityValue("\(state.likes)")
    }

    private func toggle() async {
        isBusy = true
        defer { isBusy = false }
        let previous = state
        // Оптимистично меняем сразу, при ошибке возвращаем как было.
        state = LikeState(likes: state.likes + (state.likedByMe ? -1 : 1), likedByMe: !state.likedByMe)
        do {
            state = try await auth.api.setLiked(!previous.likedByMe, entryId: entryId)
        } catch {
            state = previous
        }
    }
}

/// 💬 с числом комментариев, открывает обсуждение отзыва.
struct CommentsButton: View {
    let entryId: String
    let count: Int
    @State private var isPresented = false

    var body: some View {
        Button {
            isPresented = true
        } label: {
            Label(count > 0 ? "\(count)" : "", systemImage: "bubble.right")
                .foregroundStyle(.secondary)
                .font(.subheadline)
        }
        .buttonStyle(.borderless)
        .accessibilityLabel("Комментарии")
        .accessibilityValue("\(count)")
        .sheet(isPresented: $isPresented) {
            CommentsView(entryId: entryId)
        }
    }
}

struct CommentsView: View {
    let entryId: String

    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var thread: CommentThread?
    @State private var text = ""
    @State private var isSending = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            List {
                if let thread {
                    if thread.comments.isEmpty {
                        Text("Пока нет комментариев").foregroundStyle(.secondary)
                    }
                    ForEach(thread.comments) { comment in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(comment.user.name).font(.subheadline.bold())
                                Spacer()
                                Text(comment.createdAt, format: .relative(presentation: .named))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Text(comment.text)
                        }
                        .deleteDisabled(!canDelete(comment, thread: thread))
                        .contextMenu {
                            if comment.user.id != auth.user?.id { ReportMenu(commentId: comment.id) }
                        }
                    }
                    .onDelete { offsets in
                        Task { await delete(offsets.map { thread.comments[$0] }) }
                    }
                } else {
                    ProgressView().frame(maxWidth: .infinity)
                }
            }
            .navigationTitle("Комментарии")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Готово") { dismiss() }
                }
            }
            .safeAreaInset(edge: .bottom) {
                HStack {
                    TextField("Комментарий", text: $text, axis: .vertical)
                        .lineLimit(1...4)
                        .textFieldStyle(.roundedBorder)
                    Button {
                        Task { await send() }
                    } label: {
                        Image(systemName: "arrow.up.circle.fill").font(.title2)
                    }
                    .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending)
                    .accessibilityLabel("Отправить")
                }
                .padding()
                .background(.bar)
            }
            .task { await load() }
            .errorAlert($errorMessage)
        }
        .presentationDetents([.medium, .large])
    }

    private func canDelete(_ comment: Comment, thread: CommentThread) -> Bool {
        guard let me = auth.user?.id else { return false }
        return comment.user.id == me || thread.reviewAuthorId == me
    }

    private func load() async {
        do {
            thread = try await auth.api.comments(entryId: entryId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func send() async {
        isSending = true
        defer { isSending = false }
        do {
            _ = try await auth.api.addComment(text.trimmingCharacters(in: .whitespacesAndNewlines), entryId: entryId)
            text = ""
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func delete(_ comments: [Comment]) async {
        do {
            for comment in comments { try await auth.api.deleteComment(id: comment.id) }
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct NotificationsRoute: Hashable {}

struct NotificationsView: View {
    @Environment(AuthStore.self) private var auth
    @State private var list: NotificationList?
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let list {
                if list.items.isEmpty {
                    ContentUnavailableView(
                        "Пока ничего",
                        systemImage: "bell",
                        description: Text("Здесь появятся новые подписчики, лайки и комментарии к вашим отзывам")
                    )
                }
                ForEach(list.items) { item in
                    // Тип значения должен совпадать с navigationDestination(for:), поэтому две ветки, а не AnyHashable.
                    if let book = item.book {
                        NavigationLink(value: BookRoute(id: book.id)) { row(item) }
                    } else {
                        NavigationLink(value: UserRoute(id: item.actor.id)) { row(item) }
                    }
                }
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .navigationTitle("Уведомления")
        .refreshable { await load() }
        .task {
            await load()
            try? await auth.api.markNotificationsRead()
            PushManager.shared.clearBadge()
        }
        .errorAlert($errorMessage)
    }

    private func row(_ item: AppNotification) -> some View {
                        HStack(alignment: .firstTextBaseline) {
                            if !item.read {
                                Circle().fill(Color.accentColor).frame(width: 8, height: 8).accessibilityLabel("Новое")
                            }
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.text)
                                Text(item.createdAt, format: .relative(presentation: .named))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
    }

    private func load() async {
        do {
            list = try await auth.api.notifications()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

enum ShareURL {
    /// Публичная ссылка на страницу сайта (тот же сервер, что и API).
    static func make(_ path: String) -> URL {
        AppConfig.apiBaseURL.appendingPathComponent(path)
    }
}

/// «Пожаловаться» с выбором причины — для контекстного меню отзыва или комментария.
struct ReportMenu: View {
    var entryId: String?
    var commentId: String?

    @Environment(AuthStore.self) private var auth

    var body: some View {
        Menu {
            ForEach(ReportReason.allCases) { reason in
                Button(reason.title) {
                    Task { try? await auth.api.report(reason, entryId: entryId, commentId: commentId) }
                }
            }
        } label: {
            Label("Пожаловаться", systemImage: "flag")
        }
    }
}
