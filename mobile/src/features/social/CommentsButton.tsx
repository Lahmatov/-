import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../../components/theme";
import { L } from "../../i18n";
import { routes } from "../../lib/routes";

/** 💬 с числом комментариев, открывает обсуждение отзыва. */
export function CommentsButton({ entryId, count }: { entryId: string; count: number }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => router.push(routes.comments(entryId))}
      hitSlop={8}
      testID={`comments-${entryId}`}
      accessibilityRole="button"
      accessibilityLabel={L("Комментарии")}
      accessibilityValue={{ text: String(count) }}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name="chatbubble-outline" size={17} color={theme.secondaryText} />
      {count > 0 && <Text style={[styles.count, { color: theme.secondaryText }]}>{count}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 },
  count: { fontSize: 15 },
});
