import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TextInput, View } from "react-native";
import type { Quote } from "../../api/models";
import { useAPI } from "../../auth/AuthContext";
import { Empty, ErrorView, Loading, Row } from "../../components/ui";
import { useTheme } from "../../components/theme";
import { L } from "../../i18n";
import { attempt, showError } from "../../lib/alerts";
import { routes } from "../../lib/routes";
import { errorMessage } from "../../api/client";
import { QuoteRow } from "../../features/quotes/QuoteRow";
import { shareQuote, showQuoteActions } from "../../features/quotes/quoteActions";

/** Все мои цитаты (постранично), с поиском по тексту, названию книги и автору. */
export default function MyQuotesScreen() {
  const api = useAPI();
  const theme = useTheme();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const loadingMore = useRef(false);
  // Ответ устаревшего запроса (перезагрузка во время подгрузки следующей страницы) отбрасывается.
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const current = ++generation.current;
    try {
      const page = await api.myQuotes();
      if (current !== generation.current) return;
      setQuotes(page.quotes);
      setNextCursor(page.nextCursor);
      setLoaded(true);
      setLoadError(null);
    } catch (error) {
      if (current !== generation.current) return;
      if (loaded) showError(error);
      else setLoadError(errorMessage(error));
    }
  }, [api, loaded]);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore.current || query.trim()) return;
    loadingMore.current = true;
    const current = generation.current;
    try {
      const page = await api.myQuotes(nextCursor);
      if (current !== generation.current) return;
      setQuotes((list) => {
        const seen = new Set(list.map((q) => q.id));
        return [...list, ...page.quotes.filter((q) => !seen.has(q.id))];
      });
      setNextCursor(page.nextCursor);
    } catch (error) {
      if (current !== generation.current) return;
      setNextCursor(null);
      showError(error);
    } finally {
      loadingMore.current = false;
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return quotes;
    return quotes.filter(
      (x) =>
        x.text.toLocaleLowerCase().includes(q) ||
        (x.book?.title.toLocaleLowerCase().includes(q) ?? false) ||
        (x.book?.author.toLocaleLowerCase().includes(q) ?? false),
    );
  }, [quotes, query]);

  const remove = (quote: Quote) => {
    const drop = () => setQuotes((list) => list.filter((q) => q.id !== quote.id));
    void attempt(async () => {
      await api.deleteQuote(quote.id);
      drop();
    }, drop);
  };

  const title = <Stack.Screen options={{ title: L("Мои цитаты") }} />;
  if (!loaded) {
    return (
      <>
        {title}
        {loadError ? <ErrorView message={loadError} onRetry={() => void reload()} /> : <Loading />}
      </>
    );
  }

  return (
    <>
      {title}
      <FlatList
        style={{ flex: 1, backgroundColor: theme.groupedBackground }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        data={filtered}
        keyExtractor={(q) => q.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          quotes.length > 0 ? (
            <View style={[styles.search, { backgroundColor: theme.placeholder }]}>
              <Ionicons name="search" size={16} color={theme.secondaryText} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={L("Поиск")}
                placeholderTextColor={theme.secondaryText}
                clearButtonMode="while-editing"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel={L("Поиск")}
                style={[styles.searchInput, { color: theme.text }]}
              />
            </View>
          ) : undefined
        }
        renderItem={({ item, index }) => {
          const book = item.book ?? null;
          return (
            <View style={[styles.card, { backgroundColor: theme.card }, index === 0 && styles.cardTop, index === filtered.length - 1 && styles.cardBottom]}>
              <Row
                first={index === 0}
                chevron={!!book}
                onPress={book ? () => router.push(routes.book(book.id)) : undefined}
                onLongPress={() => showQuoteActions(item, { onShare: () => void shareQuote(item, book), onDelete: () => remove(item) })}
              >
                <QuoteRow quote={item} showBook />
              </Row>
            </View>
          );
        }}
        ListEmptyComponent={
          quotes.length === 0 ? (
            <Empty
              icon="chatbox-ellipses-outline"
              title={L("Цитат пока нет")}
              message={L("Добавляйте их на странице книги или импортируйте выделения из Kindle в профиле.")}
            />
          ) : (
            <Empty icon="search" title={L("Ничего не найдено")} />
          )
        }
        ListFooterComponent={nextCursor && !query.trim() ? <ActivityIndicator style={{ marginVertical: 16 }} /> : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingHorizontal: 16 },
  card: { overflow: "hidden" },
  cardTop: { borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  cardBottom: { borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  search: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 10, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 8 },
});
