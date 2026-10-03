import SwiftUI
import WidgetKit

struct SnapshotEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
    let isPlaceholder: Bool
}

struct SnapshotProvider: TimelineProvider {
    func placeholder(in context: Context) -> SnapshotEntry {
        SnapshotEntry(date: Date(), snapshot: .placeholder, isPlaceholder: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
        completion(entry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
        // Приложение само просит обновить виджет после изменений; раз в несколько часов — на всякий случай.
        completion(Timeline(entries: [entry()], policy: .after(Date().addingTimeInterval(4 * 3600))))
    }

    private func entry() -> SnapshotEntry {
        if let snapshot = WidgetSnapshot.load() {
            return SnapshotEntry(date: Date(), snapshot: snapshot, isPlaceholder: false)
        }
        return SnapshotEntry(date: Date(), snapshot: .placeholder, isPlaceholder: true)
    }
}

/// Маленький: цель на год. Средний: цель и что читаю сейчас.
struct ReadingWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry

    var body: some View {
        Group {
            if family == .systemSmall {
                goal
            } else {
                HStack(spacing: 16) {
                    goal.frame(maxWidth: 110)
                    reading
                }
            }
        }
        .redacted(reason: entry.isPlaceholder ? .placeholder : [])
        .containerBackground(for: .widget) { Color(.systemBackground) }
    }

    private var goal: some View {
        let s = entry.snapshot
        let progress = s.goal.map { min(1, Double(s.readThisYear) / Double(max($0, 1))) } ?? 0
        return VStack(spacing: 6) {
            ZStack {
                Circle().stroke(Color.orange.opacity(0.2), lineWidth: 8)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(Color.orange, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                VStack(spacing: 0) {
                    Text("\(s.readThisYear)").font(.title.bold())
                    if let goal = s.goal {
                        Text("из \(goal)").font(.caption2).foregroundStyle(.secondary)
                    }
                }
            }
            Text(verbatim: "\(s.year)").font(.caption.bold()).foregroundStyle(.secondary)
        }
    }

    private var reading: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Читаю").font(.caption.bold()).foregroundStyle(.secondary)
            if entry.snapshot.reading.isEmpty {
                Text("Ничего — самое время начать").font(.caption)
            }
            ForEach(entry.snapshot.reading.prefix(2)) { book in
                VStack(alignment: .leading, spacing: 2) {
                    Text(book.title).font(.subheadline.bold()).lineLimit(1)
                    Text(book.author).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                    if let progress = book.progress {
                        ProgressView(value: progress).tint(.orange)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ReadingWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ReadingWidget", provider: SnapshotProvider()) { entry in
            ReadingWidgetView(entry: entry)
        }
        .configurationDisplayName("Книжная полка")
        .description("Цель на год и книги, которые вы читаете.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct BookshelfWidgets: WidgetBundle {
    var body: some Widget {
        ReadingWidget()
    }
}
