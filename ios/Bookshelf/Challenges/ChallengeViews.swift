import SwiftUI

/// Мои челленджи и открытые публичные: «10 книг за лето», «5 книг фантастики до конца года».
struct ChallengesView: View {
    @Environment(AuthStore.self) private var auth
    @State private var list: ChallengeList?
    @State private var showCreate = false
    @State private var showJoin = false
    @State private var joinCode = ""
    @State private var openChallenge: ChallengeRoute?
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let list {
                Section("Мои") {
                    if list.mine.isEmpty {
                        Text("Вы пока ни в одном челлендже")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(list.mine) { challenge in
                        NavigationLink(value: ChallengeRoute(id: challenge.id)) { ChallengeRow(challenge: challenge) }
                    }
                }
                if !list.open.isEmpty {
                    Section("Можно присоединиться") {
                        ForEach(list.open) { challenge in
                            NavigationLink(value: ChallengeRoute(id: challenge.id)) { ChallengeRow(challenge: challenge) }
                        }
                    }
                }
            }
        }
        .overlay { if list == nil { ProgressView() } }
        .navigationTitle("Челленджи")
        .toolbar {
            Menu {
                Button("Новый челлендж", systemImage: "plus") { showCreate = true }
                Button("Вступить по коду", systemImage: "key") { showJoin = true }
            } label: {
                Image(systemName: "plus")
            }
        }
        .refreshable { await load() }
        .task { await load() }
        .sheet(isPresented: $showCreate) {
            CreateChallengeView { id in
                await load()
                openChallenge = ChallengeRoute(id: id)
            }
        }
        .alert("Код приглашения", isPresented: $showJoin) {
            TextField("Например, AB3DEF9K", text: $joinCode)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
            Button("Вступить") { Task { await join() } }
            Button("Отмена", role: .cancel) { joinCode = "" }
        }
        .navigationDestination(item: $openChallenge) { ChallengeDetailView(challengeId: $0.id) }
        .errorAlert($errorMessage)
    }

    private func load() async {
        do {
            list = try await auth.api.challenges()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func join() async {
        let code = joinCode
        joinCode = ""
        do {
            let id = try await auth.api.joinChallenge(code: code)
            await load()
            openChallenge = ChallengeRoute(id: id)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct ChallengeRow: View {
    let challenge: Challenge

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(challenge.title).font(.headline)
                if challenge.isCompleted && challenge.myProgress != nil {
                    Image(systemName: "rosette")
                        .foregroundStyle(.orange)
                        .accessibilityLabel(Text("Выполнен"))
                }
                if !challenge.isPublic {
                    Image(systemName: "lock.fill")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Text(ChallengeText.summary(goal: challenge.goal, genre: challenge.genre, startsAt: challenge.startsAt, endsAt: challenge.endsAt))
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if let progress = challenge.myProgress {
                ProgressView(value: challenge.fraction) {
                    Text(L("%@ из %@", String(progress), String(challenge.goal)))
                        .font(.caption)
                }
                .tint(challenge.isCompleted ? .green : .accentColor)
            } else {
                Text(ChallengeText.participants(challenge.participantCount))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }
}

enum ChallengeText {
    static func books(_ n: Int) -> String {
        "\(n) \(Plural.localized(n, "книга", "книги", "книг"))"
    }

    static func participants(_ n: Int) -> String {
        "\(n) \(Plural.localized(n, "участник", "участника", "участников"))"
    }

    static func period(_ start: Date, _ end: Date) -> String {
        let format = Date.FormatStyle(date: .abbreviated, time: .omitted).locale(AppLanguage.locale)
        var utc = format
        utc.timeZone = TimeZone(identifier: "UTC")!
        return "\(start.formatted(utc)) — \(end.formatted(utc))"
    }

    static func summary(goal: Int, genre: GenreRef?, startsAt: Date, endsAt: Date) -> String {
        let books = ChallengeText.books(goal)
        let what = genre.map { L("%@ в жанре «%@»", books, $0.name) } ?? books
        return "\(what) · \(period(startsAt, endsAt))"
    }
}

/// Новый челлендж: цель, период, жанр (необязательно), публичный или по коду.
struct CreateChallengeView: View {
    let onCreated: (String) async -> Void

    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var description = ""
    @State private var goal = 10
    @State private var startsAt = Date()
    @State private var endsAt = Calendar.current.date(byAdding: .month, value: 3, to: Date()) ?? Date()
    @State private var genres: [Genre] = []
    @State private var genre: String?
    @State private var isPublic = true
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Название, например «10 книг за лето»", text: $title)
                    TextField("Описание (необязательно)", text: $description, axis: .vertical)
                        .lineLimit(2...5)
                }
                Section {
                    Stepper(value: $goal, in: 1...500) {
                        Text(L("Цель: %@", ChallengeText.books(goal)))
                    }
                    DatePicker("Начало", selection: $startsAt, displayedComponents: .date)
                    DatePicker("Окончание", selection: $endsAt, in: startsAt..., displayedComponents: .date)
                    Picker("Жанр", selection: $genre) {
                        Text("Любой").tag(String?.none)
                        ForEach(genres) { genre in
                            Text(genre.name).tag(Optional(genre.slug))
                        }
                    }
                } footer: {
                    Text("Засчитываются книги, отмеченные «Прочитал» с датой окончания внутри периода.")
                }
                Section {
                    Toggle("Виден всем", isOn: $isPublic)
                } footer: {
                    Text(isPublic ? L("Любой читатель может найти челлендж и присоединиться.") : L("Присоединиться можно только по коду приглашения."))
                }
            }
            .navigationTitle("Новый челлендж")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Отмена") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Создать") { Task { await create() } }
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
                }
            }
            .task { genres = (try? await auth.api.genres()) ?? [] }
            .errorAlert($errorMessage)
        }
    }

    /// День в календаре пользователя → "YYYY-MM-DD", как его видно в DatePicker.
    private static func day(_ date: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 2000, c.month ?? 1, c.day ?? 1)
    }

    private func create() async {
        isSaving = true
        defer { isSaving = false }
        let text = description.trimmingCharacters(in: .whitespacesAndNewlines)
        let draft = ChallengeDraft(
            title: title.trimmingCharacters(in: .whitespaces),
            description: text.isEmpty ? nil : text,
            goal: goal,
            startsAt: Self.day(startsAt),
            endsAt: Self.day(endsAt),
            genre: genre,
            isPublic: isPublic
        )
        do {
            let id = try await auth.api.createChallenge(draft)
            dismiss()
            await onCreated(id)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Челлендж: мой прогресс и таблица участников.
struct ChallengeDetailView: View {
    let challengeId: String

    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var details: ChallengeDetails?
    @State private var confirmLeave = false
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if let details {
                content(details)
            } else {
                ProgressView()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .errorAlert($errorMessage)
    }

    private func content(_ c: ChallengeDetails) -> some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text(c.title).font(.title2.bold())
                    Text(ChallengeText.summary(goal: c.goal, genre: c.genre, startsAt: c.startsAt, endsAt: c.endsAt))
                        .foregroundStyle(.secondary)
                    if let description = c.description {
                        Text(description)
                    }
                    switch c.phase {
                    case .upcoming: Label("Ещё не начался", systemImage: "clock")
                    case .active: Label("Идёт сейчас", systemImage: "flame").foregroundStyle(.orange)
                    case .finished: Label("Завершён", systemImage: "flag.checkered")
                    }
                }
                .padding(.vertical, 4)
            }

            if let progress = c.myProgress {
                Section("Мой прогресс") {
                    HStack(spacing: 16) {
                        Gauge(value: min(Double(progress), Double(c.goal)), in: 0...Double(max(c.goal, 1))) {
                            EmptyView()
                        } currentValueLabel: {
                            Text("\(progress)")
                        }
                        .gaugeStyle(.accessoryCircularCapacity)
                        .tint(progress >= c.goal ? .green : .accentColor)
                        VStack(alignment: .leading) {
                            Text(L("%@ из %@", String(progress), String(c.goal))).font(.headline)
                            if progress >= c.goal {
                                Label("Цель выполнена — значок ваш!", systemImage: "rosette")
                                    .foregroundStyle(.orange)
                            } else {
                                Text(L("Осталось: %@", ChallengeText.books(c.goal - progress)))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            } else if c.phase != .finished {
                Section {
                    Button("Присоединиться") { Task { await join() } }
                        .frame(maxWidth: .infinity)
                }
            }

            Section(L("Участники (%@)", String(c.participantCount))) {
                ForEach(Array(c.leaderboard.enumerated()), id: \.element.id) { index, row in
                    NavigationLink(value: UserRoute(id: row.user.id)) {
                        HStack {
                            Text("\(index + 1).").monospacedDigit().foregroundStyle(.secondary)
                            Text(row.user.name)
                            if row.completed {
                                Image(systemName: "rosette").foregroundStyle(.orange)
                            }
                            Spacer()
                            Text(L("%@ из %@", String(row.progress), String(c.goal)))
                                .monospacedDigit()
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .refreshable { await load() }
        .toolbar {
            if c.isMember {
                if let code = c.inviteCode {
                    ShareLink(
                        item: c.isPublic
                            ? L("Присоединяйтесь к челленджу «%@» в приложении «Полка»!", c.title)
                            : L("Присоединяйтесь к челленджу «%@» в приложении «Полка». Код приглашения: %@", c.title, code),
                        subject: Text(c.title)
                    ) {
                        Image(systemName: "person.badge.plus")
                    }
                    .accessibilityLabel(Text("Пригласить"))
                }
                Menu {
                    if let code = c.inviteCode {
                        Section(L("Код приглашения: %@", code)) {
                            Button("Скопировать код", systemImage: "doc.on.doc") {
                                #if canImport(UIKit)
                                UIPasteboard.general.string = code
                                #endif
                            }
                        }
                    }
                    Button(c.isOwner ? "Удалить челлендж" : "Выйти из челленджа", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) {
                        confirmLeave = true
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .confirmationDialog(c.isOwner ? "Удалить челлендж для всех участников?" : "Выйти из челленджа?", isPresented: $confirmLeave, titleVisibility: .visible) {
            Button(c.isOwner ? "Удалить" : "Выйти", role: .destructive) { Task { await leave(c) } }
        }
    }

    private func load() async {
        do {
            details = try await auth.api.challenge(id: challengeId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func join() async {
        do {
            try await auth.api.joinChallenge(id: challengeId)
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func leave(_ c: ChallengeDetails) async {
        do {
            if c.isOwner {
                try await auth.api.deleteChallenge(id: c.id)
            } else {
                try await auth.api.leaveChallenge(id: c.id)
            }
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Значки за выполненные челленджи — в профиле. Пока значков нет, раздел не показывается.
struct BadgesSection: View {
    @Environment(AuthStore.self) private var auth
    @State private var badges: [Badge] = []

    var body: some View {
        Group {
            if !badges.isEmpty {
                Section("Значки") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(badges) { badge in
                                NavigationLink(value: ChallengeRoute(id: badge.id)) {
                                    VStack(spacing: 4) {
                                        Image(systemName: "rosette")
                                            .font(.system(size: 32))
                                            .foregroundStyle(.orange)
                                        Text(badge.title)
                                            .font(.caption)
                                            .lineLimit(2)
                                            .multilineTextAlignment(.center)
                                    }
                                    .frame(width: 84)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
        .task { badges = (try? await auth.api.badges()) ?? [] }
    }
}
