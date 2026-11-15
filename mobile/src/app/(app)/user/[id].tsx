import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { UserProfile } from "../../../api/models";
import { useAPI } from "../../../auth/AuthContext";
import { BookRow } from "../../../components/BookRow";
import { Button, Caption, Empty, Loading, Row, Screen, Section } from "../../../components/ui";
import { useTheme } from "../../../components/theme";
import { ListSummaryRow } from "../../../features/lists/ListSummaryRow";
import { HeaderButton } from "../../../features/social/HeaderButton";
import { shareLink } from "../../../features/social/share";
import { useErrorAlert } from "../../../features/social/useErrorAlert";
import { useRefresh } from "../../../features/social/useRefresh";
import { L, plural } from "../../../i18n";
import { attempt } from "../../../lib/alerts";
import { routes } from "../../../lib/routes";
import { useLoad } from "../../../lib/useLoad";

/** Профиль читателя: подписка, счётчики, что читает, недавно прочитанное, публичные списки. */
export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = String(id ?? "");
  const api = useAPI();
  const profile = useLoad(() => api.profile(userId), [api, userId]);
  useErrorAlert(profile);
  const { refreshing, onRefresh } = useRefresh(profile.reload);
  const data = profile.data;

  return (
    <>
      <Stack.Screen
        options={{
          title: data?.user.name ?? "",
          headerRight: data
            ? () => (
                <HeaderButton
                  icon="share-outline"
                  label={L("Поделиться")}
                  onPress={() => shareLink(`u/${encodeURIComponent(data.user.id)}`, data.user.name)}
                  testID="profile-share"
                />
              )
            : undefined,
        }}
      />
      {data ? (
        <ProfileContent profile={data} refreshing={refreshing} onRefresh={onRefresh} onChanged={profile.reload} />
      ) : profile.error ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Empty icon="alert-circle-outline" title={L("Профиль недоступен")} message={profile.error}>
            <Button title={L("Повторить")} onPress={() => void profile.reload()} />
          </Empty>
        </View>
      ) : (
        <Loading />
      )}
    </>
  );
}

function ProfileContent({
  profile,
  refreshing,
  onRefresh,
  onChanged,
}: {
  profile: UserProfile;
  refreshing: boolean;
  onRefresh: () => void;
  onChanged: () => Promise<void>;
}) {
  const api = useAPI();
  const theme = useTheme();
  const [updatingFollow, setUpdatingFollow] = useState(false);

  const toggleFollow = async () => {
    setUpdatingFollow(true);
    const result = await attempt(() => api.setFollowing(!profile.isFollowing, profile.user.id));
    // Счётчик подписчиков тоже изменился — берём профиль с сервера.
    if (result !== undefined) await onChanged();
    setUpdatingFollow(false);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} testID="user-profile">
      <Section>
        <Row first>
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: theme.accent }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Text style={[styles.initial, { color: theme.onAccent }]}>{profile.user.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.name, { color: theme.text }]}>{profile.user.name}</Text>
              <Text style={[styles.counts, { color: theme.secondaryText }]}>{countsText(profile.counts)}</Text>
            </View>
          </View>
        </Row>
        {!profile.isMe && (
          <Row>
            <Button
              title={profile.isFollowing ? L("Вы подписаны") : L("Подписаться")}
              kind={profile.isFollowing ? "bordered" : "prominent"}
              icon={profile.isFollowing ? "checkmark" : "person-add-outline"}
              busy={updatingFollow}
              onPress={() => void toggleFollow()}
              testID="profile-follow"
            />
          </Row>
        )}
      </Section>

      {profile.readingNow.length > 0 && (
        <Section title={L("Читает сейчас")}>
          {profile.readingNow.map((book, index) => (
            <Row key={book.id} first={index === 0} onPress={() => router.push(routes.book(book.id))} accessibilityLabel={book.title}>
              <BookRow book={book} />
            </Row>
          ))}
        </Section>
      )}

      <Section title={L("Недавно прочитано")}>
        {profile.recentlyRead.length === 0 && (
          <Row first>
            <Caption style={{ fontSize: 16 }}>{L("Пока ничего")}</Caption>
          </Row>
        )}
        {profile.recentlyRead.map((item, index) => (
          <Row key={item.book.id} first={index === 0} onPress={() => router.push(routes.book(item.book.id))} accessibilityLabel={item.book.title}>
            <View style={styles.recentRow}>
              <View style={{ flex: 1 }}>
                <BookRow book={item.book} />
              </View>
              {item.rating != null && (
                <View style={styles.rating} accessibilityLabel={`${item.rating}/10`}>
                  <Ionicons name="star" size={12} color={theme.star} />
                  <Text style={{ fontSize: 12, color: theme.star }}>{item.rating}</Text>
                </View>
              )}
            </View>
          </Row>
        ))}
      </Section>

      {profile.lists.length > 0 && (
        <Section title={L("Списки")}>
          {profile.lists.map((list, index) => (
            <Row key={list.id} first={index === 0} onPress={() => router.push(routes.list(list.id))} accessibilityLabel={list.title}>
              <ListSummaryRow title={list.title} count={list.count} isPublic={list.isPublic} />
            </Row>
          ))}
        </Section>
      )}
    </Screen>
  );
}

function countsText(counts: UserProfile["counts"]): string {
  return [
    `${counts.read} ${plural(counts.read, "книга", "книги", "книг")}`,
    `${counts.followers} ${plural(counts.followers, "подписчик", "подписчика", "подписчиков")}`,
    `${counts.following} ${plural(counts.following, "подписка", "подписки", "подписок")}`,
  ].join(" · ");
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  initial: { fontSize: 28, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "700" },
  counts: { fontSize: 15 },
  recentRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
});
