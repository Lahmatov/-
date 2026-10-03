import SwiftUI
import UIKit
import UserNotifications

/// Push-уведомления: разрешение, регистрация в APNs и передача токена серверу.
@MainActor
final class PushManager {
    static let shared = PushManager()
    private let tokenKey = "apnsDeviceToken"
    weak var api: APIClient?

    /// Вызывается после входа: спрашиваем разрешение (один раз) и регистрируемся в APNs.
    func enable(api: APIClient) async {
        self.api = api
        let center = UNUserNotificationCenter.current()
        let granted = (try? await center.requestAuthorization(options: [.alert, .badge, .sound])) ?? false
        if granted { UIApplication.shared.registerForRemoteNotifications() }
    }

    func didRegister(deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        UserDefaults.standard.set(token, forKey: tokenKey)
        Task { try? await api?.registerDevice(token: token) }
    }

    /// При выходе отвязываем устройство, чтобы уведомления не приходили чужому аккаунту.
    func disable(api: APIClient) async {
        if let token = UserDefaults.standard.string(forKey: tokenKey) {
            try? await api.unregisterDevice(token: token)
        }
    }

    func clearBadge() {
        UNUserNotificationCenter.current().setBadgeCount(0) { _ in }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Task { @MainActor in PushManager.shared.didRegister(deviceToken: deviceToken) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // Нет push-возможности (симулятор без настройки, бесплатный аккаунт разработчика) — работаем без push.
    }
}
