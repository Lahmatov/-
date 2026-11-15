import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { RatedBook } from "../../api/models";
import { BookRow } from "../../components/BookRow";
import { useTheme } from "../../components/theme";
import { L, plural } from "../../i18n";

/** Книга со средней оценкой читателей и числом оценок справа. */
export function RatedBookRow({ item }: { item: RatedBook }) {
  const theme = useTheme();
  const avg = item.avgRating;
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <BookRow book={item.book} />
      </View>
      {avg != null && (
        <View
          style={styles.rating}
          accessible
          accessibilityLabel={L("Средняя оценка") + ` ${avg.toFixed(1)}, ${item.ratingsCount} ${plural(item.ratingsCount, "оценка", "оценки", "оценок")}`}
        >
          <View style={styles.avg}>
            <Ionicons name="star" size={13} color={theme.star} />
            <Text style={[styles.avgText, { color: theme.star }]}>{avg.toFixed(1)}</Text>
          </View>
          <Text style={[styles.count, { color: theme.secondaryText }]}>{item.ratingsCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rating: { alignItems: "flex-end" },
  avg: { flexDirection: "row", alignItems: "center", gap: 3 },
  avgText: { fontSize: 15, fontWeight: "700" },
  count: { fontSize: 11 },
});
