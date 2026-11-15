import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatRelative } from "../../api/dates";
import { feedLabel, type FeedItem } from "../../api/models";
import { BookRow } from "../../components/BookRow";
import { useTheme } from "../../components/theme";
import { routes } from "../../lib/routes";
import { CommentsButton } from "./CommentsButton";
import { LikeButton } from "./LikeButton";

/** Событие ленты: два перехода (к человеку и к книге), под отзывом — лайк и комментарии. */
export const FeedRow = memo(function FeedRow({ item }: { item: FeedItem }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderBottomColor: theme.separator }]} testID={`feed-${item.id}`}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push(routes.user(item.user.id))}
          hitSlop={6}
          accessibilityRole="link"
          style={({ pressed }) => [styles.headerText, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {item.user.name}
          </Text>
        </Pressable>
        <Text style={[styles.label, { color: theme.secondaryText }]} numberOfLines={1}>
          {feedLabel(item)}
        </Text>
        {item.rating != null && (
          <View style={styles.rating} accessibilityLabel={`${item.rating}/10`}>
            <Ionicons name="star" size={12} color={theme.star} />
            <Text style={[styles.caption, { color: theme.star }]}>{item.rating}/10</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Text style={[styles.caption, { color: theme.secondaryText }]}>{formatRelative(item.createdAt)}</Text>
      </View>
      <Pressable
        onPress={() => router.push(routes.book(item.book.id))}
        accessibilityRole="link"
        accessibilityLabel={item.book.title}
        style={({ pressed }) => pressed && { opacity: 0.6 }}
      >
        <BookRow book={item.book} />
      </Pressable>
      {item.review != null && (
        <Text style={[styles.review, { color: theme.text }]} numberOfLines={6}>
          {item.review}
        </Text>
      )}
      {item.type === "REVIEW" && item.entryId != null && (
        <View style={styles.actions}>
          <LikeButton entryId={item.entryId} likes={item.likes ?? 0} likedByMe={item.likedByMe ?? false} />
          <CommentsButton entryId={item.entryId} count={item.comments ?? 0} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  headerText: { flexShrink: 1 },
  name: { fontSize: 15, fontWeight: "700" },
  label: { fontSize: 15, flexShrink: 1 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
  caption: { fontSize: 12 },
  review: { fontSize: 16, lineHeight: 21 },
  actions: { flexDirection: "row", gap: 20, alignItems: "center" },
});
