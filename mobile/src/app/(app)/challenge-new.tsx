import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Genre } from "../../api/models";
import { useAPI } from "../../auth/AuthContext";
import { Field, Row, Screen, Section, SwitchRow } from "../../components/ui";
import { useTheme } from "../../components/theme";
import { booksCount } from "../../features/challenges/challengeText";
import { StepperRow } from "../../features/challenges/CommunityControls";
import { DayPicker } from "../../features/challenges/DayPicker";
import { addMonths, compareDays, dayToString, today, type Day } from "../../features/challenges/days";
import { L } from "../../i18n";
import { attempt } from "../../lib/alerts";
import { routes } from "../../lib/routes";
import { useLoad } from "../../lib/useLoad";

/** Новый челлендж (модальное окно): цель, период, жанр (необязательно), публичный или по коду. */
export default function NewChallengeScreen() {
  const api = useAPI();
  const theme = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState(10);
  const [startsAt, setStartsAt] = useState<Day>(() => today());
  const [endsAt, setEndsAt] = useState<Day>(() => addMonths(today(), 3));
  const [genre, setGenre] = useState<string | null>(null);
  const [showGenres, setShowGenres] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  // Жанры не обязательны: без сети или при ошибке остаётся «Любой».
  const genres = useLoad<Genre[]>(() => api.genres().catch(() => []), [api]);

  const canCreate = title.trim().length > 0 && !saving;
  const genreName = genre ? (genres.data?.find((g) => g.slug === genre)?.name ?? genre) : L("Любой");

  // Окончание не раньше начала (как DatePicker с in: startsAt...).
  const changeStart = (value: Day) => {
    setStartsAt(value);
    if (compareDays(endsAt, value) < 0) setEndsAt(value);
  };
  const changeEnd = (value: Day) => setEndsAt(compareDays(value, startsAt) < 0 ? startsAt : value);

  const create = async () => {
    if (!canCreate) return;
    setSaving(true);
    const text = description.trim();
    const id = await attempt(() =>
      api.createChallenge({
        title: title.trim(),
        description: text.length > 0 ? text : null,
        goal,
        startsAt: dayToString(startsAt),
        endsAt: dayToString(endsAt),
        genre,
        isPublic,
      }),
    );
    setSaving(false);
    if (id) {
      router.back();
      router.push(routes.challenge(id));
    }
  };

  const genreRow = (slug: string | null, name: string, first = false) => {
    const selected = slug === genre;
    return (
      <Pressable
        key={slug ?? "any"}
        onPress={() => {
          setGenre(slug);
          setShowGenres(false);
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={name}
      >
        <Row first={first}>
          <View style={styles.choice}>
            <Text style={[styles.body, { color: theme.text, flex: 1, paddingLeft: 12 }]}>{name}</Text>
            {selected && <Ionicons name="checkmark" size={20} color={theme.accent} />}
          </View>
        </Row>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: L("Новый челлендж"),
          presentation: "modal",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.headerButton, { color: theme.accent }]}>{L("Отмена")}</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => void create()} disabled={!canCreate} hitSlop={8} accessibilityRole="button" accessibilityState={{ disabled: !canCreate }} testID="createChallengeSave">
              <Text style={[styles.headerButton, { color: theme.accent, fontWeight: "600", opacity: canCreate ? 1 : 0.4 }]}>{L("Создать")}</Text>
            </Pressable>
          ),
        }}
      />
      <Screen>
        <Section>
          <Field
            first
            value={title}
            onChangeText={setTitle}
            placeholder={L("Название, например «10 книг за лето»")}
            accessibilityLabel={L("Название, например «10 книг за лето»")}
            autoFocus
            testID="challengeTitle"
          />
          <Field value={description} onChangeText={setDescription} placeholder={L("Описание (необязательно)")} multiline style={{ minHeight: 60 }} accessibilityLabel={L("Описание (необязательно)")} />
        </Section>

        <Section footer={L("Засчитываются книги, отмеченные «Прочитал» с датой окончания внутри периода.")}>
          <StepperRow first title={L("Цель: %@", booksCount(goal))} value={goal} min={1} max={500} onChange={setGoal} testID="challengeGoal" />
          <DayPicker label={L("Начало")} value={startsAt} onChange={changeStart} testID="challengeStart" />
          <DayPicker label={L("Окончание")} value={endsAt} onChange={changeEnd} testID="challengeEnd" />
          <Pressable onPress={() => setShowGenres((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showGenres }} accessibilityLabel={`${L("Жанр")}: ${genreName}`}>
            <Row>
              <View style={styles.choice}>
                <Text style={[styles.body, { color: theme.text, flex: 1 }]}>{L("Жанр")}</Text>
                <Text style={[styles.body, { color: theme.secondaryText }]} numberOfLines={1}>
                  {genreName}
                </Text>
                <Ionicons name={showGenres ? "chevron-up" : "chevron-down"} size={16} color={theme.secondaryText} />
              </View>
            </Row>
          </Pressable>
          {showGenres && [genreRow(null, L("Любой")), ...(genres.data ?? []).map((g) => genreRow(g.slug, g.name))]}
        </Section>

        <Section footer={isPublic ? L("Любой читатель может найти челлендж и присоединиться.") : L("Присоединиться можно только по коду приглашения.")}>
          <SwitchRow first title={L("Виден всем")} value={isPublic} onChange={setIsPublic} />
        </Section>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: { fontSize: 17 },
  body: { fontSize: 16 },
  choice: { flexDirection: "row", alignItems: "center", gap: 8 },
});
