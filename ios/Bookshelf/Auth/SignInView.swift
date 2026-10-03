import AuthenticationServices
import SwiftUI

struct SignInView: View {
    private enum Mode: Hashable {
        case login
        case register
    }

    @Environment(AuthStore.self) private var auth
    @Environment(\.colorScheme) private var colorScheme

    @State private var mode: Mode = .login
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isBusy = false
    @State private var errorMessage: String?
    @State private var isResetting = false
    @State private var resetEmail = ""
    @State private var infoMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                header

                SignInWithAppleButton(.signIn) { request in
                    request.requestedScopes = [.fullName, .email]
                } onCompletion: { result in
                    Task { await handleApple(result) }
                }
                .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
                .frame(height: 50)

                #if canImport(GoogleSignIn)
                if AppConfig.googleClientID != nil {
                    Button {
                        Task { await signInWithGoogle() }
                    } label: {
                        Label("Войти через Google", systemImage: "g.circle.fill")
                            .frame(maxWidth: .infinity, minHeight: 38)
                    }
                    .buttonStyle(.bordered)
                }
                #endif

                Text("или по email")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                Picker("Режим", selection: $mode) {
                    Text("Вход").tag(Mode.login)
                    Text("Регистрация").tag(Mode.register)
                }
                .pickerStyle(.segmented)

                VStack(spacing: 12) {
                    if mode == .register {
                        TextField("Имя", text: $name)
                            .textContentType(.name)
                    }
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    SecureField(mode == .register ? L("Пароль (от 8 символов)") : L("Пароль"), text: $password)
                        .textContentType(mode == .register ? .newPassword : .password)
                }
                .textFieldStyle(.roundedBorder)

                Button {
                    Task { await submit() }
                } label: {
                    Text(mode == .login ? L("Войти") : L("Создать аккаунт"))
                        .frame(maxWidth: .infinity, minHeight: 38)
                }
                .buttonStyle(.borderedProminent)
                .disabled(isBusy || !canSubmit)

                if mode == .login {
                    Button("Забыли пароль?") {
                        resetEmail = email
                        isResetting = true
                    }
                    .font(.footnote)
                }
            }
            .padding()
            .disabled(isBusy)
        }
        .overlay { if isBusy { ProgressView() } }
        .errorAlert($errorMessage)
        .errorAlert($infoMessage, title: "Проверьте почту")
        .alert("Восстановление пароля", isPresented: $isResetting) {
            TextField("Email", text: $resetEmail)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
            Button("Отправить ссылку") { Task { await requestReset() } }
            Button("Отмена", role: .cancel) {}
        } message: {
            Text("Пришлём на почту ссылку, по которой можно задать новый пароль.")
        }
    }

    private func requestReset() async {
        let address = resetEmail.trimmingCharacters(in: .whitespaces)
        guard address.contains("@") else { return }
        await run {
            try await auth.api.forgotPassword(email: address)
            infoMessage = L("Если такой email зарегистрирован, мы отправили на него ссылку для сброса пароля.")
        }
    }

    private var header: some View {
        VStack(spacing: 8) {
            Image(systemName: "books.vertical.fill")
                .font(.system(size: 56))
                .foregroundStyle(.tint)
            Text("Книжная полка")
                .font(.largeTitle.bold())
            Text("Отмечайте прочитанное, ставьте оценки и пишите отзывы")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .padding(.top, 40)
    }

    private var canSubmit: Bool {
        let hasEmail = email.contains("@")
        switch mode {
        case .login: return hasEmail && !password.isEmpty
        case .register: return hasEmail && password.count >= 8 && !name.trimmingCharacters(in: .whitespaces).isEmpty
        }
    }

    private func submit() async {
        let email = email.trimmingCharacters(in: .whitespaces)
        await run {
            switch mode {
            case .login:
                try await auth.login(email: email, password: password)
            case .register:
                try await auth.register(name: name.trimmingCharacters(in: .whitespaces), email: email, password: password)
            }
        }
    }

    private func handleApple(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .failure(let error):
            if (error as? ASAuthorizationError)?.code == .canceled { return }
            errorMessage = error.localizedDescription
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let data = credential.identityToken,
                  let token = String(data: data, encoding: .utf8)
            else {
                errorMessage = L("Apple не вернул токен входа")
                return
            }
            // Имя Apple отдаёт только при первом входе.
            let name = credential.fullName
                .map { PersonNameComponentsFormatter().string(from: $0) }
                .flatMap { $0.isEmpty ? nil : $0 }
            await run { try await auth.signInWithApple(identityToken: token, name: name) }
        }
    }

    #if canImport(GoogleSignIn)
    private func signInWithGoogle() async {
        await run {
            if let token = try await GoogleSignInHelper.idToken() {
                try await auth.signInWithGoogle(idToken: token)
            }
        }
    }
    #endif

    private func run(_ operation: () async throws -> Void) async {
        isBusy = true
        defer { isBusy = false }
        do {
            try await operation()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
