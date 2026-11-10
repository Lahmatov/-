import { StyleSheet, Text, View } from "react-native";
import { BookCover } from "../../components/BookCover";
import { useTheme } from "../../components/theme";
import { listCountText } from "./listValues";

export { listCountText };

/** Название списка и число книг. */
export function ListSummaryRow({ title, count, isPublic }: { title: string; count: number; isPublic: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.text}>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{listCountText(count, isPublic)}</Text>
    </View>
  );
}

/** Первые три обложки списка веером. */
export function CoverStack({ covers }: { covers: string[] }) {
  const shown = covers.slice(0, 3);
  return (
    <View style={styles.stack}>
      {shown.length === 0 ? (
        <BookCover url={null} title="" width={30} />
      ) : (
        shown.map((url, index) => (
          <View key={index} style={[styles.cover, { left: index * 8, zIndex: index }]}>
            <BookCover url={url} title="" width={30} />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { flex: 1, gap: 2 },
  title: { fontSize: 17, fontWeight: "600" },
  subtitle: { fontSize: 14 },
  stack: { width: 50, height: 45 },
  cover: { position: "absolute", top: 0 },
});
