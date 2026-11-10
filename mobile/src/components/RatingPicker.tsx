import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "./theme";

/** Оценка от 1 до 10. Повторное нажатие на выбранную звезду снимает оценку. */
export function RatingPicker({ rating, onChange }: { rating: number | null; onChange: (value: number | null) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => {
        const filled = value <= (rating ?? 0);
        return (
          <Pressable
            key={value}
            style={styles.star}
            accessibilityRole="button"
            accessibilityLabel={`${value} / 10`}
            accessibilityState={{ selected: rating === value }}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              onChange(rating === value ? null : value);
            }}
          >
            <Ionicons name={filled ? "star" : "star-outline"} size={24} color={filled ? theme.star : theme.secondaryText} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between" },
  star: { flex: 1, alignItems: "center", paddingVertical: 4 },
});
