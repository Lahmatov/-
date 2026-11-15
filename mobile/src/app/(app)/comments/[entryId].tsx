import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View, type AlertButton } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatRelative } from "../../../api/dates";
import type { Comment, CommentThread } from "../../../api/models";
import { useAuth } from "../../../auth/AuthContext";
import { Caption, Loaded, Row, Screen, Section } from "../../../components/ui";
import { useTheme } from "../../../components/theme";
import { canDeleteComment } from "../../../features/social/feedPages";
import { HeaderButton } from "../../../features/social/HeaderButton";
import { reportContent } from "../../../features/social/report";
import { useErrorAlert } from "../../../features/social/useErrorAlert";
import { useRefresh } from "../../../features/social/useRefresh";
import { L } from "../../../i18n";
import { attempt } from "../../../lib/alerts";
import { useLoad } from "../../../lib/useLoad";

/** Обсуждение отзыва: комментарии и поле ввода внизу. Удалить может автор комментария и автор отзыва. */
export default function CommentsScreen() {
  const { entryId: rawId } = useLocalSearchParams<{ entryId: string }>();
  const entryId = String(rawId ?? "");
  const { api, user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const thread = useLoad(() => api.comments(entryId), [api, entryId]);
  useErrorAlert(thread);
  const { refreshing, onRefresh } = useRefresh(thread.reload);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  // KeyboardAvoidingView считает клавиатуру от своей высоты, а не от окна: у модального экрана сверху ещё
  // заголовок и край листа. Низ экрана совпадает с низом окна, поэтому отступ — разница высот.
  const window = useWindowDimensions();
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const keyboardOffset = containerHeight == null ? 0 : Math.max(0, window.height - containerHeight);

  const trimmed = text.trim();
  const myId = user?.id;

  const send = async () => {
    if (!trimmed || sending) return;
    setSending(true);
    const added = await attempt(() => api.addComment(trimmed, entryId));
    if (added) {
      setText("");
      await thread.reload();
    }
    setSending(false);
  };

  const remove = async (comment: Comment) => {
    const done = await attempt(async () => {
      await api.deleteComment(comment.id);
      return true;
    });
    if (done) await thread.reload();
  };

  const showActions = (comment: Comment, data: CommentThread) => {
    const buttons: AlertButton[] = [];
    if (canDeleteComment(comment.user.id, data.reviewAuthorId, myId)) {
      buttons.push({ text: L("Удалить"), style: "destructive", onPress: () => void remove(comment) });
    }
    if (comment.user.id !== myId) {
      buttons.push({ text: L("Пожаловаться"), onPress: () => reportContent(api, { commentId: comment.id }) });
    }
    if (buttons.length === 0) return;
    buttons.push({ text: L("Отмена"), style: "cancel" });
    Alert.alert(comment.user.name, comment.text.length > 120 ? `${comment.text.slice(0, 120)}…` : comment.text, buttons, { cancelable: true });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: L("Комментарии"),
          presentation: "modal",
          headerRight: () => <HeaderButton title={L("Готово")} label={L("Готово")} bold onPress={() => router.back()} testID="comments-done" />,
        }}
      />
      <View style={{ flex: 1 }} onLayout={(event) => setContainerHeight(event.nativeEvent.layout.height)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={keyboardOffset}>
          <View style={{ flex: 1 }}>
            <Loaded state={thread}>
              {(data) => (
                <Screen refreshing={refreshing} onRefresh={onRefresh} testID="comments">
                  <Section>
                    {data.comments.length === 0 && (
                      <Row first>
                        <Caption style={{ fontSize: 16 }}>{L("Пока нет комментариев")}</Caption>
                      </Row>
                    )}
                    {data.comments.map((comment, index) => (
                      <CommentRow
                        key={comment.id}
                        comment={comment}
                        first={index === 0}
                        canDelete={canDeleteComment(comment.user.id, data.reviewAuthorId, myId)}
                        canReport={comment.user.id !== myId}
                        onActions={() => showActions(comment, data)}
                        onDelete={() => void remove(comment)}
                        onReport={() => reportContent(api, { commentId: comment.id })}
                      />
                    ))}
                  </Section>
                  {data.comments.length > 0 && <Caption style={styles.hint}>{L("Нажмите и удерживайте комментарий, чтобы удалить его или пожаловаться")}</Caption>}
                </Screen>
              )}
            </Loaded>
          </View>
          <View style={[styles.composer, { backgroundColor: theme.card, borderTopColor: theme.separator, paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={L("Комментарий")}
              placeholderTextColor={theme.secondaryText}
              accessibilityLabel={L("Комментарий")}
              multiline
              maxLength={2000}
              style={[styles.input, { color: theme.text, backgroundColor: theme.groupedBackground, borderColor: theme.separator }]}
              testID="comment-input"
            />
            <Pressable
              onPress={() => void send()}
              disabled={!trimmed || sending}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={L("Отправить")}
              accessibilityState={{ disabled: !trimmed || sending, busy: sending }}
              testID="comment-send"
              style={({ pressed }) => [(!trimmed || sending) && { opacity: 0.4 }, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="arrow-up-circle" size={34} color={theme.accent} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

function CommentRow({
  comment,
  first,
  canDelete,
  canReport,
  onActions,
  onDelete,
  onReport,
}: {
  comment: Comment;
  first: boolean;
  canDelete: boolean;
  canReport: boolean;
  onActions: () => void;
  onDelete: () => void;
  onReport: () => void;
}) {
  const theme = useTheme();
  const actions = [
    ...(canDelete ? [{ name: "delete", label: L("Удалить") }] : []),
    ...(canReport ? [{ name: "report", label: L("Пожаловаться") }] : []),
  ];
  const when = formatRelative(comment.createdAt);
  return (
    <Pressable
      onLongPress={actions.length > 0 ? onActions : undefined}
      accessible
      accessibilityLabel={`${comment.user.name}, ${when}. ${comment.text}`}
      accessibilityActions={actions}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "delete") onDelete();
        if (event.nativeEvent.actionName === "report") onReport();
      }}
      testID={`comment-${comment.id}`}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <Row first={first}>
        <View style={{ gap: 4 }}>
          <View style={styles.commentHeader}>
            <Text style={[styles.author, { color: theme.text }]} numberOfLines={1}>
              {comment.user.name}
            </Text>
            <Text style={[styles.caption, { color: theme.secondaryText }]}>{when}</Text>
          </View>
          <Text style={[styles.body, { color: theme.text }]}>{comment.text}</Text>
        </View>
      </Row>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 36, maxHeight: 110, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, fontSize: 16 },
  commentHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  author: { fontSize: 15, fontWeight: "700", flexShrink: 1 },
  caption: { fontSize: 12 },
  body: { fontSize: 16 },
  hint: { paddingHorizontal: 32 },
});
