import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { Book } from "../../api/models";
import { useAPI } from "../../auth/AuthContext";
import { BookRow } from "../../components/BookRow";
import { Body, Field, Row, Screen, Section } from "../../components/ui";
import { useTheme } from "../../components/theme";
import { clubBookChoices } from "../../features/clubs/clubText";
import { L } from "../../i18n";
import { attempt } from "../../lib/alerts";
import { routes } from "../../lib/routes";
import { useLoad } from "../../lib/useLoad";

/** Новый клуб (модальное окно): название, книга (из параметра bookId или с полки), число глав. */
export default function NewClubScreen() {
  const params = useLocalSearchParams<{ bookId?: string }>();
  const fixedBookId = params.bookId ? String(params.bookId) : null;
  const api = useAPI();
  const theme = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [chapters, setChapters] = useState("");
  const [bookId, setBookId] = useState<string | null>(fixedBookId);
  const [saving, setSaving] = useState(false);

  // Книга передана со страницы книги — показываем её; иначе выбор с полки.
  const books = useLoad<Book[]>(
    async () => (fixedBookId ? [(await api.book(fixedBookId)).book] : clubBookChoices(await api.shelf())),
    [api, fixedBookId],
  );

  useEffect(() => {
    if (!bookId && books.data && books.data.length > 0) setBookId(books.data[0].id);
  }, [books.data, bookId]);

  const canCreate = name.trim().length > 0 && bookId != null && !saving;

  const create = async () => {
    if (!canCreate || !bookId) return;
    setSaving(true);
    const text = description.trim();
    const count = parseInt(chapters.trim(), 10);
    const id = await attempt(() =>
      api.createClub({
        name: name.trim(),
        description: text.length > 0 ? text : null,
        bookId,
        chapters: Number.isFinite(count) && count > 0 ? count : null,
      }),
    );
    setSaving(false);
    if (id) {
      router.back();
      router.push(routes.club(id));
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: L("Новый клуб"),
          presentation: "modal",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.headerButton, { color: theme.accent }]}>{L("Отмена")}</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => void create()} disabled={!canCreate} hitSlop={8} accessibilityRole="button" accessibilityState={{ disabled: !canCreate }} testID="createClubSave">
              <Text style={[styles.headerButton, { color: theme.accent, fontWeight: "600", opacity: canCreate ? 1 : 0.4 }]}>{L("Создать")}</Text>
            </Pressable>
          ),
        }}
      />
      <Screen>
        <Section>
          <Field first value={name} onChangeText={setName} placeholder={L("Название клуба")} accessibilityLabel={L("Название клуба")} autoFocus testID="clubName" />
          <Field value={description} onChangeText={setDescription} placeholder={L("Описание (необязательно)")} multiline style={{ minHeight: 60 }} accessibilityLabel={L("Описание (необязательно)")} />
        </Section>

        <Section title={L("Книга")}>
          {books.data === undefined && !books.error && (
            <Row first>
              <ActivityIndicator />
            </Row>
          )}
          {books.data === undefined && !!books.error && (
            <Row first onPress={() => void books.reload()} chevron={false}>
              <Body style={{ color: theme.secondaryText }}>{books.error}</Body>
              <Body style={{ color: theme.accent }}>{L("Повторить")}</Body>
            </Row>
          )}
          {books.data?.length === 0 && (
            <Row first>
              <Body style={{ color: theme.secondaryText }}>{L("Добавьте книгу на полку — её можно будет выбрать для клуба.")}</Body>
            </Row>
          )}
          {books.data?.map((book, i) => {
            const selected = book.id === bookId;
            return fixedBookId ? (
              <Row key={book.id} first={i === 0}>
                <BookRow book={book} />
              </Row>
            ) : (
              <Pressable key={book.id} onPress={() => setBookId(book.id)} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={book.title}>
                <Row first={i === 0}>
                  <View style={styles.choice}>
                    <Text style={[styles.body, { color: theme.text, flex: 1 }]} numberOfLines={2}>
                      {book.title}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={20} color={theme.accent} />}
                  </View>
                </Row>
              </Pressable>
            );
          })}
        </Section>

        <Section footer={L("Обсуждение делится по главам: сообщения о главах, до которых участник ещё не дочитал, скрыты.")}>
          <Field
            first
            value={chapters}
            onChangeText={(v) => setChapters(v.replace(/[^0-9]/g, ""))}
            placeholder={L("Глав в книге (необязательно)")}
            keyboardType="number-pad"
            accessibilityLabel={L("Глав в книге (необязательно)")}
          />
        </Section>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: { fontSize: 17 },
  body: { fontSize: 16 },
  choice: { flexDirection: "row", alignItems: "center", gap: 8 },
});
