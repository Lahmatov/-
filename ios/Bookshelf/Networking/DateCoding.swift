import Foundation

enum DateCoding {
    /// Сервер отдаёт ISO 8601 с миллисекундами ("2026-10-01T10:00:00.000Z").
    static func decode(_ decoder: Decoder) throws -> Date {
        let container = try decoder.singleValueContainer()
        let string = try container.decode(String.self)
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: string) ?? ISO8601DateFormatter().date(from: string) {
            return date
        }
        throw DecodingError.dataCorruptedError(in: container, debugDescription: "Неизвестный формат даты: \(string)")
    }

    /// Даты начала/окончания чтения — это календарные дни. Храним и показываем их в UTC,
    /// как и веб-версия, чтобы день не «съезжал» из-за часового пояса.
    static let utcCalendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        return calendar
    }()

    static func dayString(_ date: Date) -> String {
        let c = utcCalendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    /// Названия месяцев на языке интерфейса (именительный падеж: «январь», «янв.»).
    static func monthNames(short: Bool = false) -> [String] {
        let formatter = DateFormatter()
        formatter.locale = AppLanguage.locale
        return (short ? formatter.shortStandaloneMonthSymbols : formatter.standaloneMonthSymbols) ?? []
    }

    static func formatDay(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = AppLanguage.locale
        formatter.timeZone = utcCalendar.timeZone
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}
