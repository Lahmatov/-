import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { useAPI } from "../../auth/AuthContext";
import { useTheme } from "../../components/theme";
import { Field, Screen, Section } from "../../components/ui";
import { parseYearInput } from "../../features/books/calendar";
import { L } from "../../i18n";
import { showError } from "../../lib/alerts";
import { routes } from "../../lib/routes";

/** Новая книга вручную. Если такая уже есть в каталоге, сервер вернёт её — откроется она. */
export default function AddBookScreen() {
  const params = useLocalSearchParams<{ title?: string }>();
  const api = useAPI();
  const router = useRouter();
  const theme = useTheme();
  const [title, setTitle] = useState(typeof params.title === "string" ? params.title : "");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);

  const parsedYear = parseYearInput(year);
  const canSave = title.trim().length > 0 && author.trim().length > 0 && parsedYear !== undefined;

  async function save() {
    if (!canSave || parsedYear === undefined) return;
    setSaving(true);
    try {
      const response = await api.addBook(title.trim(), author.trim(), parsedYear);
      router.replace(routes.book(response.book.id));
    } catch (error) {
      showError(error);
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          presentation: "modal",
          title: L("Новая книга"),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" testID="add-book-cancel">
              <Text style={{ color: theme.accent, fontSize: 17 }}>{L("Отмена")}</Text>
            </Pressable>
          ),
          headerRight: () =>
            saving ? (
              <ActivityIndicator />
            ) : (
              <Pressable
                onPress={() => void save()}
                disabled={!canSave}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSave }}
                testID="add-book-save"
              >
                <Text style={{ color: theme.accent, fontSize: 17, fontWeight: "600", opacity: canSave ? 1 : 0.4 }}>{L("Добавить")}</Text>
              </Pressable>
            ),
        }}
      />
      <Screen>
        <Section footer={L("Если такая книга уже есть в каталоге, откроется она.")}>
          <Field first placeholder={L("Название")} value={title} onChangeText={setTitle} testID="add-book-title" autoFocus={title.length === 0} />
          <Field placeholder={L("Автор")} value={author} onChangeText={setAuthor} testID="add-book-author" />
          <Field
            placeholder={L("Год первой публикации")}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            testID="add-book-year"
            returnKeyType="done"
            onSubmitEditing={() => void save()}
          />
        </Section>
      </Screen>
    </>
  );
}
