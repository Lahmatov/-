import SwiftUI

struct AddBookView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss

    let onCreated: (Book) -> Void

    @State private var title: String
    @State private var author = ""
    @State private var year = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(initialTitle: String = "", onCreated: @escaping (Book) -> Void) {
        _title = State(initialValue: initialTitle)
        self.onCreated = onCreated
    }

    private var parsedYear: Int?? {
        let value = year.trimmingCharacters(in: .whitespaces)
        if value.isEmpty { return .some(nil) }
        return Int(value).map { .some($0) }
    }

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty
            && !author.trimmingCharacters(in: .whitespaces).isEmpty
            && parsedYear != nil
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Название", text: $title)
                    TextField("Автор", text: $author)
                    TextField("Год первой публикации", text: $year)
                        .keyboardType(.numberPad)
                } footer: {
                    Text("Если такая книга уже есть в каталоге, откроется она.")
                }
            }
            .navigationTitle("Новая книга")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSaving {
                        ProgressView()
                    } else {
                        Button("Добавить") { Task { await save() } }
                            .disabled(!canSave)
                    }
                }
            }
            .errorAlert($errorMessage)
        }
    }

    private func save() async {
        guard case .some(let year) = parsedYear else { return }
        isSaving = true
        defer { isSaving = false }
        do {
            let response = try await auth.api.addBook(
                title: title.trimmingCharacters(in: .whitespaces),
                author: author.trimmingCharacters(in: .whitespaces),
                year: year
            )
            onCreated(response.book)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
