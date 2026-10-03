import SwiftUI
import UniformTypeIdentifiers

struct ProfileView: View {
    @Environment(AuthStore.self) private var auth
    @State private var importKind: ImportKind = .kindle
    @State private var isImporterPresented = false
    @State private var isImporting = false
    @State private var confirmDelete = false
    @State private var infoMessage: String?
    @State private var errorMessage: String?
    @State private var isEditingName = false
    @State private var nameText = ""

    var body: some View {
        NavigationStack {
            List {
                Section {
                    if let user = auth.user {
                        NavigationLink(value: UserRoute(id: user.id)) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(user.name ?? "Читатель").font(.headline)
                                if let email = user.email {
                                    Text(email).font(.subheadline).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                    Button("Изменить имя", systemImage: "pencil") {
                        nameText = auth.user?.name ?? ""
                        isEditingName = true
                    }
                } footer: {
                    Text("Имя видно в отзывах, ленте и профиле.")
                }

                Section {
                    NavigationLink {
                        MyListsView()
                    } label: {
                        Label("Мои списки", systemImage: "list.bullet.rectangle")
                    }
                    NavigationLink {
                        FollowingView()
                    } label: {
                        Label("Подписки", systemImage: "person.2")
                    }
                }

                Section {
                    Button("Kindle — My Clippings.txt", systemImage: "book.closed") { startImport(.kindle) }
                    Button("Goodreads или CSV", systemImage: "tablecells") { startImport(.csv) }
                } header: {
                    Text("Импорт")
                } footer: {
                    Text("""
                    Kindle: подключите его к компьютеру, скопируйте documents/My Clippings.txt в «Файлы» и выберите здесь. \
                    У Apple Books нет экспорта — перенесите список в CSV с колонками Title, Author, Year, Status.
                    """)
                }

                Section {
                    Button("Выйти", role: .destructive) { Task { await auth.logout() } }
                    Button("Удалить аккаунт", role: .destructive) { confirmDelete = true }
                }
            }
            .navigationTitle("Профиль")
            .appDestinations()
            .alert("Ваше имя", isPresented: $isEditingName) {
                TextField("Имя", text: $nameText)
                    .textContentType(.name)
                Button("Сохранить") { Task { await saveName() } }
                Button("Отмена", role: .cancel) {}
            }
            .errorAlert($infoMessage, title: "Импорт завершён")
            .disabled(isImporting)
            .overlay {
                if isImporting {
                    ProgressView("Импортируем…")
                        .padding()
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                }
            }
            .fileImporter(
                isPresented: $isImporterPresented,
                allowedContentTypes: importKind == .kindle ? [.plainText] : [.commaSeparatedText, .plainText]
            ) { result in
                Task { await handleImport(result) }
            }
            .confirmationDialog("Удалить аккаунт?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Удалить навсегда", role: .destructive) { Task { await deleteAccount() } }
            } message: {
                Text("Полка, оценки и отзывы будут удалены без возможности восстановления.")
            }
        }
        .errorAlert($errorMessage)
    }

    private func startImport(_ kind: ImportKind) {
        importKind = kind
        isImporterPresented = true
    }

    private func handleImport(_ result: Result<URL, Error>) async {
        do {
            let url = try result.get()
            // Файл из «Файлов» доступен только внутри security-scoped доступа.
            let accessing = url.startAccessingSecurityScopedResource()
            defer { if accessing { url.stopAccessingSecurityScopedResource() } }
            let data = try Data(contentsOf: url)

            isImporting = true
            defer { isImporting = false }
            let imported = try await auth.api.importFile(data, filename: url.lastPathComponent, kind: importKind)
            infoMessage = "Найдено книг: \(imported.found), добавлено на полку: \(imported.added)"
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func saveName() async {
        let name = nameText.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        do {
            try await auth.updateName(name)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteAccount() async {
        do {
            try await auth.deleteAccount()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
