import Foundation

enum AppConfig {
    /// Адрес сервера из Info.plist (задаётся в Config/*.xcconfig).
    /// В Release разрешён только HTTPS: по этому адресу уходит токен входа.
    static let apiBaseURL: URL = {
        let value = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String
        if let url = value.flatMap(URL.init(string:)), url.host != nil {
            #if !DEBUG
            precondition(url.scheme == "https", "API_BASE_URL в Release должен быть https://")
            #endif
            return url
        }
        #if DEBUG
        return URL(string: "http://localhost:3000")!
        #else
        fatalError("API_BASE_URL не задан в Config/Release.xcconfig")
        #endif
    }()

    /// Client ID для Google Sign-In; nil — вход через Google не настроен.
    static var googleClientID: String? {
        let value = Bundle.main.object(forInfoDictionaryKey: "GIDClientID") as? String
        return value?.isEmpty == false ? value : nil
    }
}
