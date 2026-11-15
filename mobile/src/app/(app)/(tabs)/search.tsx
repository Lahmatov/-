import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { bookSubtitle, type OpenLibraryHit, type SearchResults } from "../../../api/models";
import { useAPI } from "../../../auth/AuthContext";
import { BookCover } from "../../../components/BookCover";
import { BookRow } from "../../../components/BookRow";
import { useTheme } from "../../../components/theme";
import { Caption, LabelRow, Row, Screen, Section } from "../../../components/ui";
import { DiscoverSections } from "../../../features/discover/DiscoverSections";
import { L } from "../../../i18n";
import { showError } from "../../../lib/alerts";
import { routes } from "../../../lib/routes";

/** Пауза после ввода, чтобы не отправлять запрос на каждую букву. */
const SEARCH_DELAY_MS = 350;

export default function SearchScreen() {
  const api = useAPI();
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  // Подборки сами загружают данные; pull-to-refresh пересоздаёт их, чтобы загрузить заново.
  const [discoverKey, setDiscoverKey] = useState(0);
  const trimmed = query.trim();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => router.push(routes.scan())}
          hitSlop={8}
          style={{ marginHorizontal: 16 }}
          accessibilityRole="button"
          accessibilityLabel={L("Сканировать штрихкод")}
          testID="scan-barcode"
        >
          <Ionicons name="barcode-outline" size={26} color={theme.accent} />
        </Pressable>
      ),
    });
  }, [navigation, router, theme.accent]);

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults(null);
      setSearching(false); // поиск, который шёл для прежнего запроса, отменён
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      api
        .search(trimmed)
        .then((found) => {
          if (!cancelled) setResults(found);
        })
        .catch((error: unknown) => {
          if (!cancelled) showError(error);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [api, trimmed]);

  async function add(hit: OpenLibraryHit) {
    setAddingKey(hit.key);
    try {
      const book = await api.addFromOpenLibrary(hit);
      router.push(routes.book(book.id));
    } catch (error) {
      showError(error);
    } finally {
      setAddingKey(null);
    }
  }

  function addManually() {
    // Форма откроется с введённым названием.
    router.push(routes.addBook(trimmed));
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.groupedBackground }}>
      <View style={[styles.searchBar, { backgroundColor: theme.card, borderBottomColor: theme.separator }]}>
        <View style={[styles.field, { backgroundColor: theme.placeholder }]}>
          <Ionicons name="search" size={17} color={theme.secondaryText} />
          <TextInput
            testID="search-field"
            value={query}
            onChangeText={setQuery}
            placeholder={L("Название или автор")}
            placeholderTextColor={theme.secondaryText}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel={L("Поиск")}
            style={[styles.input, { color: theme.text }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityRole="button" accessibilityLabel={L("Очистить")}>
              <Ionicons name="close-circle" size={17} color={theme.secondaryText} />
            </Pressable>
          )}
        </View>
        {searching && <ActivityIndicator style={{ marginTop: 8 }} />}
      </View>

      {trimmed.length === 0 ? (
        <Screen refreshing={false} onRefresh={() => setDiscoverKey((k) => k + 1)} testID="search-discover">
          <DiscoverSections key={discoverKey} />
        </Screen>
      ) : (
        <Screen testID="search-results">
          {results && results.local.length > 0 && (
            <Section title={L("В каталоге")}>
              {results.local.map((book, i) => (
                <Row key={book.id} first={i === 0} onPress={() => router.push(routes.book(book.id))}>
                  <BookRow book={book} />
                </Row>
              ))}
            </Section>
          )}
          {results && results.openLibrary.length > 0 && (
            <Section title="Open Library">
              {results.openLibrary.map((hit, i) => (
                <Pressable
                  key={hit.key}
                  onPress={() => void add(hit)}
                  disabled={addingKey != null}
                  accessibilityRole="button"
                  accessibilityHint={L("Добавить в каталог и открыть")}
                  accessibilityState={{ disabled: addingKey != null, busy: addingKey === hit.key }}
                  style={({ pressed }) => pressed && { opacity: 0.6 }}
                >
                  <Row first={i === 0} chevron={false}>
                    <View style={styles.hit}>
                      <BookCover url={hit.coverUrl} title={hit.title} />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[styles.hitTitle, { color: theme.text }]} numberOfLines={2}>
                          {hit.title}
                        </Text>
                        <Text style={[styles.hitSubtitle, { color: theme.secondaryText }]} numberOfLines={1}>
                          {bookSubtitle(hit)}
                        </Text>
                      </View>
                      {addingKey === hit.key ? (
                        <ActivityIndicator />
                      ) : (
                        <Ionicons name="add-circle" size={28} color={theme.accent} style={addingKey != null && { opacity: 0.4 }} />
                      )}
                    </View>
                  </Row>
                </Pressable>
              ))}
            </Section>
          )}
          {results && results.local.length === 0 && results.openLibrary.length === 0 && !searching && (
            <Caption style={styles.nothing}>{L("Ничего не нашлось")}</Caption>
          )}
          <Section footer={L("Если книги нет ни у нас, ни в Open Library")}>
            <LabelRow first icon="create-outline" title={L("Добавить книгу вручную")} onPress={addManually} testID="add-manually" />
          </Section>
        </Screen>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  field: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 10, minHeight: 38 },
  input: { flex: 1, fontSize: 17, paddingVertical: 8 },
  hit: { flexDirection: "row", alignItems: "center", gap: 12 },
  hitTitle: { fontSize: 16, fontWeight: "600" },
  hitSubtitle: { fontSize: 14 },
  nothing: { fontSize: 16, paddingHorizontal: 32 },
});
