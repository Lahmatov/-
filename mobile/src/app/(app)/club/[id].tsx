import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { clubChapterRange, type ClubDetails, type ClubPost } from "../../../api/models";
import { useAuth } from "../../../auth/AuthContext";
import { BookRow } from "../../../components/BookRow";
import { Body, Loaded, Row, Screen, Section } from "../../../components/ui";
import { useTheme } from "../../../components/theme";
import { HeaderIconButton, StepperRow } from "../../../features/challenges/CommunityControls";
import { ClubPostRow } from "../../../features/clubs/ClubPostRow";
import { clubInviteText, memberChapterTitle, myChapterTitle, postChapterOptions } from "../../../features/clubs/clubText";
import { L } from "../../../i18n";
import { attempt, confirm, showError } from "../../../lib/alerts";
import { routes } from "../../../lib/routes";
import { useLoad, type LoadState } from "../../../lib/useLoad";

type ClubData = { club: ClubDetails; posts: ClubPost[] };

/** Клуб: книга, участники, мой прогресс по главам и обсуждение без спойлеров. */
export default function ClubScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = String(rawId ?? "");
  const { api } = useAuth();
  const state = useLoad<ClubData>(async () => {
    const [club, posts] = await Promise.all([api.club(id), api.clubPosts(id)]);
    return { club, posts };
  }, [api, id]);

  return (
    <>
      <Stack.Screen options={{ title: state.data?.club.name ?? "" }} />
      <Loaded state={state}>{(data) => <ClubContent data={data} state={state} />}</Loaded>
    </>
  );
}

