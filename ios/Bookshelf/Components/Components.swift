import SwiftUI
#if canImport(NukeUI)
import Nuke
import NukeUI
#endif

enum CoverCache {
    /// Обложки кэшируются на диске (Nuke), поэтому полка с картинками открывается и без сети.
    static func configure() {
        #if canImport(NukeUI)
        ImagePipeline.shared = ImagePipeline(configuration: .withDataCache)
        #endif
    }
}

struct BookCoverView: View {
    let url: URL?
    let title: String
    var width: CGFloat = 48

    var body: some View {
        cover
        .frame(width: width, height: width * 1.5)
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .accessibilityHidden(true)
    }

    @ViewBuilder
    private var cover: some View {
        #if canImport(NukeUI)
        LazyImage(url: url) { state in
            if let image = state.image {
                image.resizable().scaledToFill()
            } else {
                placeholder
            }
        }
        #else
        AsyncImage(url: url) { phase in
            if let image = phase.image {
                image.resizable().scaledToFill()
            } else {
                placeholder
            }
        }
        #endif
    }

    private var placeholder: some View {
        ZStack {
            Color.secondary.opacity(0.15)
            Text(title)
                .font(.system(size: max(7, width / 7)))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(3)
        }
    }
}

struct BookRowView: View {
    let book: Book
    var entry: ShelfEntry?

    var body: some View {
        HStack(spacing: 12) {
            BookCoverView(url: book.coverUrl, title: book.title)
            VStack(alignment: .leading, spacing: 3) {
                Text(book.title)
                    .font(.headline)
                    .lineLimit(2)
                Text(book.subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                if let rating = entry?.rating {
                    Label("\(rating)/10", systemImage: "star.fill")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
                if let progress = entry?.progress(pageCount: book.pageCount) {
                    ProgressView(value: progress)
                        .tint(.accentColor)
                        .frame(maxWidth: 140)
                        .accessibilityLabel(L("Прочитано %@%%", String(Int(progress * 100))))
                }
                if let dates = entry.flatMap(Self.dates) {
                    Text(dates)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 2)
    }

    private static func dates(_ entry: ShelfEntry) -> String? {
        let parts = [
            entry.startedAt.map { L("Начал %@", DateCoding.formatDay($0)) },
            entry.finishedAt.map { L("Закончил %@", DateCoding.formatDay($0)) },
        ].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}

/// Оценка от 1 до 10. Повторное нажатие на выбранную звезду снимает оценку.
struct RatingPicker: View {
    @Binding var rating: Int?

    var body: some View {
        HStack(spacing: 2) {
            ForEach(1...10, id: \.self) { value in
                let filled = value <= (rating ?? 0)
                Image(systemName: filled ? "star.fill" : "star")
                    .font(.title3)
                    .foregroundStyle(filled ? Color.orange : Color.secondary)
                    .frame(maxWidth: .infinity)
                    .contentShape(Rectangle())
                    .onTapGesture { rating = rating == value ? nil : value }
                    .accessibilityLabel("\(value) из 10")
                    .accessibilityAddTraits(rating == value ? [.isButton, .isSelected] : .isButton)
            }
        }
        .sensoryFeedback(.selection, trigger: rating)
    }
}

extension View {
    /// Показывает алерт, пока в message есть текст.
    func errorAlert(_ message: Binding<String?>, title: LocalizedStringKey = "Ошибка") -> some View {
        alert(
            title,
            isPresented: Binding(
                get: { message.wrappedValue != nil },
                set: { if !$0 { message.wrappedValue = nil } }
            )
        ) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(message.wrappedValue ?? "")
        }
    }
}
