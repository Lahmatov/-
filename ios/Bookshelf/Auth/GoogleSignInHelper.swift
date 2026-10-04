#if canImport(GoogleSignIn)
import GoogleSignIn
import UIKit

enum GoogleSignInHelper {
    /// Показывает окно входа Google и возвращает ID-токен для сервера; nil — пользователь отменил вход.
    @MainActor
    static func idToken() async throws -> String? {
        guard let clientID = AppConfig.googleClientID, let presenter = topViewController() else { return nil }
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        do {
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
            return result.user.idToken?.tokenString
        } catch GIDSignInError.canceled {
            return nil
        }
    }

    @MainActor
    private static func topViewController() -> UIViewController? {
        let window = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow)
        var controller = window?.rootViewController
        while let presented = controller?.presentedViewController {
            controller = presented
        }
        return controller
    }
}
#endif
