import Foundation

/// ISBN со штрихкода: проверка контрольной цифры и приведение к ISBN-13 (так же, как lib/isbn.ts на сервере).
enum ISBN {
    static func normalize(_ input: String) -> String? {
        var s = input.uppercased()
        if s.hasPrefix("ISBN") { s.removeFirst(4) }
        let chars = s.filter { !" -:".contains($0) }
        let digits = chars.compactMap(\.wholeNumberValue)

        if chars.count == 13, digits.count == 13, chars.hasPrefix("978") || chars.hasPrefix("979") {
            return checksum13(digits) == 0 ? String(chars) : nil
        }
        if chars.count == 10, digits.count >= 9, digits.count == (chars.last == "X" ? 9 : 10) {
            let values = digits + (chars.last == "X" ? [10] : [])
            let sum = values.enumerated().reduce(0) { $0 + $1.element * (10 - $1.offset) }
            guard sum % 11 == 0 else { return nil }
            let body = [9, 7, 8] + digits.prefix(9)
            let check = (10 - checksum13(body + [0]) % 10) % 10
            return (body + [check]).map(String.init).joined()
        }
        return nil
    }

    private static func checksum13(_ digits: [Int]) -> Int {
        digits.enumerated().reduce(0) { $0 + $1.element * ($1.offset % 2 == 0 ? 1 : 3) } % 10
    }
}
