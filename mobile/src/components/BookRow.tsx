import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { formatDay } from "../api/dates";
import { bookSubtitle, entryProgress, type Book, type ShelfEntry } from "../api/models";
import { L } from "../i18n";
import { BookCover } from "./BookCover";
import { ProgressBar } from "./ProgressBar";
import { useTheme } from "./theme";

export function BookRow({ book, entry, trailing }: { book: Book; entry?: ShelfEntry | null; trailing?: string }) {
  const theme = useTheme();
  const progress = entry ? entryProgress(entry, book.pageCount) : null;
  const dates = entry ? entryDates(entry) : null;
  return (
    <View style={styles.row}>
      <BookCover url={book.coverUrl} title={book.title} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]} numberOfLines={1}>
          {bookSubtitle(book)}
        </Text>
        {entry?.rating != null && (
          <View style={styles.rating}>
            <Ionicons name="star" size={12} color={theme.star} />
            <Text style={[styles.caption, { color: theme.star }]}>{entry.rating}/10</Text>
          </View>
        )}
        {progress != null && (
          <View style={{ maxWidth: 140 }} accessibilityLabel={L("Прочитано %@%%", String(Math.round(progress * 100)))}>
            <ProgressBar value={progress} />
          </View>
        )}
        {dates && <Text style={[styles.caption, { color: theme.secondaryText }]}>{dates}</Text>}
        {trailing && <Text style={[styles.caption, { color: theme.secondaryText }]}>{trailing}</Text>}
      </View>
    </View>
  );
}

function entryDates(entry: ShelfEntry): string | null {
  const parts = [
    entry.startedAt ? L("Начал %@", formatDay(entry.startedAt)) : null,
    entry.finishedAt ? L("Закончил %@", formatDay(entry.finishedAt)) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, paddingVertical: 2, alignItems: "center" },
  text: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: "600" },
  subtitle: { fontSize: 14 },
  caption: { fontSize: 12 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
});
