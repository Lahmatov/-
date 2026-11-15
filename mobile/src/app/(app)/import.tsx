import * as DocumentPicker from "expo-document-picker";
import { Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { ImportKind, ImportResult } from "../../api/models";
import { useAPI } from "../../auth/AuthContext";
import { useTheme } from "../../components/theme";
import { LabelRow, Screen, Section } from "../../components/ui";
import { importResultLines } from "../../features/stats/statsLogic";
import { L } from "../../i18n";
import { showError } from "../../lib/alerts";

// Kindle — обычный текст; CSV на Android часто приходит как text/comma-separated-values или application/vnd.ms-excel.
const TYPES: Record<ImportKind, string[]> = {
  kindle: ["text/plain"],
  csv: ["text/csv", "text/comma-separated-values", "application/csv", "application/vnd.ms-excel", "text/plain"],
};

export default function ImportScreen() {
  const api = useAPI();
  const theme = useTheme();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const start = async (kind: ImportKind) => {
    if (importing) return;
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: TYPES[kind], copyToCacheDirectory: true, multiple: false });
      const asset = picked.canceled ? undefined : picked.assets[0];
      if (!asset) return;
      setImporting(true);
      setResult(null);
      setResult(await api.importFile(asset, kind));
    } catch (error) {
      showError(error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: L("Импорт") }} />
      <Screen testID="importScreen">
        <Section
          title={L("Импорт")}
          footer={L(
            "Kindle: подключите его к компьютеру, скопируйте documents/My Clippings.txt в «Файлы» и выберите здесь. У Apple Books нет экспорта — перенесите список в CSV с колонками Title, Author, Year, Status.",
          )}
        >
          <LabelRow first icon="book-outline" title={L("Kindle — My Clippings.txt")} color={theme.accent} onPress={() => void start("kindle")} testID="importKindle" />
          <LabelRow icon="grid-outline" title={L("Goodreads или CSV")} color={theme.accent} onPress={() => void start("csv")} testID="importCSV" />
        </Section>

        {importing && (
          <View style={styles.progress} accessibilityLiveRegion="polite">
            <ActivityIndicator />
            <Text style={{ color: theme.secondaryText }}>{L("Импортируем…")}</Text>
          </View>
        )}

        {result && (
          <Section title={L("Импорт завершён")}>
            {importResultLines(result).map((line, i) => (
              <LabelRow key={line} first={i === 0} icon={i === 0 ? "search-outline" : i === 1 ? "checkmark-circle-outline" : "chatbox-ellipses-outline"} title={line} />
            ))}
          </Section>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", padding: 12 },
});
