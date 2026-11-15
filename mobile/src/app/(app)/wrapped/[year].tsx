import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import type { Wrapped } from "../../../api/models";
import { useAPI } from "../../../auth/AuthContext";
import { useTheme } from "../../../components/theme";
import { Button, Loaded } from "../../../components/ui";
import { wrappedBooksLabel, wrappedFacts, wrappedShareText } from "../../../features/stats/statsLogic";
import { L } from "../../../i18n";
import { showError } from "../../../lib/alerts";
import { useLoad } from "../../../lib/useLoad";

/** «Итоги года» карточкой; делимся текстом итогов (картинку без нативного рендера не собрать). */
export default function WrappedScreen() {
  const params = useLocalSearchParams<{ year: string }>();
  const year = Number(params.year) || new Date().getFullYear();
  const api = useAPI();
  const theme = useTheme();
  const state = useLoad(() => api.wrapped(year), [api, year]);

  const share = async (wrapped: Wrapped) => {
    try {
      await Share.share({ message: wrappedShareText(wrapped), title: L("Итоги %@", String(year)) });
    } catch (error) {
      showError(error);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: L("Итоги %@", String(year)) }} />
      <Loaded state={state}>
        {(wrapped) => (
          <ScrollView style={{ flex: 1, backgroundColor: theme.groupedBackground }} contentContainerStyle={styles.content} testID="wrappedScreen">
            <WrappedCard wrapped={wrapped} />
            <Button title={L("Поделиться")} icon="share-outline" kind="prominent" onPress={() => void share(wrapped)} testID="shareWrapped" />
          </ScrollView>
        )}
      </Loaded>
    </>
  );
}

function WrappedCard({ wrapped }: { wrapped: Wrapped }) {
  const theme = useTheme();
  const color = theme.onAccent;
  const facts = wrappedFacts(wrapped);
  return (
    <View style={[styles.card, { backgroundColor: theme.accent }]} accessible accessibilityLabel={wrappedShareText(wrapped)}>
      <Text style={[styles.kicker, { color }]}>{L("ИТОГИ %@", String(wrapped.year))}</Text>
      <View>
        <Text style={[styles.count, { color }]}>{wrapped.booksRead}</Text>
        <Text style={[styles.countLabel, { color }]}>{wrappedBooksLabel(wrapped)}</Text>
      </View>
      <View style={{ flex: 1 }} />
      {facts.map(([label, value]) => (
        <View key={label} style={{ gap: 1 }}>
          <Text style={[styles.factLabel, { color }]}>{label}</Text>
          <Text style={[styles.factValue, { color }]} numberOfLines={2}>
            {value}
          </Text>
        </View>
      ))}
      <View style={{ flex: 1 }} />
      <Text style={[styles.footer, { color }]}>{L("%@ · Книжная полка", wrapped.name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20 },
  card: { aspectRatio: 4 / 5, borderRadius: 24, padding: 24, gap: 14, overflow: "hidden" },
  kicker: { fontSize: 12, fontWeight: "700", letterSpacing: 3 },
  count: { fontSize: 88, fontWeight: "900", lineHeight: 96 },
  countLabel: { fontSize: 20, fontWeight: "700" },
  factLabel: { fontSize: 11, opacity: 0.7 },
  factValue: { fontSize: 17, fontWeight: "600" },
  footer: { fontSize: 12, opacity: 0.7 },
});
