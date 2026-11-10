import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import type { Quote, QuoteDraft } from "../../api/models";
import { useAPI } from "../../auth/AuthContext";
import { Empty, Field, Loaded, Screen, Section, SwitchRow } from "../../components/ui";
import { useTheme } from "../../components/theme";
import { L } from "../../i18n";
import { attempt } from "../../lib/alerts";
import { useLoad } from "../../lib/useLoad";

/** Новая цитата или правка своей (модальное окно). Параметры: bookId, quoteId — при правке. */
export default function QuoteEditScreen() {
  const params = useLocalSearchParams<{ bookId: string; quoteId?: string }>();
  const bookId = String(params.bookId ?? "");
  const quoteId = params.quoteId ? String(params.quoteId) : null;
  const api = useAPI();
  // Своя цитата ищется в списке «мои» на странице книги (GET без сети отдаёт сохранённую копию).
  const state = useLoad<Quote | null>(
    async () => (quoteId ? ((await api.quotes(bookId)).mine.find((q) => q.id === quoteId) ?? null) : null),
    [api, bookId, quoteId],
  );

  if (!quoteId) return <QuoteForm bookId={bookId} quote={null} />;
  return (
    <>
      <Stack.Screen options={{ title: L("Цитата"), presentation: "modal", headerLeft: () => <CancelButton /> }} />
      <Loaded state={state}>
        {(quote) => (quote ? <QuoteForm bookId={bookId} quote={quote} /> : <Empty icon="alert-circle-outline" title={L("Цитата не найдена")} />)}
      </Loaded>
    </>
  );
}

function CancelButton() {
  const theme = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
      <Text style={[styles.headerButton, { color: theme.accent }]}>{L("Отмена")}</Text>
    </Pressable>
  );
}

function QuoteForm({ bookId, quote }: { bookId: string; quote: Quote | null }) {
  const api = useAPI();
  const theme = useTheme();
  const [text, setText] = useState(quote?.text ?? "");
  const [page, setPage] = useState(quote?.page != null ? String(quote.page) : "");
  const [note, setNote] = useState(quote?.note ?? "");
  const [isPublic, setIsPublic] = useState(quote?.isPublic ?? false);
  const [saving, setSaving] = useState(false);
  const trimmed = text.trim();
  const canSave = trimmed.length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const pageNumber = parseInt(page.trim(), 10);
    const noteText = note.trim();
    const draft: QuoteDraft = {
      text: trimmed,
      page: Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : null,
      note: noteText.length > 0 ? noteText : null,
      isPublic,
    };
    const outcome = { done: false };
    await attempt(
      async () => {
        if (quote) await api.updateQuote(quote.id, draft);
        else await api.addQuote(draft, bookId);
        outcome.done = true;
      },
      // Без сети цитата уйдёт на сервер из очереди.
      () => {
        outcome.done = true;
      },
    );
    setSaving(false);
    if (outcome.done) router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: quote ? L("Цитата") : L("Новая цитата"),
          presentation: "modal",
          headerLeft: () => <CancelButton />,
          headerRight: () => (
            <Pressable onPress={() => void save()} disabled={!canSave} hitSlop={8} accessibilityRole="button" accessibilityState={{ disabled: !canSave }} testID="saveQuote">
              <Text style={[styles.headerButton, { color: theme.accent, fontWeight: "600", opacity: canSave ? 1 : 0.4 }]}>{L("Сохранить")}</Text>
            </Pressable>
          ),
        }}
      />
      <Screen>
        <Section title={L("Цитата")}>
          <Field first value={text} onChangeText={setText} multiline style={{ minHeight: 140 }} autoFocus={!quote} testID="quoteText" accessibilityLabel={L("Цитата")} />
        </Section>
        <Section>
          <Field first value={page} onChangeText={(v) => setPage(v.replace(/[^0-9]/g, ""))} placeholder={L("Страница")} keyboardType="number-pad" accessibilityLabel={L("Страница")} />
          <Field value={note} onChangeText={setNote} placeholder={L("Заметка для себя")} multiline style={{ minHeight: 44 }} accessibilityLabel={L("Заметка для себя")} />
        </Section>
        <Section footer={L("Публичные цитаты видны на странице книги. Заметка всегда остаётся личной.")}>
          <SwitchRow first title={L("Видна другим читателям")} value={isPublic} onChange={setIsPublic} />
        </Section>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: { fontSize: 17 },
});
