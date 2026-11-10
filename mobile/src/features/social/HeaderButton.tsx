import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { IconName } from "../../components/ui";
import { useTheme } from "../../components/theme";

/** Кнопка-иконка или текстовая кнопка в заголовке экрана. badge — точка «есть новое». */
export function HeaderButton({
  icon,
  title,
  label,
  onPress,
  badge,
  disabled,
  bold,
  testID,
}: {
  icon?: IconName;
  title?: string;
  label: string;
  onPress: () => void;
  badge?: boolean;
  disabled?: boolean;
  bold?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.button, (pressed || disabled) && { opacity: disabled ? 0.4 : 0.6 }]}
    >
      {icon ? (
        <View>
          <Ionicons name={icon} size={23} color={theme.accent} />
          {badge && <View style={[styles.badge, { backgroundColor: theme.danger, borderColor: theme.card }]} />}
        </View>
      ) : (
        <Text style={[styles.title, { color: theme.accent, fontWeight: bold ? "600" : "400" }]}>{title ?? label}</Text>
      )}
    </Pressable>
  );
}

export function HeaderButtons({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: 4, minHeight: 32, justifyContent: "center" },
  badge: { position: "absolute", top: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  title: { fontSize: 17 },
  group: { flexDirection: "row", alignItems: "center", gap: 14 },
});
