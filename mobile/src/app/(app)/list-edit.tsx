import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { useAPI } from "../../auth/AuthContext";
import { ErrorView, Loading, Screen } from "../../components/ui";
import { useTheme } from "../../components/theme";
import { canSaveList, emptyListForm, ListForm, listFormFrom, listInput, type ListFormValue } from "../../features/lists/ListForm";
import { HeaderButton } from "../../features/social/HeaderButton";
import { L } from "../../i18n";
import { attempt } from "../../lib/alerts";
import { useLoad } from "../../lib/useLoad";

/** Новый список (без id) или правка существующего (?id=...). */
export default function ListEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const listId = typeof id === "string" && id.length > 0 ? id : null;
  const api = useAPI();
  const theme = useTheme();
  const existing = useLoad(async () => (listId ? (await api.list(listId)).list : null), [api, listId]);
  const [value, setValue] = useState<ListFormValue>(emptyListForm);
  const [prefilled, setPrefilled] = useState(listId == null);
  const [saving, setSaving] = useState(false);

  // Заполняем поля один раз, когда список загрузился.
  useEffect(() => {
    if (!prefilled && existing.data) {
      setValue(listFormFrom(existing.data));
      setPrefilled(true);
    }
  }, [existing.data, prefilled]);

  const canSave = prefilled && canSaveList(value) && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const input = listInput(value);
    const saved = await attempt(() => (listId ? api.updateList(listId, input) : api.createList(input)));
    setSaving(false);
    if (saved) router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: listId ? L("Список") : L("Новый список"),
          presentation: "modal",
          headerLeft: () => <HeaderButton title={L("Отмена")} label={L("Отмена")} onPress={() => router.back()} testID="list-edit-cancel" />,
          headerRight: () =>
            saving ? (
              <ActivityIndicator color={theme.accent} />
            ) : (
              <HeaderButton
                title={listId ? L("Сохранить") : L("Создать")}
                label={listId ? L("Сохранить") : L("Создать")}
                bold
                disabled={!canSave}
                onPress={() => void save()}
                testID="list-edit-save"
              />
            ),
        }}
      />
      {listId && !prefilled ? (
        existing.error ? (
          <ErrorView message={existing.error} onRetry={() => void existing.reload()} />
        ) : (
          <Loading />
        )
      ) : (
        <Screen testID="list-edit">
          <ListForm value={value} onChange={setValue} autoFocus={!listId} onSubmit={() => void save()} />
        </Screen>
      )}
    </>
  );
}
