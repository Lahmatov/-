import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { formatRelative } from "../../api/dates";
import type { AppNotification } from "../../api/models";
import { useAPI } from "../../auth/AuthContext";
import { Empty, Loaded, Row, Screen, Section } from "../../components/ui";
import { useTheme } from "../../components/theme";
import { useErrorAlert } from "../../features/social/useErrorAlert";
import { useRefresh } from "../../features/social/useRefresh";
import { L } from "../../i18n";
import { clearBadge } from "../../lib/push";
import { routes } from "../../lib/routes";
import { useLoad } from "../../lib/useLoad";

/** Новые подписчики, лайки и комментарии. При открытии всё отмечается прочитанным. */
export default function NotificationsScreen() {
  const api = useAPI();
  const list = useLoad(() => api.notifications(), [api]);
  useErrorAlert(list);
  const { refreshing, onRefresh } = useRefresh(list.reload);
  const loaded = list.data !== undefined;

  // Как в iOS-версии: отмечаем прочитанным после того, как список показан (точки «новое» видны в этот раз).
  useEffect(() => {
    if (!loaded) return;
    void api.markNotificationsRead().catch(() => undefined);
    void clearBadge();
  }, [api, loaded]);

  return (
    <>
      <Stack.Screen options={{ title: L("Уведомления") }} />
      <Loaded state={list}>
        {(data) => (
          <Screen refreshing={refreshing} onRefresh={onRefresh} testID="notifications">
            {data.items.length === 0 ? (
              <Empty icon="notifications-outline" title={L("Пока ничего")} message={L("Здесь появятся новые подписчики, лайки и комментарии к вашим отзывам")} />
            ) : (
              <Section>
                {data.items.map((item, index) => (
                  <NotificationRow key={item.id} item={item} first={index === 0} />
                ))}
              </Section>
            )}
          </Screen>
        )}
      </Loaded>
    </>
  );
}

function NotificationRow({ item, first }: { item: AppNotification; first: boolean }) {
  const theme = useTheme();
  const open = () => router.push(item.book ? routes.book(item.book.id) : routes.user(item.actor.id));
  const when = formatRelative(item.createdAt);
  return (
    <Row
      first={first}
      onPress={open}
      testID={`notification-${item.id}`}
      accessibilityLabel={[item.read ? null : L("Новое"), item.text, when].filter(Boolean).join(", ")}
    >
      <View style={styles.row}>
        {!item.read && <View style={[styles.dot, { backgroundColor: theme.accent }]} />}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.text, { color: theme.text }]}>{item.text}</Text>
          <Text style={[styles.caption, { color: theme.secondaryText }]}>{when}</Text>
        </View>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  text: { fontSize: 16 },
  caption: { fontSize: 12 },
});
