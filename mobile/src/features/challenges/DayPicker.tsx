import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { monthNames } from "../../api/dates";
import { Row } from "../../components/ui";
import { useTheme } from "../../components/theme";
import { L } from "../../i18n";
import { shiftDay, type Day } from "./days";

/** Выбор календарного дня тремя переключателями «день / месяц / год» (без нативного DatePicker). */
export function DayPicker({ label, value, onChange, first, testID }: { label: string; value: Day; onChange: (value: Day) => void; first?: boolean; testID?: string }) {
  const theme = useTheme();
  const months = monthNames(true);
  return (
    <Row first={first}>
      <View style={styles.row} testID={testID}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <View style={styles.parts}>
          <Part label={L("День")} text={String(value.day)} onShift={(d) => onChange(shiftDay(value, "day", d))} />
          <Part label={L("Месяц")} text={months[value.month - 1] ?? String(value.month)} wide onShift={(d) => onChange(shiftDay(value, "month", d))} />
          <Part label={L("Год")} text={String(value.year)} wide onShift={(d) => onChange(shiftDay(value, "year", d))} />
        </View>
      </View>
    </Row>
  );
}

function Part({ label, text, onShift, wide }: { label: string; text: string; onShift: (delta: number) => void; wide?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.part, { backgroundColor: theme.placeholder }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => onShift(e.nativeEvent.actionName === "increment" ? 1 : -1)}
    >
      <Pressable onPress={() => onShift(-1)} hitSlop={6} style={styles.arrow}>
        <Ionicons name="chevron-back" size={14} color={theme.accent} />
      </Pressable>
      <Text style={[styles.value, { color: theme.text, minWidth: wide ? 40 : 20 }]} numberOfLines={1}>
        {text}
      </Text>
      <Pressable onPress={() => onShift(1)} hitSlop={6} style={styles.arrow}>
        <Ionicons name="chevron-forward" size={14} color={theme.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8 },
  label: { fontSize: 16 },
  parts: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  part: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingVertical: 4 },
  arrow: { paddingHorizontal: 8, paddingVertical: 4 },
  value: { fontSize: 15, textAlign: "center", fontVariant: ["tabular-nums"] },
});
