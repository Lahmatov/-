import { router, Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useAPI } from "../../auth/AuthContext";
import { Button, Empty, Loaded, Row, Screen, Section } from "../../components/ui";
import { CoverStack, ListSummaryRow } from "../../features/lists/ListSummaryRow";
import { HeaderButton } from "../../features/social/HeaderButton";
import { useErrorAlert } from "../../features/social/useErrorAlert";
import { useRefresh } from "../../features/social/useRefresh";
import { useReloadOnFocus } from "../../features/social/useReloadOnFocus";
import { L } from "../../i18n";
import { routes } from "../../lib/routes";
import { useLoad } from "../../lib/useLoad";

/** Мои списки (подборки книг). */
export default function MyListsScreen() {
  const api = useAPI();
  const lists = useLoad(() => api.myLists(), [api]);
  useErrorAlert(lists);
  // После создания списка, правки или удаления на другом экране.
  useReloadOnFocus(lists.reload);
  const { refreshing, onRefresh } = useRefresh(lists.reload);

  return (
    <>
      <Stack.Screen
        options={{
          title: L("Мои списки"),
          headerRight: () => <HeaderButton icon="add" label={L("Новый список")} onPress={() => router.push(routes.listEdit())} testID="lists-new" />,
        }}
      />
      <Loaded state={lists}>
        {(data) => (
          <Screen refreshing={refreshing} onRefresh={onRefresh} testID="my-lists">
            {data.length === 0 ? (
              <Empty
                icon="albums-outline"
                title={L("Списков пока нет")}
                message={L("Соберите подборку: «Лучшее за год», «Посоветовать маме», «Взять в отпуск»")}
              >
                <Button title={L("Новый список")} icon="add" onPress={() => router.push(routes.listEdit())} />
              </Empty>
            ) : (
              <Section>
                {data.map((list, index) => (
                  <Row key={list.id} first={index === 0} onPress={() => router.push(routes.list(list.id))} accessibilityLabel={list.title} testID={`list-${list.id}`}>
                    <View style={styles.row}>
                      <CoverStack covers={list.covers} />
                      <ListSummaryRow title={list.title} count={list.count} isPublic={list.isPublic} />
                    </View>
                  </Row>
                ))}
              </Section>
            )}
          </Screen>
        )}
      </Loaded>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
});
