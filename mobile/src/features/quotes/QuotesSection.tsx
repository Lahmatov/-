import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { Book, Quote } from "../../api/models";
import { useAPI } from "../../auth/AuthContext";
import { Row, Section } from "../../components/ui";
import { useTheme } from "../../components/theme";
import { L } from "../../i18n";
import { attempt } from "../../lib/alerts";
import { routes } from "../../lib/routes";
import { useLoad } from "../../lib/useLoad";
import { QuoteRow } from "./QuoteRow";
import { shareQuote, showQuoteActions } from "./quoteActions";

/** Раздел «Цитаты» на странице книги: свои (нажатие — правка) и публичные чужие. */
export function QuotesSection({ bookId }: { bookId: string }) {
  const api = useAPI();
  const theme = useTheme();
  const state = useLoad(() => api.quotes(bookId), [api, bookId]);
  const { data: quotes, error, setData, reload } = state;

  // Перезагрузка при возврате на экран (например, после окна новой цитаты). Первый фокус — это
  // первая загрузка, её уже сделал useLoad.
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) void reload();
      focusedOnce.current = true;
    }, [reload]),
  );

  // Книга нужна только для подписи в «Поделиться»; страница книги её уже загрузила, ответ — из кэша.
  const share = async (quote: Quote) => {
    const book: Book | null = quote.book ?? (await api.book(bookId).then((d) => d.book).catch(() => null));
    await shareQuote(quote, book);
  };

  const remove = (quote: Quote) =>
    void attempt(
      async () => {
        await api.deleteQuote(quote.id);
        await reload();
      },
      () => setData((current) => current && { mine: current.mine.filter((q) => q.id !== quote.id), others: current.others }),
    );

  const actions = (quote: Quote, canDelete: boolean) =>
    showQuoteActions(quote, { onShare: () => void share(quote), onDelete: canDelete ? () => remove(quote) : undefined });

  return (
    <Section title={L("Цитаты")}>
      {quotes === undefined && !error && (
        <Row first>
          <ActivityIndicator />
        </Row>
      )}
      {quotes === undefined && !!error && (
        <Row first onPress={() => void reload()} chevron={false}>
          <Text style={[styles.body, { color: theme.secondaryText }]}>{error}</Text>
          <Text style={[styles.body, { color: theme.accent }]}>{L("Повторить")}</Text>
        </Row>
      )}
      {quotes?.mine.map((quote, i) => (
        <Row
          key={quote.id}
          first={i === 0}
          chevron={false}
          onPress={() => router.push(routes.quoteEdit({ bookId, quoteId: quote.id }))}
          onLongPress={() => actions(quote, true)}
         
          testID="myQuote"
        >
          <QuoteRow quote={quote} />
        </Row>
      ))}
      {quotes?.others.map((quote, i) => (
        <Row key={quote.id} first={i === 0 && quotes.mine.length === 0} chevron={false} onLongPress={() => actions(quote, false)}>
          <QuoteRow quote={quote} />
        </Row>
      ))}
      {quotes && quotes.mine.length === 0 && quotes.others.length === 0 && (
        <Row first>
          <Text style={[styles.body, { color: theme.secondaryText }]}>{L("Сохраняйте понравившиеся места из книги")}</Text>
        </Row>
      )}
      <Row onPress={() => router.push(routes.quoteEdit({ bookId }))} chevron={false} testID="addQuote" accessibilityLabel={L("Добавить цитату")}>
        <View style={styles.add}>
          <Ionicons name="add" size={20} color={theme.accent} />
          <Text style={[styles.body, { color: theme.accent }]}>{L("Добавить цитату")}</Text>
        </View>
      </Row>
    </Section>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16 },
  add: { flexDirection: "row", alignItems: "center", gap: 10 },
});
