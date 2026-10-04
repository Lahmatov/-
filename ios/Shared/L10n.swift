import Foundation

// SwiftUI сам переводит строковые литералы в Text, Button, Label и т. п. Строки, которые собираются в коде
// (статусы, подписи, сообщения), переводим через L(). Ключ — русский текст, перевод — в en.lproj/Localizable.strings.

func L(_ key: String) -> String {
    NSLocalizedString(key, comment: "")
}

/// Строка с подстановками: в ключе только %@, аргументы — строки.
func L(_ key: String, _ args: String...) -> String {
    String(format: NSLocalizedString(key, comment: ""), arguments: args)
}

enum AppLanguage {
    /// Язык интерфейса, который выбрала система для приложения (ru или en).
    static var code: String { Bundle.main.preferredLocalizations.first ?? "ru" }
    static var isEnglish: Bool { code.hasPrefix("en") }
    static var locale: Locale { Locale(identifier: isEnglish ? "en_US" : "ru_RU") }
}
