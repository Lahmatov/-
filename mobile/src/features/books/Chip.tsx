import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";
import type { IconName } from "../../components/ui";
import { useTheme } from "../../components/theme";

/** Капсула: фильтр статуса на полке, жанр на странице книги. */
export function Chip({
  title,
  detail,
  selected,
  outlined,
  icon,
  onPress,
  accessibilityLabel,
  testID,
}: {
  title: string;
  detail?: string;
  selected?: boolean;
  outlined?: boolean;
  icon?: IconName;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const color = selected ? theme.onAccent : theme.text;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        outlined
          ? { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: theme.separator }
          : { backgroundColor: selected ? theme.accent : theme.placeholder },
        pressed && { opacity: 0.6 },
      ]}
    >
      {icon && <Ionicons name={icon} size={14} color={color} />}
      <Text style={[styles.text, { color }]}>{title}</Text>
      {detail !== undefined && <Text style={[styles.text, { color, opacity: 0.6 }]}>{detail}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  text: { fontSize: 15 },
});
