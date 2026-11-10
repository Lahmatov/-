import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatDay } from "../../api/dates";
import type { Review } from "../../api/models";
import { useAPI, useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../components/theme";
import { Row } from "../../components/ui";
import { L } from "../../i18n";
import { routes } from "../../lib/routes";
import { LikeButton } from "../social/LikeButton";
import { reportContent } from "../social/report";

/** Отзыв другого читателя: автор, оценка, текст, лайки, комментарии, жалоба (долгое нажатие или флажок). */
export function ReviewRow({ review, first }: { review: Review; first?: boolean }) {
  const theme = useTheme();
  const api = useAPI();
  const { user } = useAuth();
  const router = useRouter();
  const isMine = user?.id === review.userId;
  const report = () => reportContent(api, { entryId: review.id });
  const comments = review.comments ?? 0;

  return (
    <Row first={first} onLongPress={isMine ? undefined : report} chevron={false} testID={`review-${review.id}`}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push(routes.user(review.userId))}
            accessibilityRole="link"
            hitSlop={6}
            style={({ pressed }) => [{ flexShrink: 1 }, pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.author, { color: theme.text }]} numberOfLines={1}>
              {review.userName}
            </Text>
          </Pressable>
          {review.rating != null && (
            <View style={styles.rating} accessibilityLabel={`${review.rating} / 10`}>
              <Ionicons name="star" size={12} color={theme.star} />
              <Text style={[styles.caption, { color: theme.star }]}>{review.rating}/10</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <Text style={[styles.caption, { color: theme.secondaryText }]}>{formatDay(review.updatedAt)}</Text>
        </View>
        {review.review != null && <Text style={[styles.body, { color: theme.text }]}>{review.review}</Text>}
        <View style={styles.actions}>
          <LikeButton entryId={review.id} likes={review.likes ?? 0} likedByMe={review.likedByMe ?? false} />
          <Pressable
            onPress={() => router.push(routes.comments(review.id))}
            accessibilityRole="button"
            accessibilityLabel={L("Комментарии")}
            accessibilityValue={{ text: String(comments) }}
            hitSlop={8}
            style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chatbubble-outline" size={16} color={theme.secondaryText} />
            {comments > 0 && <Text style={[styles.count, { color: theme.secondaryText }]}>{comments}</Text>}
          </Pressable>
          <View style={{ flex: 1 }} />
          {!isMine && (
            <Pressable
              onPress={report}
              accessibilityRole="button"
              accessibilityLabel={L("Пожаловаться")}
              hitSlop={8}
              style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="flag-outline" size={15} color={theme.secondaryText} />
            </Pressable>
          )}
        </View>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, paddingVertical: 2 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  author: { fontSize: 15, fontWeight: "600" },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
  caption: { fontSize: 12 },
  body: { fontSize: 16 },
  actions: { flexDirection: "row", alignItems: "center", gap: 20 },
  action: { flexDirection: "row", alignItems: "center", gap: 4 },
  count: { fontSize: 15 },
});