function ClubContent({ data, state }: { data: ClubData; state: LoadState<ClubData> }) {
  const { api, user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { club, posts } = data;
  const range = clubChapterRange(club);

  const [refreshing, setRefreshing] = useState(false);
  const [myChapter, setMyChapter] = useState(club.myChapter);
  const [draft, setDraft] = useState("");
  /** 0 — общее сообщение без спойлеров. Сначала — глава, до которой я дочитал. */
  const [draftChapter, setDraftChapter] = useState(club.myChapter);
  const [sending, setSending] = useState(false);

  // Глава сохраняется не на каждое нажатие «+», а через полсекунды после последнего.
  const pendingChapter = useRef<{ timer: ReturnType<typeof setTimeout>; chapter: number } | null>(null);
  const serverChapter = useRef(club.myChapter);
  serverChapter.current = club.myChapter;

  useEffect(() => {
    if (!pendingChapter.current) setMyChapter(club.myChapter);
  }, [club.myChapter]);

  useEffect(
    () => () => {
      // Ушли с экрана до сохранения — сохраняем без перезагрузки.
      const pending = pendingChapter.current;
      if (pending) {
        clearTimeout(pending.timer);
        void api.setClubChapter(pending.chapter, club.id).catch(() => undefined);
      }
    },
    [api, club.id],
  );

  const saveChapter = async (chapter: number) => {
    pendingChapter.current = null;
    if (chapter === serverChapter.current) return;
    try {
      await api.setClubChapter(chapter, club.id);
      // Могли открыться спойлеры к новым главам.
      await state.reload();
    } catch (error) {
      setMyChapter(serverChapter.current);
      showError(error);
    }
  };

  const changeChapter = (chapter: number) => {
    setMyChapter(chapter);
    if (pendingChapter.current) clearTimeout(pendingChapter.current.timer);
    pendingChapter.current = { chapter, timer: setTimeout(() => void saveChapter(chapter), 600) };
  };

  const refresh = async () => {
    setRefreshing(true);
    await state.reload();
    setRefreshing(false);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const post = await attempt(() => api.addClubPost(text, draftChapter === 0 ? null : draftChapter, club.id));
    setSending(false);
    if (post) {
      state.setData((current) => current && { ...current, posts: [...current.posts, post] });
      setDraft("");
    }
  };

  const deletePost = async (post: ClubPost) => {
    if (!(await confirm(L("Удалить сообщение?"), undefined, L("Удалить")))) return;
    await attempt(async () => {
      await api.deleteClubPost(post.id);
      state.setData((current) => current && { ...current, posts: current.posts.filter((p) => p.id !== post.id) });
    });
  };

  const invite = () => {
    Share.share({ message: clubInviteText(club), title: club.name }).catch(showError);
  };

  const leave = async () => {
    const ok = await confirm(
      club.isOwner ? L("Удалить клуб со всем обсуждением?") : L("Выйти из клуба?"),
      undefined,
      club.isOwner ? L("Удалить") : L("Выйти из клуба"),
    );
    if (!ok) return;
    const outcome = { done: false };
    await attempt(async () => {
      if (club.isOwner) await api.deleteClub(club.id);
      else await api.leaveClub(club.id);
      outcome.done = true;
    });
    if (outcome.done) router.back();
  };

  const showMenu = () => {
    Alert.alert(L("Код приглашения: %@", club.inviteCode), undefined, [
      { text: L("Пригласить"), onPress: invite },
      { text: club.isOwner ? L("Удалить клуб") : L("Выйти из клуба"), style: "destructive", onPress: () => void leave() },
      { text: L("Отмена"), style: "cancel" },
    ]);
  };

  const canSend = draft.trim().length > 0 && !sending;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerButtons}>
              <HeaderIconButton icon="person-add-outline" label={L("Пригласить")} onPress={invite} testID="clubInvite" />
              <HeaderIconButton icon="ellipsis-horizontal-circle-outline" label={L("Ещё")} onPress={showMenu} testID="clubMenu" />
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={headerHeight}>
        <Screen refreshing={refreshing} onRefresh={() => void refresh()} testID="club">
          <Section>
            <Row first onPress={() => router.push(routes.book(club.book.id))}>
              <BookRow book={club.book} />
            </Row>
            {club.description != null && (
              <Row>
                <Body>{club.description}</Body>
              </Row>
            )}
            <Row>
              <View style={styles.codeRow}>
                <Body style={{ flex: 1 }}>{L("Код приглашения")}</Body>
                <Text selectable style={[styles.code, { color: theme.secondaryText }]} accessibilityLabel={L("Код приглашения: %@", club.inviteCode)}>
                  {club.inviteCode}
                </Text>
              </View>
            </Row>
          </Section>

          <Section title={L("Мой прогресс")} footer={L("Сообщения о следующих главах откроются, когда вы до них дочитаете.")}>
            <StepperRow first title={myChapterTitle(myChapter)} value={myChapter} min={0} max={range.max} onChange={changeChapter} testID="myChapter" />
          </Section>

          <Section title={L("Участники")}>
            {club.members.map((member, i) => (
              <Row key={member.user.id} first={i === 0} onPress={() => router.push(routes.user(member.user.id))}>
                <View style={styles.member}>
                  <Body style={{ flexShrink: 1 }}>{member.user.name}</Body>
                  {member.isOwner && <Ionicons name="trophy" size={14} color={theme.accent} accessibilityLabel={L("Владелец")} accessible />}
                  <View style={{ flex: 1 }} />
                  <Body style={{ color: theme.secondaryText }}>{memberChapterTitle(member.chapter)}</Body>
                </View>
              </Row>
            ))}
          </Section>

          <Section title={L("Обсуждение")}>
            {posts.length === 0 && (
              <Row first>
                <Body style={{ color: theme.secondaryText }}>{L("Пока тихо. Начните обсуждение!")}</Body>
              </Row>
            )}
            {posts.map((post, i) => {
              const canDelete = post.user.id === user?.id || club.isOwner;
              return (
                <Row key={post.id} first={i === 0} chevron={false} onLongPress={canDelete ? () => void deletePost(post) : undefined}>
                  <ClubPostRow post={post} />
                </Row>
              );
            })}
          </Section>
        </Screen>

        <View style={[styles.composer, { backgroundColor: theme.card, borderTopColor: theme.separator, paddingBottom: Math.max(insets.bottom, 8) }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            {postChapterOptions(range).map((chapter) => {
              const selected = chapter === draftChapter;
              return (
                <Pressable
                  key={chapter}
                  onPress={() => setDraftChapter(chapter)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.chip, { backgroundColor: selected ? theme.accent : theme.placeholder }]}
                >
                  <Text style={[styles.chipText, { color: selected ? theme.onAccent : theme.text }]}>
                    {chapter === 0 ? L("Общее, без спойлеров") : L("Про главу %@", String(chapter))}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={L("Сообщение")}
              placeholderTextColor={theme.secondaryText}
              multiline
              accessibilityLabel={L("Сообщение")}
              testID="clubMessage"
              style={[styles.input, { color: theme.text, backgroundColor: theme.groupedBackground, borderColor: theme.separator }]}
            />
            <Pressable onPress={() => void send()} disabled={!canSend} accessibilityRole="button" accessibilityLabel={L("Отправить")} accessibilityState={{ disabled: !canSend }} testID="clubSend">
              <Ionicons name="arrow-up-circle" size={32} color={theme.accent} style={{ opacity: canSend ? 1 : 0.35 }} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  headerButtons: { flexDirection: "row", alignItems: "center", gap: 12 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  code: { fontSize: 16, fontVariant: ["tabular-nums"], letterSpacing: 1 },
  member: { flexDirection: "row", alignItems: "center", gap: 6 },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingHorizontal: 12, gap: 6 },
  chips: { gap: 6 },
  chip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 13 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: { flex: 1, fontSize: 16, maxHeight: 110, minHeight: 36, borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
});
