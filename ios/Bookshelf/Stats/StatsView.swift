import Charts
import SwiftUI

struct StatsView: View {
    @Environment(AuthStore.self) private var auth
    @State private var year = Calendar.current.component(.year, from: Date())
    @State private var stats: YearStats?
    @State private var selectedMonth: String?
    @State private var isEditingGoal = false
    @State private var goalText = ""
    @State private var errorMessage: String?

    private static let months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
    private static let monthsFull = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
                                     "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]

    var body: some View {
        NavigationStack {
            Group {
                if let stats {
                    content(stats)
                } else if errorMessage == nil {
                    ProgressView()
                } else {
                    ContentUnavailableView("Не удалось загрузить", systemImage: "chart.bar")
                }
            }
            .navigationTitle("Итоги")
            .toolbar {
                if let years = stats?.years, years.count > 1 {
                    Picker("Год", selection: $year) {
                        ForEach(years, id: \.self) { Text(String($0)).tag($0) }
                    }
                    .pickerStyle(.menu)
                }
            }
            .task(id: year) { await load() }
            .refreshable { await load() }
            .alert("Цель на \(String(year))", isPresented: $isEditingGoal) {
                TextField("Сколько книг", text: $goalText)
                    .keyboardType(.numberPad)
                Button("Сохранить") { Task { await saveGoal(Int(goalText)) } }
                if stats?.goal != nil {
                    Button("Убрать цель", role: .destructive) { Task { await saveGoal(nil) } }
                }
                Button("Отмена", role: .cancel) {}
            } message: {
                Text("Сколько книг вы хотите прочитать за год?")
            }
            .errorAlert($errorMessage)
        }
    }

    private func content(_ stats: YearStats) -> some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("\(stats.readCount)")
                            .font(.system(size: 44, weight: .black))
                        if let goal = stats.goal {
                            Text("/ \(goal)")
                                .font(.title.bold())
                                .foregroundStyle(.secondary)
                        }
                    }
                    Text(summary(stats))
                        .foregroundStyle(.secondary)
                    if let goal = stats.goal {
                        ProgressView(value: min(Double(stats.readCount), Double(goal)), total: Double(goal))
                            .tint(.accentColor)
                    }
                    Button(stats.goal == nil ? "Поставить цель на год" : "Изменить цель") {
                        goalText = stats.goal.map(String.init) ?? ""
                        isEditingGoal = true
                    }
                    .buttonStyle(.bordered)
                    .padding(.top, 4)
                }
                .padding(.vertical, 6)
            }

            Section {
                NavigationLink {
                    WrappedView(year: stats.year)
                } label: {
                    Label("Итоги \(String(stats.year)) картинкой", systemImage: "sparkles")
                }
            }

            Section {
                LabeledContent("Средняя оценка", value: stats.avgRating.map { String(format: "%.1f", $0) } ?? "—")
                LabeledContent("Читаю сейчас", value: "\(stats.readingNow)")
            }

            Section("Прочитано по месяцам") {
                if stats.readCount == 0 {
                    Text("В \(String(stats.year)) году пока нет прочитанных книг")
                        .foregroundStyle(.secondary)
                } else {
                    monthChart(stats.byMonth)
                }
            }
        }
    }

    private func monthChart(_ byMonth: [Int]) -> some View {
        let peak = byMonth.indices.max { byMonth[$0] < byMonth[$1] } ?? 0
        let selectedIndex = selectedMonth.flatMap { Self.months.firstIndex(of: $0) }
        return VStack(alignment: .leading, spacing: 8) {
            // Подсказка вместо наведения: коснитесь или проведите пальцем по графику.
            Text(selectedIndex.map { "\(Self.monthsFull[$0]): \(byMonth[$0]) \(Plural.ru(byMonth[$0], "книга", "книги", "книг"))" }
                 ?? "Коснитесь столбца, чтобы увидеть число")
                .font(.caption)
                .foregroundStyle(.secondary)
            Chart {
                ForEach(Array(byMonth.enumerated()), id: \.offset) { index, count in
                    BarMark(
                        x: .value("Месяц", Self.months[index]),
                        y: .value("Книги", count),
                        width: .ratio(0.6)
                    )
                    .foregroundStyle(Color.accentColor.opacity(selectedIndex == nil || selectedIndex == index ? 1 : 0.4))
                    .cornerRadius(4)
                    .annotation(position: .top) {
                        if index == peak && count > 0 && selectedIndex == nil {
                            Text("\(count)").font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .chartXSelection(value: $selectedMonth)
            .chartYAxis {
                AxisMarks(values: .automatic(desiredCount: 3)) { _ in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                    AxisValueLabel()
                }
            }
            .frame(height: 180)
        }
        .padding(.vertical, 6)
    }

    private func summary(_ stats: YearStats) -> String {
        let books = Plural.ru(stats.readCount, "книга прочитана", "книги прочитано", "книг прочитано")
        let done = stats.goal.map { stats.readCount >= $0 } ?? false
        return "\(books) в \(String(stats.year)) году" + (done ? " — цель выполнена!" : "")
    }

    private func load() async {
        do {
            stats = try await auth.api.stats(year: year)
        } catch {
            if !Task.isCancelled { errorMessage = error.localizedDescription }
        }
    }

    private func saveGoal(_ target: Int?) async {
        if let target, !(1...1000).contains(target) {
            errorMessage = "Цель — от 1 до 1000 книг"
            return
        }
        do {
            stats = try await auth.api.setGoal(year: year, target: target)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
