import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { READING_STATUSES, statusIcon, statusTitle, type Genre, type ReadingStatus } from "../../../api/models";
import { useAPI } from "../../../auth/AuthContext";
import { BookRow } from "../../../components/BookRow";
import { useTheme } from "../../../components/theme";
import { Empty, ErrorView, Loading, Row, Screen, Section, type IconName } from "../../../components/ui";
import { useActionSheet } from "../../../features/books/ActionSheet";
import { Chip } from "../../../features/books/Chip";
import { useRefresh } from "../../../features/books/useRefresh";
import { useReloadOnFocus } from "../../../features/books/useReloadOnFocus";
import { L } from "../../../i18n";
import { showError } from "../../../lib/alerts";
import { routes } from "../../../lib/routes";
import { useLoad } from "../../../lib/useLoad";

export default function ShelfScreen() {
  const api = useAPI();
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useTheme();
  const [selected, setSelected] = useState<ReadingStatus>("READING");
  const [genre, setGenre] = useState<string | null>(null);
  const [allGenres, setAllGenres] = useState<Genre[]>([]);
  const state = useLoad(() => api.shelf(), [api]);
  // Перезагружаем при каждом возвращении — например, после смены статуса на карточке книги.
  useReloadOnFocus(state.reload);
  const refresh = useRefresh(state.reload);
  const { sheet, show } = useActionSheet();
  const shelf = state.data;

  useEffect(() => {
    let cancelled = false;
    api
      .genres()
      .then((genres) => !cancelled && setAllGenres(genres))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [api]);

  // Ошибка обновления, когда полка уже показана (без данных — экран ошибки с «Повторить»).
  const hasData = shelf !== undefined;
  useEffect(() => {
    if (state.error && hasData) showError(state.error);
  }, [state.error, hasData]);

  /** Жанры, которые есть у книг на полке. */
  const shelfGenres = useMemo(() => {
    const present = new Set((shelf?.items ?? []).flatMap((i) => i.genres ?? []));
    return allGenres.filter((g) => present.has(g.slug));
  }, [shelf, allGenres]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: L("Мои книги"),
      headerRight:
        shelfGenres.length > 0
          ? () => (
              <Pressable
                onPress={() =>
                  show({
                    title: L("Жанр"),
                    options: [
                      { title: (genre == null ? "✓ " : "") + L("Все жанры"), onPress: () => setGenre(null) },
                      ...shelfGenres.map((g) => ({ title: (genre === g.slug ? "✓ " : "") + g.name, onPress: () => setGenre(g.slug) })),
                    ],
                  })
                }
                hitSlop={8}
                style={{ marginHorizontal: 16 }}
                accessibilityRole="button"
                accessibilityLabel={L("Фильтр по жанру")}
                accessibilityValue={{ text: shelfGenres.find((g) => g.slug === genre)?.name ?? L("Все жанры") }}
                testID="shelf-genre-filter"
              >
                <Ionicons name={genre == null ? "filter-circle-outline" : "filter-circle"} size={24} color={theme.accent} />
              </Pressable>
            )
          : undefined,
    });
  }, [navigation, shelfGenres, genre, show, theme.accent]);

  // Жанр пропал с полки (книгу убрали) — сбрасываем фильтр, иначе список будет пустым без видимой причины.
  useEffect(() => {
    if (genre != null && shelf && !shelfGenres.some((g) => g.slug === genre) && allGenres.length > 0) setGenre(null);
  }, [genre, shelf, shelfGenres, allGenres]);

  const items = (shelf?.items ?? []).filter((i) => i.entry.status === selected && (genre == null || (i.genres ?? []).includes(genre)));

  return (
    <View style={{ flex: 1 }}>
      {shelf === undefined && state.error ? (
        <ErrorView message={state.error} onRetry={() => void state.reload()} />
      ) : (
        <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="shelf" contentStyle={{ paddingTop: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {READING_STATUSES.map((status) => (
              <Chip
                key={status}
                title={statusTitle(status)}
                detail={String(shelf?.counts[status] ?? 0)}
                selected={status === selected}
                onPress={() => setSelected(status)}
                testID={`shelf-status-${status}`}
              />
            ))}
          </ScrollView>
          {shelf === undefined ? (
            <Loading />
          ) : items.length === 0 ? (
            <Empty icon={statusIcon(selected) as IconName} title={L("Здесь пусто")} message={L("Найдите книгу во вкладке «Поиск»")} />
          ) : (
            <Section>
              {items.map((item, i) => (
                <Row
                  key={item.book.id}
                  first={i === 0}
                  onPress={() => router.push(routes.book(item.book.id))}
                  testID={`shelf-item-${item.book.id}`}
                >
                  <BookRow book={item.book} entry={item.entry} />
                </Row>
              ))}
            </Section>
          )}
        </Screen>
      )}
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
});
