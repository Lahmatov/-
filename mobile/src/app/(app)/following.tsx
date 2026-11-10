import { router, Stack } from "expo-router";
import { useAPI } from "../../auth/AuthContext";
import { Button, Empty, Loaded, Screen, Section } from "../../components/ui";
import { UserRow } from "../../features/social/UserRow";
import { useErrorAlert } from "../../features/social/useErrorAlert";
import { useRefresh } from "../../features/social/useRefresh";
import { useReloadOnFocus } from "../../features/social/useReloadOnFocus";
import { L } from "../../i18n";
import { routes } from "../../lib/routes";
import { useLoad } from "../../lib/useLoad";

/** Люди, на которых я подписан. */
export default function FollowingScreen() {
  const api = useAPI();
  const users = useLoad(() => api.following(), [api]);
  useErrorAlert(users);
  // Отписался в профиле и вернулся — список должен это показать.
  useReloadOnFocus(users.reload);
  const { refreshing, onRefresh } = useRefresh(users.reload);

  return (
    <>
      <Stack.Screen options={{ title: L("Подписки") }} />
      <Loaded state={users}>
        {(list) => (
          <Screen refreshing={refreshing} onRefresh={onRefresh} testID="following">
            {list.length === 0 ? (
              <Empty icon="people-outline" title={L("Нет подписок")} message={L("Найдите друзей во вкладке «Лента»")}>
                <Button title={L("Найти людей")} icon="search" onPress={() => router.push(routes.findPeople())} />
              </Empty>
            ) : (
              <Section>
                {list.map((user, index) => (
                  <UserRow key={user.id} user={user} first={index === 0} />
                ))}
              </Section>
            )}
          </Screen>
        )}
      </Loaded>
    </>
  );
}
