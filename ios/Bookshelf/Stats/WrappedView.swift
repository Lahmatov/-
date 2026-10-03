import SwiftUI

/// «Итоги года» карточкой, которую можно отправить в соцсети картинкой.
struct WrappedView: View {
    let year: Int

    @Environment(AuthStore.self) private var auth
    @Environment(\.displayScale) private var displayScale
    @State private var wrapped: Wrapped?
    @State private var image: Image?
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            if let wrapped {
                VStack(spacing: 20) {
                    WrappedCard(wrapped: wrapped)
                        .aspectRatio(4 / 5, contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: 24))
                        .padding(.horizontal)
                    if let image {
                        ShareLink(item: image, preview: SharePreview(L("Итоги %@", String(year)), image: image)) {
                            Label("Поделиться картинкой", systemImage: "square.and.arrow.up")
                                .frame(maxWidth: .infinity, minHeight: 38)
                        }
                        .buttonStyle(.borderedProminent)
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            } else if errorMessage == nil {
                ProgressView().padding(.top, 80)
            }
        }
        .navigationTitle(L("Итоги %@", String(year)))
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .errorAlert($errorMessage)
    }

    private func load() async {
        do {
            let result = try await auth.api.wrapped(year: year)
            wrapped = result
            // Картинка 1080×1350 — как для сторис/постов.
            let renderer = ImageRenderer(content: WrappedCard(wrapped: result).frame(width: 360, height: 450))
            renderer.scale = 3
            if let uiImage = renderer.uiImage { image = Image(uiImage: uiImage) }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct WrappedCard: View {
    let wrapped: Wrapped

    private static var months: [String] { DateCoding.monthNames() }

    private var facts: [(String, String)] {
        var result: [(String, String)] = []
        if wrapped.pagesRead > 0 { result.append((L("страниц прочитано"), wrapped.pagesRead.formatted())) }
        if let avg = wrapped.avgRating { result.append((L("средняя оценка"), "★ \(avg.formatted())")) }
        if let author = wrapped.topAuthor { result.append((L("любимый автор"), author.value)) }
        if let genre = wrapped.topGenre { result.append((L("любимый жанр"), genre.name)) }
        if let best = wrapped.bestBook { result.append((L("лучшая книга"), "«\(best.book.title)» — \(best.rating)/10")) }
        if let month = wrapped.busiestMonth, Self.months.indices.contains(month) {
            result.append((L("самый книжный месяц"), Self.months[month]))
        }
        return Array(result.prefix(5))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(L("ИТОГИ %@", String(wrapped.year)))
                .font(.caption.bold())
                .kerning(3)
            VStack(alignment: .leading, spacing: 0) {
                Text("\(wrapped.booksRead)")
                    .font(.system(size: 88, weight: .black))
                Text(Plural.localized(wrapped.booksRead, "книга прочитана", "книги прочитано", "книг прочитано"))
                    .font(.title3.bold())
            }
            Spacer(minLength: 0)
            ForEach(facts, id: \.0) { label, value in
                VStack(alignment: .leading, spacing: 1) {
                    Text(label).font(.caption2).opacity(0.7)
                    Text(value).font(.headline).lineLimit(2)
                }
            }
            Spacer(minLength: 0)
            Text(L("%@ · Книжная полка", wrapped.name)).font(.caption).opacity(0.7)
        }
        .foregroundStyle(.black)
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(LinearGradient(colors: [Color.orange, Color(red: 0.76, green: 0.25, blue: 0.05)],
                                   startPoint: .topLeading, endPoint: .bottomTrailing))
    }
}
