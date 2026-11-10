import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { monthNames } from "../../api/dates";
import { useTheme } from "../../components/theme";
import { L } from "../../i18n";
import { monthLabel, peakMonth } from "./statsLogic";

const CHART_HEIGHT = 160;

/** Столбцы «прочитано по месяцам» из обычных View. Касание столбца показывает число книг. */
export function MonthChart({ byMonth }: { byMonth: number[] }) {
  const theme = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const short = monthNames(true);
  const max = Math.max(1, ...byMonth);
  const peak = peakMonth(byMonth);
  const months = Array.from({ length: 12 }, (_, i) => byMonth[i] ?? 0);

  return (
    <View style={{ gap: 8, paddingVertical: 6 }} testID="monthChart">
      <Text style={[styles.caption, { color: theme.secondaryText }]}>
        {selected != null ? monthLabel(selected, months[selected]!) : L("Коснитесь столбца, чтобы увидеть число")}
      </Text>
      <View style={[styles.chart, { borderBottomColor: theme.separator }]}>
        {months.map((count, index) => {
          const dimmed = selected != null && selected !== index;
          return (
            <Pressable
              key={index}
              style={styles.column}
              onPress={() => setSelected((current) => (current === index ? null : index))}
              accessibilityRole="button"
              accessibilityLabel={monthLabel(index, count)}
              accessibilityState={{ selected: selected === index }}
            >
              {index === peak && selected == null && <Text style={[styles.annotation, { color: theme.secondaryText }]}>{count}</Text>}
              <View
                style={{
                  width: "60%",
                  height: count > 0 ? Math.max(3, (count / max) * (CHART_HEIGHT - 18)) : 0,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  backgroundColor: theme.accent,
                  opacity: dimmed ? 0.4 : 1,
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.labels} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {months.map((_, index) => (
          <Text key={index} style={[styles.monthLabel, { color: theme.secondaryText }]} numberOfLines={1}>
            {(short[index] ?? "").replace(".", "").slice(0, 3)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 12 },
  chart: { height: CHART_HEIGHT, flexDirection: "row", alignItems: "flex-end", borderBottomWidth: StyleSheet.hairlineWidth },
  column: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  annotation: { fontSize: 11, marginBottom: 2 },
  labels: { flexDirection: "row" },
  monthLabel: { flex: 1, fontSize: 10, textAlign: "center" },
});
