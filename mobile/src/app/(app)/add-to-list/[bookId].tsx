import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import type { MyList } from "../../../api/models";
import { useAPI } from "../../../auth/AuthContext";
import { Button, LabelRow, Loaded, Row, Screen, Section } from "../../../components/ui";
import { useTheme } from "../../../components/theme";
import { canSaveList, emptyListForm, ListForm, listInput, type ListFormValue } from "../../../features/lists/ListForm";
import { ListSummaryRow } from "../../../features/lists/ListSummaryRow";
import { HeaderButton } from "../../../features/social/HeaderButton";
import { useErrorAlert } from "../../../features/social/useErrorAlert";
import { L } from "../../../i18n";
import { attempt } from "../../../lib/alerts";
import { useLoad } from "../../../lib/useLoad";

/** «В списки» со страницы книги: отметки у списков, где книга уже есть, и создание нового списка с ней. */
export default function AddToListScreen() {
  const { bookId: rawId } = useLocalSearchParams<{ bookId: string }>();
  const bookId = String(rawId ?? "");
  const api = useAPI();
  const theme = useTheme();
  const lists = useLoad(() => api.myLists(bookId), [api, bookId]);
  useErrorAlert(lists);
  const [updating, setUpdating] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<ListFormValue>(emptyListForm);
  const [savingNew, setSavingNew] = useState(false);

  const toggle = async (list: MyList) => {
    if (updating) return;
    setUpdating(list.id);
    const include = !(list.containsBook ?? false);
    const done = await attempt(async () => {
      await api.setBookInList(bookId, list.id, include);
      return true;
    });
    if (done) await lists.reload();
    setUpdating(null);
  };

  const createList = async () => {
    if (!canSaveList(draft) || savingNew) return;
    setSavingNew(true);
    const created = await attempt(() => api.createList(listInput(draft)));
    if (created) {
      // Новый список сразу с этой книгой.
      await attempt(() => api.setBookInList(bookId, created.id, true));
      setDraft(emptyListForm);
      setCreating(false);
      await lists.reload();
    }
    setSavingNew(false);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: L("В списки"),
          presentation: "modal",
          headerRight: () => <HeaderButton title={L("Готово")} label={L("Готово")} bold onPress={() => router.back()} testID="add-to-list-done" />,
        }}
      />
      <Loaded state={lists}>
        {(data) => (
          <Screen testID="add-to-list">
            {data.length > 0 && (
              <Section>
                {data.map((list, index) => {
                  const checked = list.containsBook === true;
                  return (
                    <Row
                      key={list.id}
                      first={index === 0}
                      chevron={false}
                      onPress={() => void toggle(list)}
                      accessibilityLabel={list.title}
                      accessibilityState={{ checked, disabled: updating != null, busy: updating === list.id }}
                      testID={`add-to-list-${list.id}`}
                    >
                      <View style={styles.row}>
                        <ListSummaryRow title={list.title} count={list.count} isPublic={list.isPublic} />
                        {updating === list.id ? (
                          <ActivityIndicator />
                        ) : (
                          <Ionicons
                            name={checked ? "checkmark-circle" : "ellipse-outline"}
                            size={24}
                            color={checked ? theme.accent : theme.secondaryText}
                          />
                        )}
                      </View>
                    </Row>
                  );
                })}
              </Section>
            )}
            {creating ? (
              <>
                <ListForm value={draft} onChange={setDraft} autoFocus onSubmit={() => void createList()} />
                <View style={styles.actions}>
                  <Button title={L("Отмена")} kind="plain" onPress={() => setCreating(false)} />
                  <Button
                    title={L("Создать")}
                    kind="prominent"
                    busy={savingNew}
                    disabled={!canSaveList(draft)}
                    onPress={() => void createList()}
                    testID="add-to-list-create"
                  />
                </View>
              </>
            ) : (
              <Section>
                <LabelRow first icon="add" title={L("Новый список")} color={theme.accent} onPress={() => setCreating(true)} testID="add-to-list-new" />
              </Section>
            )}
          </Screen>
        )}
      </Loaded>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 16, paddingHorizontal: 16 },
});
