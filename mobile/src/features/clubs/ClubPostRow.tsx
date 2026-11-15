import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { formatRelative } from "../../api/dates";
import type { ClubPost } from "../../api/models";
import { useTheme } from "../../components/theme";
import { L } from "../../i18n";

/** Сообщение клуба. Спойлер к главе, до которой я не дочитал, приходит без текста и показывается заглушкой. */
export function ClubPostRow({ post }: { post: ClubPost }) {
  const theme = useTheme();
  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Text style={[styles.author, { color: theme.text }]} numberOfLines={1}>
          {post.user.name}
        </Text>
        {post.chapter != null && (
          <Text style={[styles.chip, { color: theme.text, backgroundColor: theme.warningBackground }]}>{L("гл. %@", String(post.chapter))}</Text>
        )}
        <View style={{ flex: 1 }} />
        <Text style={[styles.caption, { color: theme.secondaryText }]}>{formatRelative(post.createdAt)}</Text>
      </View>
      {post.spoiler ? (
        <View style={styles.spoiler} accessible>
          <Ionicons name="eye-off-outline" size={16} color={theme.secondaryText} />
          <Text style={[styles.callout, { color: theme.secondaryText, flex: 1 }]}>
            {L("Спойлер к главе %@ — откроется, когда дочитаете", String(post.chapter ?? 0))}
          </Text>
        </View>
      ) : post.text != null ? (
        <Text style={[styles.body, { color: theme.text }]}>{post.text}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 4, paddingVertical: 2 },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  author: { fontSize: 15, fontWeight: "600", flexShrink: 1 },
  chip: { fontSize: 12, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, overflow: "hidden" },
  caption: { fontSize: 12 },
  spoiler: { flexDirection: "row", alignItems: "center", gap: 6 },
  callout: { fontSize: 15 },
  body: { fontSize: 16 },
});
