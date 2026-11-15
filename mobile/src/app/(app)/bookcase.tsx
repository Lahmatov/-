import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { ShelfItem } from "../../api/models";
import { useAPI } from "../../auth/AuthContext";
import { Button, Empty, ErrorView, Loading } from "../../components/ui";
import { useTheme, type Theme } from "../../components/theme";
import { bookcaseSections, booksPerShelf, bookSeed, pagesRead } from "../../features/bookcase/layout";
import { useReloadOnFocus } from "../../features/books/useReloadOnFocus";
import { L, plural } from "../../i18n";
import { useLoad } from "../../lib/useLoad";
import { routes } from "../../lib/routes";

const SIDE = 16;
const GAP = 6;
const MAX_HEIGHT = 96;
/** Цвета корешков книг без обложки. */
const SPINES = ["#8C2F39", "#2F5D62", "#3D405B", "#6D597A", "#5B8E7D", "#9C6644", "#264653", "#7F5539"];

/** Виртуальная полка: прочитанные книги стоят на деревянных полках по годам. */
export default function BookcaseScreen() {
  const api = useAPI();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const state = useLoad(() => api.shelf("READ"), [api]);
  const [refreshing, setRefreshing] = useState(false);
  useReloadOnFocus(state.reload);

  const rowWidth = width - SIDE * 2 - 16;
  const perShelf = booksPerShelf(rowWidth);
  const bookWidth = Math.min(64, (rowWidth - GAP * (perShelf - 1)) / perShelf);
  const items = state.data?.items ?? [];
  const sections = useMemo(() => bookcaseSections(items, perShelf), [items, perShelf]);
  const total = sections.reduce((n, s) => n + s.count, 0);
  const pages = useMemo(() => pagesRead(items), [items]);

  async function refresh() {
    setRefreshing(true);
    await state.reload();
    setRefreshing(false);
  }

  const title = <Stack.Screen options={{ title: L("Моя книжная полка") }} />;
  if (state.data === undefined) {
    return (
      <>
        {title}
        {state.error ? <ErrorView message={state.error} onRetry={() => void state.reload()} /> : <Loading />}
      </>
    );
  }

  return (
    <>
      {title}
      <ScrollView
        testID="bookcase"
        style={{ flex: 1, backgroundColor: theme.groupedBackground }}
        contentContainerStyle={{ paddingVertical: 16, gap: 20 }}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      >
        {total === 0 ? (
          <Empty icon="library-outline" title={L("Полка пока пустая")} message={L("Отметьте книгу «Прочитал» — она встанет сюда.")}>
            <Button title={L("Найти книгу")} icon="search-outline" onPress={() => router.navigate("/search")} />
          </Empty>
        ) : (
          <>
            <Text style={[styles.summary, { color: theme.secondaryText }]} accessibilityRole="header">
              {total} {plural(total, "книга", "книги", "книг")}
              {pages > 0 ? ` · ${pages.toLocaleString()} ${plural(pages, "страница", "страницы", "страниц")}` : ""}
            </Text>
            {sections.map((section) => (
              <View key={String(section.year)} style={{ gap: 8 }}>
                <Text style={[styles.year, { color: theme.text }]} accessibilityRole="header">
                  {section.year ?? L("Без даты")}
                  <Text style={{ color: theme.secondaryText, fontWeight: "400" }}>
                    {"  "}
                    {section.count} {plural(section.count, "книга", "книги", "книг")}
                  </Text>
                </Text>
                <View style={[styles.case, { backgroundColor: theme.woodBack, borderColor: theme.woodEdge }]}>
                  {section.rows.map((row, i) => (
                    <View key={i}>
                      <View style={[styles.books, { gap: GAP, minHeight: MAX_HEIGHT }]}>
                        {row.map((item) => (
                          <ShelfBook key={item.book.id} item={item} width={bookWidth} theme={theme} onPress={() => router.push(routes.book(item.book.id))} />
                        ))}
                      </View>
                      <View style={[styles.plank, { backgroundColor: theme.wood, borderBottomColor: theme.woodEdge }]} />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </>
  );
}

function ShelfBook({ item, width, theme, onPress }: { item: ShelfItem; width: number; theme: Theme; onPress: () => void }) {
  const [failed, setFailed] = useState(false);
  const seed = bookSeed(item.book.id);
  // Книги чуть разной высоты — так полка выглядит живой.
  const height = Math.round(Math.min(MAX_HEIGHT, width * 1.5) * (0.86 + seed * 0.14));
  const showCover = !!item.book.coverUrl && !failed;
  const rating = item.entry.rating;
  const label = [item.book.title, item.book.author, rating != null ? `${rating}/10` : null].filter(Boolean).join(", ");
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => pressed && { transform: [{ translateY: -4 }] }}>
      <View
        style={[
          styles.book,
          { width, height, backgroundColor: showCover ? theme.placeholder : SPINES[Math.floor(seed * SPINES.length)] },
        ]}
      >
        {showCover ? (
          <Image source={{ uri: item.book.coverUrl! }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" onError={() => setFailed(true)} />
        ) : (
          <Text style={styles.spineTitle} numberOfLines={6}>
            {item.book.title}
          </Text>
        )}
        {rating != null && rating >= 9 && (
          <View style={[styles.star, { backgroundColor: theme.star }]}>
            <Ionicons name="star" size={9} color="#fff" />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summary: { fontSize: 15, paddingHorizontal: SIDE + 4 },
  year: { fontSize: 20, fontWeight: "700", paddingHorizontal: SIDE + 4 },
  case: { marginHorizontal: SIDE, borderRadius: 6, borderWidth: 2, paddingHorizontal: 6, paddingTop: 10 },
  books: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 2 },
  plank: { height: 10, borderBottomWidth: 4, borderRadius: 2, marginBottom: 12, marginHorizontal: -6 },
  book: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 3,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 1, height: 1 },
    elevation: 2,
  },
  spineTitle: { color: "#FFFFFF", fontSize: 9, fontWeight: "600", textAlign: "center", padding: 3 },
  star: { position: "absolute", top: 3, right: 3, width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center" },
});
