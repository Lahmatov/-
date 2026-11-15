import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatDay, monthNames } from "../../api/dates";
import { useTheme } from "../../components/theme";
import { AppLanguage, L } from "../../i18n";
import { dayKey, monthGrid, parseDayKey, shiftMonth, type MonthRef } from "./calendar";

/** Небольшой календарь: выбор дня "YYYY-MM-DD" не позже max (дни в UTC, как на сервере). */
export function DayPicker({ value, max, onChange }: { value: string; max: string; onChange: (day: string) => void }) {
  const theme = useTheme();
  const selected = parseDayKey(value);
  const maxDay = parseDayKey(max);
  const [shown, setShown] = useState<MonthRef>(() => (selected ? { year: selected.year, month: selected.month } : maxDay ?? { year: 2026, month: 0 }));
  const firstWeekday: 0 | 1 = AppLanguage.isEnglish ? 0 : 1;
  const weeks = useMemo(() => monthGrid(shown, firstWeekday), [shown, firstWeekday]);
  const weekdays = useMemo(() => weekdayNames(firstWeekday), [firstWeekday]);
  const months = useMemo(() => monthNames(), []);
  const canGoForward = !maxDay || shown.year < maxDay.year || (shown.year === maxDay.year && shown.month < maxDay.month);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setShown((m) => shiftMonth(m, -1))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={L("Предыдущий месяц")}
          style={styles.arrow}
        >
          <Ionicons name="chevron-back" size={20} color={theme.accent} />
        </Pressable>
        <Text style={[styles.month, { color: theme.text }]} accessibilityRole="header">
          {capitalize(months[shown.month] ?? "")} {shown.year}
        </Text>
        <Pressable
          onPress={() => setShown((m) => shiftMonth(m, 1))}
          disabled={!canGoForward}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={L("Следующий месяц")}
          accessibilityState={{ disabled: !canGoForward }}
          style={[styles.arrow, !canGoForward && { opacity: 0.3 }]}
        >
          <Ionicons name="chevron-forward" size={20} color={theme.accent} />
        </Pressable>
      </View>
      <View style={styles.week}>
        {weekdays.map((name, i) => (
          <Text key={i} style={[styles.weekday, { color: theme.secondaryText }]}>
            {name}
          </Text>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((day, i) => {
            if (day == null) return <View key={i} style={styles.cell} />;
            const key = dayKey(shown.year, shown.month, day);
            const isSelected = key === value;
            const disabled = key > max;
            return (
              <Pressable
                key={i}
                style={styles.cell}
                disabled={disabled}
                onPress={() => onChange(key)}
                accessibilityRole="button"
                accessibilityLabel={formatDay(`${key}T00:00:00.000Z`)}
                accessibilityState={{ selected: isSelected, disabled }}
              >
                <View style={[styles.dayCircle, isSelected && { backgroundColor: theme.accent }]}>
                  <Text
                    style={[
                      styles.day,
                      { color: isSelected ? theme.onAccent : theme.text },
                      disabled && { color: theme.secondaryText, opacity: 0.5 },
                      isSelected && { fontWeight: "600" },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function weekdayNames(firstWeekday: 0 | 1): string[] {
  const format = new Intl.DateTimeFormat(AppLanguage.locale, { weekday: "short", timeZone: "UTC" });
  // 1 января 2023 года — воскресенье.
  return Array.from({ length: 7 }, (_, i) => format.format(new Date(Date.UTC(2023, 0, 1 + ((i + firstWeekday) % 7)))));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  container: { gap: 4, paddingVertical: 4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  arrow: { padding: 6 },
  month: { fontSize: 16, fontWeight: "600" },
  week: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", fontSize: 12 },
  cell: { flex: 1, alignItems: "center", paddingVertical: 2 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  day: { fontSize: 15 },
});
