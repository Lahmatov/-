import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { Quote } from "../../api/models";
import { useTheme } from "../../components/theme";
import { L } from "../../i18n";

/** Цитата: текст, заметка, автор или книга, страница, замок у личной. */
export function QuoteRow({ quote, showBook = false }: { quote: Quote; showBook?: boolean }) {
  const theme = useTheme();
  const source = showBook && quote.book ? quote.book.title : !quote.mine ? quote.user.name : null;
  return (
    <View style={styles.box}>
      <Text style={[styles.text, { color: theme.text }]} numberOfLines={8}>
        «{quote.text}»
      </Text>
      {!!quote.note && <Text style={[styles.note, { color: theme.secondaryText }]}>{quote.note}</Text>}
      <View style={styles.meta}>
        {source != null && (
          <Text style={[styles.caption, { color: theme.secondaryText, flexShrink: 1 }]} numberOfLines={1}>
            {source}
          </Text>
        )}
        {quote.page != null && <Text style={[styles.caption, { color: theme.secondaryText }]}>{L("стр. %@", String(quote.page))}</Text>}
        <View style={{ flex: 1 }} />
        {quote.mine && !quote.isPublic && (
          <Ionicons name="lock-closed" size={12} color={theme.secondaryText} accessibilityLabel={L("Видна только вам")} accessible />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 6, paddingVertical: 2 },
  text: { fontSize: 16, fontStyle: "italic" },
  note: { fontSize: 15 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  caption: { fontSize: 12 },
});
