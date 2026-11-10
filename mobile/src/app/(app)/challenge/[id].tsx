import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import type { ChallengeDetails } from "../../../api/models";
import { useAPI } from "../../../auth/AuthContext";
import { ProgressBar } from "../../../components/ProgressBar";
import { Body, Button, Loaded, Row, Screen, Section, type IconName } from "../../../components/ui";
import { useTheme } from "../../../components/theme";
import { booksCount, challengeInviteText, challengeSummary } from "../../../features/challenges/challengeText";
import { HeaderIconButton } from "../../../features/challenges/CommunityControls";
import { L } from "../../../i18n";
import { attempt, confirm, showError } from "../../../lib/alerts";
import { routes } from "../../../lib/routes";
import { useLoad, type LoadState } from "../../../lib/useLoad";

/** Челлендж: мой прогресс и таблица участников. */
export default function ChallengeScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = String(rawId ?? "");
  const api = useAPI();
  const state = useLoad(() => api.challenge(id), [api, id]);
  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <Loaded state={state}>{(c) => <ChallengeContent c={c} state={state} />}</Loaded>
    </>
  );
}

function ChallengeContent({ c, state }: { c: ChallengeDetails; state: LoadState<ChallengeDetails> }) {
  const api = useAPI();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await state.reload();
    setRefreshing(false);
  };

  const join = async () => {
    setJoining(true);
    const outcome = { done: false };
    await attempt(async () => {
      await api.joinChallenge(c.id);
      outcome.done = true;
    });
    if (outcome.done) await state.reload();
    setJoining(false);
  };

  const invite = (code: string) => {
    Share.share({ message: challengeInviteText(c, code), title: c.title }).catch(showError);
  };

  const leave = async () => {
    const ok = await confirm(
      c.isOwner ? L("Удалить челлендж для всех участников?") : L("Выйти из челленджа?"),
      undefined,
      c.isOwner ? L("Удалить") : L("Выйти из челленджа"),
    );
    if (!ok) return;
    const outcome = { done: false };
    await attempt(async () => {
      if (c.isOwner) await api.deleteChallenge(c.id);
      else await api.leaveChallenge(c.id);
      outcome.done = true;
    });
    if (outcome.done) router.back();
  };

  const showMenu = () => {
    const code = c.inviteCode;
    const leaveButton = { text: c.isOwner ? L("Удалить челлендж") : L("Выйти из челленджа"), style: "destructive" as const, onPress: () => void leave() };
    const cancel = { text: L("Отмена"), style: "cancel" as const };
    if (code) Alert.alert(L("Код приглашения: %@", code), undefined, [{ text: L("Пригласить"), onPress: () => invite(code) }, leaveButton, cancel]);
    else Alert.alert(c.title, undefined, [leaveButton, cancel]);
  };

  const phase: { icon: IconName; title: string; color: string } =
    c.phase === "upcoming"
      ? { icon: "time-outline", title: L("Ещё не начался"), color: theme.text }
      : c.phase === "active"
        ? { icon: "flame", title: L("Идёт сейчас"), color: theme.accent }
        : { icon: "flag-outline", title: L("Завершён"), color: theme.text };

  const progress = c.myProgress;
  const done = progress != null && progress >= c.goal;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: c.isMember
            ? () => (
                <View style={styles.headerButtons}>
                  {c.inviteCode ? <HeaderIconButton icon="person-add-outline" label={L("Пригласить")} onPress={() => invite(c.inviteCode ?? "")} testID="challengeInvite" /> : null}
                  <HeaderIconButton icon="ellipsis-horizontal-circle-outline" label={L("Ещё")} onPress={showMenu} testID="challengeMenu" />
                </View>
              )
            : () => null,
        }}
      />
      <Screen refreshing={refreshing} onRefresh={() => void refresh()} testID="challenge">
        <Section>
          <Row first>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>{c.title}</Text>
              <Body style={{ color: theme.secondaryText }}>{challengeSummary(c)}</Body>
              {c.description != null && <Body>{c.description}</Body>}
              <View style={styles.phase}>
                <Ionicons name={phase.icon} size={18} color={phase.color} />
                <Body style={{ color: phase.color }}>{phase.title}</Body>
              </View>
              {c.inviteCode ? (
                <Text selectable style={[styles.caption, { color: theme.secondaryText }]}>
                  {L("Код приглашения: %@", c.inviteCode)}
                </Text>
              ) : null}
            </View>
          </Row>
        </Section>

        {progress != null ? (
          <Section title={L("Мой прогресс")}>
            <Row first>
              <View style={styles.progress}>
                <View style={[styles.ring, { borderColor: done ? theme.success : theme.accent }]}>
                  <Text style={[styles.ringText, { color: theme.text }]}>{progress}</Text>
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[styles.headline, { color: theme.text }]}>{L("%@ из %@", String(progress), String(c.goal))}</Text>
                  <ProgressBar value={Math.min(1, progress / Math.max(c.goal, 1))} color={done ? theme.success : theme.accent} />
                  {done ? (
                    <View style={styles.phase}>
                      <Ionicons name="ribbon" size={16} color={theme.accent} />
                      <Body style={{ color: theme.accent, flex: 1 }}>{L("Цель выполнена — значок ваш!")}</Body>
                    </View>
                  ) : (
                    <Body style={{ color: theme.secondaryText }}>{L("Осталось: %@", booksCount(c.goal - progress))}</Body>
                  )}
                </View>
              </View>
            </Row>
          </Section>
        ) : c.phase !== "finished" ? (
          <View style={{ paddingHorizontal: 16 }}>
            <Button title={L("Присоединиться")} kind="prominent" onPress={() => void join()} busy={joining} testID="joinChallenge" />
          </View>
        ) : null}

        <Section title={L("Участники (%@)", String(c.participantCount))}>
          {c.leaderboard.map((row, index) => (
            <Row key={row.user.id} first={index === 0} onPress={() => router.push(routes.user(row.user.id))}>
              <View style={styles.leader}>
                <Text style={[styles.rank, { color: theme.secondaryText }]}>{index + 1}.</Text>
                <Body style={{ flexShrink: 1 }}>{row.user.name}</Body>
                {row.completed && <Ionicons name="ribbon" size={16} color={theme.accent} accessibilityLabel={L("Выполнен")} accessible />}
                <View style={{ flex: 1 }} />
                <Text style={[styles.rank, { color: theme.secondaryText }]}>{L("%@ из %@", String(row.progress), String(c.goal))}</Text>
              </View>
            </Row>
          ))}
        </Section>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headerButtons: { flexDirection: "row", alignItems: "center", gap: 12 },
  header: { gap: 8, paddingVertical: 4 },
  title: { fontSize: 22, fontWeight: "700" },
  phase: { flexDirection: "row", alignItems: "center", gap: 6 },
  caption: { fontSize: 12 },
  progress: { flexDirection: "row", alignItems: "center", gap: 16 },
  ring: { width: 56, height: 56, borderRadius: 28, borderWidth: 5, alignItems: "center", justifyContent: "center" },
  ringText: { fontSize: 17, fontWeight: "600", fontVariant: ["tabular-nums"] },
  headline: { fontSize: 17, fontWeight: "600" },
  leader: { flexDirection: "row", alignItems: "center", gap: 8 },
  rank: { fontSize: 16, fontVariant: ["tabular-nums"] },
});
