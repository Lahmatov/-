import Foundation

enum Plural {
    /// Форма по языку интерфейса: в русском три формы, в английском — «one» и «other» (переводы форм one и many).
    static func localized(_ n: Int, _ one: String, _ few: String, _ many: String) -> String {
        if AppLanguage.isEnglish { return L(n == 1 ? one : many) }
        return ru(n, one, few, many)
    }

    /// Русское склонение по числу: 1 оценка, 2 оценки, 5 оценок.
    static func ru(_ n: Int, _ one: String, _ few: String, _ many: String) -> String {
        let mod10 = abs(n) % 10
        let mod100 = abs(n) % 100
        if mod10 == 1 && mod100 != 11 { return one }
        if (2...4).contains(mod10) && !(12...14).contains(mod100) { return few }
        return many
    }
}
