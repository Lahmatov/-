import { Ionicons } from "@expo/vector-icons";
import { useEffect, useSyncExternalStore } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useAPI } from "../auth/AuthContext";
import { L } from "../i18n";
import { useTheme } from "./theme";

/** Полоска «нет сети / ждут отправки» над вкладками. */
export function OfflineBanner() {
  const api = useAPI();
  const theme = useTheme();
  const sync = useSyncExternalStore(api.sync.subscribe, api.sync.getSnapshot);

  useEffect(() => {
    if (!sync.lastRejected) return;
    Alert.alert(L("Изменение не сохранилось"), sync.lastRejected);
    api.sync.update({ lastRejected: null });
  }, [sync.lastRejected, api]);

  if (!sync.isOffline && sync.pendingCount === 0) return null;
  return (
    <View testID="offlineBanner" accessible style={[styles.banner, { backgroundColor: theme.warningBackground }]}>
      <Ionicons name={sync.isOffline ? "cloud-offline-outline" : "sync-outline"} size={14} color={theme.text} />
      {sync.isOffline && <Text style={[styles.text, { color: theme.text }]}>{L("Нет сети — показаны сохранённые данные")}</Text>}
      {sync.pendingCount > 0 && <Text style={[styles.text, { color: theme.text }]}>{L("Ждут отправки: %@", String(sync.pendingCount))}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 12, flexWrap: "wrap" },
  text: { fontSize: 13 },
});
