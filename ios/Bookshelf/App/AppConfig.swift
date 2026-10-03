import Foundation

enum AppConfig {
    /// Адрес сервера из Info.plist (задаётся в Config/*.xcconfig).
    static let apiBaseURL: URL = {
        let value = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String
        return value.flatMap(URL.init(string:)) ?? URL(string: "http://localhost:3000")!
    }()

    /// Client ID для Google Sign-In; nil — вход через Google не настроен.
    static var googleClientID: String? {
        let value = Bundle.main.object(forInfoDictionaryKey: "GIDClientID") as? String
        return value?.isEmpty == false ? value : nil
    }
}
