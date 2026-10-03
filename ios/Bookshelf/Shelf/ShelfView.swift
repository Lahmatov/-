import SwiftUI

struct ShelfView: View {
    @Environment(AuthStore.self) private var auth
    @State private var selected: ReadingStatus = .reading
    @State private var genre: String?
    @State private var shelf: Shelf?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    statusChips
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }
                Section {
                    if let shelf {
                        let items = shelf.items.filter {
                            $0.entry.status == selected && (genre == nil || ($0.genres ?? []).contains(genre!))
                        }
                        if items.isEmpty {
                            ContentUnavailableView(
                                "Здесь пусто",
                                systemImage: selected.systemImage,
                                description: Text("Найдите книгу во вкладке «Поиск»")
                            )
                            .listRowBackground(Color.clear)
                        } else {
                            ForEach(items) { item in
                                NavigationLink(value: BookRoute(id: item.book.id)) {
                                    BookRowView(book: item.book, entry: item.entry)
                                }
                            }
                        }
                    } else if errorMessage == nil {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .listRowBackground(Color.clear)
                    }
                }
            }
            .navigationTitle("Мои книги")
            .toolbar {
                if !shelfGenres.isEmpty {
                    Menu {
                        Picker("Жанр", selection: $genre) {
                            Text("Все жанры").tag(String?.none)
                            ForEach(shelfGenres) { g in
                                Text(g.name).tag(Optional(g.slug))
                            }
                        }
                    } label: {
                        Image(systemName: genre == nil ? "line.3.horizontal.decrease.circle" : "line.3.horizontal.decrease.circle.fill")
                    }
                    .accessibilityLabel("Фильтр по жанру")
                }
            }
            .appDestinations()
            // Перезагружаем при каждом появлении — например, после смены статуса на карточке книги.
            .task { await load() }
            .refreshable { await load() }
            .errorAlert($errorMessage)
        }
    }

    @State private var allGenres: [Genre] = []

    /// Жанры, которые есть у книг на полке.
    private var shelfGenres: [Genre] {
        let present = Set(shelf?.items.flatMap { $0.genres ?? [] } ?? [])
        return allGenres.filter { present.contains($0.slug) }
    }

    private var statusChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(ReadingStatus.allCases) { status in
                    let isSelected = status == selected
                    Button {
                        selected = status
                    } label: {
                        HStack(spacing: 4) {
                            Text(status.title)
                            Text("\(shelf?.count(status) ?? 0)")
                                .opacity(0.6)
                        }
                        .font(.subheadline)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(isSelected ? Color.accentColor : Color.secondary.opacity(0.15), in: Capsule())
                        .foregroundStyle(isSelected ? Color.black : Color.primary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 4)
        }
    }

    private func load() async {
        if allGenres.isEmpty { allGenres = (try? await auth.api.genres()) ?? [] }
        do {
            shelf = try await auth.api.shelf()
        } catch {
            if !Task.isCancelled { errorMessage = error.localizedDescription }
        }
    }
}
