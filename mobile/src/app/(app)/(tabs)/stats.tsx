import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { YearStats } from "../../../api/models";
import { useAPI } from "../../../auth/AuthContext";
import { ProgressBar } from "../../../components/ProgressBar";
import { useTheme } from "../../../components/theme";
import { Body, Button, Caption, Headline, LabelRow, Loaded, Row, Screen, Section } from "../../../components/ui";
import { MonthChart } from "../../../features/stats/MonthChart";
import { formatAverage, parseGoal, statsSummary } from "../../../features/stats/statsLogic";
import { L } from "../../../i18n";
import { showError } from "../../../lib/alerts";
import { routes } from "../../../lib/routes";
import { useLoad } from "../../../lib/useLoad";

export default function StatsScreen() {
  const api = useAPI();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const state = useLoad(() => api.stats(year), [api, year]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await state.reload();
    setRefreshing(false);
  };

  return (
    <Loaded state={state}>
      {(stats) => (
        <Screen testID="statsScreen" refreshing={refreshing} onRefresh={() => void refresh()}>
          {stats.years.length > 1 && <YearPicker years={stats.years} value={year} onChange={setYear} />}
          <GoalSection stats={stats} year={year} onSaved={(updated) => state.setData(updated)} />

          <Section>
            <LabelRow first icon="flag-outline" title={L("Челленджи")} onPress={() => router.push(routes.challenges())} testID="challengesLink" />
            <LabelRow icon="sparkles-outline" title={L("Итоги %@", String(stats.year))} onPress={() => router.push(routes.wrapped(stats.year))} testID="wrappedLink" />
          </Section>

          <Section>
            <LabelRow first title={L("Средняя оценка")} value={formatAverage(stats.avgRating)} />
            <LabelRow title={L("Читаю сейчас")} value={String(stats.readingNow)} />
          </Section>

          <Section title={L("Прочитано по месяцам")}>
            <Row first>
              {stats.readCount === 0 ? (
                <Caption style={{ fontSize: 15 }}>{L("В %@ году пока нет прочитанных книг", String(stats.year))}</Caption>
              ) : (
                <MonthChart byMonth={stats.byMonth} />
              )}
            </Row>
          </Section>
        </Screen>
      )}
    </Loaded>
  );
}

function YearPicker({ years, value, onChange }: { years: number[]; value: number; onChange: (year: number) => void }) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.years} accessibilityLabel={L("Год")}>
      {years.map((y) => {
        const selected = y === value;
        return (
          <Pressable
            key={y}
            onPress={() => onChange(y)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.chip, { backgroundColor: selected ? theme.accent : theme.card }]}
          >
            <Text style={{ color: selected ? theme.onAccent : theme.text, fontWeight: selected ? "600" : "400" }}>{y}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Сколько прочитано, цель и её изменение (поле прямо в секции вместо алерта с полем ввода). */
function GoalSection({ stats, year, onSaved }: { stats: YearStats; year: number; onSaved: (stats: YearStats) => void }) {
  const api = useAPI();
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (target: number | null) => {
    setBusy(true);
    try {
      onSaved(await api.setGoal(year, target));
      setEditing(false);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    const parsed = parseGoal(text);
    if (!parsed.ok) {
      showError(new Error(parsed.message));
      return;
    }
    // Пустое поле при отсутствующей цели — просто закрыть.
    if (parsed.target == null && stats.goal == null) {
      setEditing(false);
      return;
    }
    void save(parsed.target);
  };

  return (
    <Section>
      <Row first>
        <View style={{ gap: 8, paddingVertical: 6 }}>
          <View style={styles.counter}>
            <Text style={[styles.big, { color: theme.text }]} testID="readCount">
              {stats.readCount}
            </Text>
            {stats.goal != null && <Text style={[styles.goal, { color: theme.secondaryText }]}>/ {stats.goal}</Text>}
          </View>
          <Body style={{ color: theme.secondaryText }}>{statsSummary(stats)}</Body>
          {stats.goal != null && <ProgressBar value={Math.min(stats.readCount, stats.goal) / stats.goal} height={6} />}

          {editing ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              <Headline>{L("Цель на %@", String(year))}</Headline>
              <Caption>{L("Сколько книг вы хотите прочитать за год?")}</Caption>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={L("Сколько книг")}
                placeholderTextColor={theme.secondaryText}
                keyboardType="number-pad"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={submit}
                maxLength={4}
                testID="goalField"
                accessibilityLabel={L("Сколько книг")}
                style={[styles.input, { color: theme.text, backgroundColor: theme.placeholder }]}
              />
              <View style={styles.buttons}>
                <Button title={L("Сохранить")} kind="prominent" onPress={submit} busy={busy} testID="saveGoal" />
                <Button title={L("Отмена")} kind="plain" onPress={() => setEditing(false)} disabled={busy} />
              </View>
              {stats.goal != null && (
                <Button title={L("Убрать цель")} kind="destructive" onPress={() => void save(null)} disabled={busy} style={{ alignSelf: "flex-start", paddingHorizontal: 0 }} />
              )}
            </View>
          ) : (
            <Button
              title={stats.goal == null ? L("Поставить цель на год") : L("Изменить цель")}
              onPress={() => {
                setText(stats.goal != null ? String(stats.goal) : "");
                setEditing(true);
              }}
              style={{ alignSelf: "flex-start", marginTop: 4 }}
              testID="editGoal"
            />
          )}
        </View>
      </Row>
    </Section>
  );
}

const styles = StyleSheet.create({
  years: { paddingHorizontal: 16, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16 },
  counter: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  big: { fontSize: 44, fontWeight: "900" },
  goal: { fontSize: 28, fontWeight: "700" },
  input: { fontSize: 17, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  buttons: { flexDirection: "row", gap: 16, alignItems: "center" },
});
