import Foundation
#if canImport(Security)
import Security
#endif

/// Хранение токена в Keychain.
enum Keychain {
    private static let service = Bundle.main.bundleIdentifier ?? "Bookshelf"

    #if canImport(Security)
    static func save(_ value: String, for key: String) {
        delete(key)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
            kSecValueData as String: Data(value.utf8),
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    static func read(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(_ key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
    #else
    // Только для сборки моделей и клиента вне Apple-платформ (тесты на Linux).
    nonisolated(unsafe) private static var storage: [String: String] = [:]
    static func save(_ value: String, for key: String) { storage[key] = value }
    static func read(_ key: String) -> String? { storage[key] }
    static func delete(_ key: String) { storage[key] = nil }
    #endif
}
