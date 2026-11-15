import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { entryProgress, type ShelfEntry } from "../../api/models";
import { useAPI } from "../../auth/AuthContext";
import { ProgressBar } from "../../components/ProgressBar";
import { useTheme } from "../../components/theme";
import { Button, Caption } from "../../components/ui";
import { L } from "../../i18n";
import { attempt } from "../../lib/alerts";
import { parsePageInput } from "./calendar";

/** «Страница 120 из 350» и полоска прогресса. */
export function ProgressEditor({
  bookId,
  entry,
  pageCount,
  onSaved,
}: {
  bookId: string;
  entry: ShelfEntry;
  pageCount: number | null;
  onSaved: () => Promise<void>;
}) {
  const api = useAPI();
  const theme = useTheme();
  const [current, setCurrent] = useState(entry.currentPage != null ? String(entry.currentPage) : "");
  const [total, setTotal] = useState(() => {
    const value = entry.totalPages ?? pageCount;
    return value != null ? String(value) : "";
  });
  const [saved, setSaved] = useState<number | null>(() => entryProgress(entry, pageCount));
  const [saving, setSaving] = useState(false);

  async function save() {
    const page = parsePageInput(current);
    const pages = parsePageInput(total);
    setSaving(true);
    await attempt(
      async () => {
        const updated = await api.setProgress(page, pages, bookId);
        setSaved(entryProgress(updated, pageCount));
        await onSaved();
      },
      () => {
        // Без сети: показываем прогресс сразу, на сервер он уйдёт из очереди.
        const totalPages = pages ?? pageCount;
        if (page != null && totalPages != null && totalPages > 0) setSaved(Math.min(1, page / totalPages));
      },
    );
    setSaving(false);
  }

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.separator, backgroundColor: theme.background }];
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.text }]}>{L("Страница")}</Text>
        <TextInput
          testID="progress-current"
          value={current}
          onChangeText={setCurrent}
          placeholder="0"
          placeholderTextColor={theme.secondaryText}
          keyboardType="number-pad"
          accessibilityLabel={L("Страница")}
          style={inputStyle}
        />
        <Text style={[styles.label, { color: theme.text }]}>{L("из")}</Text>
        <TextInput
          testID="progress-total"
          value={total}
          onChangeText={setTotal}
          placeholder="?"
          placeholderTextColor={theme.secondaryText}
          keyboardType="number-pad"
          accessibilityLabel={L("Всего страниц")}
          style={inputStyle}
        />
        <View style={{ flex: 1 }} />
        <Button title={L("Сохранить")} onPress={() => void save()} busy={saving} testID="progress-save" />
      </View>
      {saved != null && (
        <View style={{ gap: 4 }}>
          <Caption>{L("Прочитано %@%%", String(Math.floor(saved * 100)))}</Caption>
          <ProgressBar value={saved} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingVertical: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 16 },
  input: { width: 64, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 16 },
});
