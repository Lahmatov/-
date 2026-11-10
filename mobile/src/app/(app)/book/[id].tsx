import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { seg } from "../../../api/client";
import { formatDay } from "../../../api/dates";
import {
  bookAuthors,
  statusActions,
  statusIcon,
  statusTitle,
  type BookDetails,
  type Genre,
  type ReadingStatus,
} from "../../../api/models";
import { useAPI } from "../../../auth/AuthContext";
import { BookCover } from "../../../components/BookCover";
import { useTheme } from "../../../components/theme";
import { Body, Button, Caption, LabelRow, Loaded, Row, Screen, Section, type IconName } from "../../../components/ui";
import { apiBaseURL } from "../../../config";
import { useActionSheet } from "../../../features/books/ActionSheet";
import { entryAfterStatus } from "../../../features/books/calendar";
import { Chip } from "../../../features/books/Chip";
import { ProgressEditor } from "../../../features/books/ProgressEditor";
import { ReviewRow } from "../../../features/books/ReviewRow";
import { useRefresh } from "../../../features/books/useRefresh";
import { useReloadOnFocus } from "../../../features/books/useReloadOnFocus";
import { QuotesSection } from "../../../features/quotes/QuotesSection";
import { L, plural } from "../../../i18n";
import { attempt, confirm, showError } from "../../../lib/alerts";
import { routes } from "../../../lib/routes";
import { useLoad } from "../../../lib/useLoad";

export default function BookScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const bookId = String(params.id ?? "");
  const api = useAPI();
  const router = useRouter();
  const theme = useTheme();
  const state = useLoad(() => api.book(bookId), [api, bookId]);
  useReloadOnFocus(state.reload);
  const refresh = useRefresh(state.reload);
  const [updating, setUpdating] = useState(false);
  const [allGenres, setAllGenres] = useState<Genre[]>([]);
  const { sheet, show } = useActionSheet();
  const detailsRef = useRef<BookDetails | undefined>(state.data);
  detailsRef.current = state.data;

  useEffect(() => {
    let cancelled = false;
    api
      .genres()
      .then((genres) => !cancelled && setAllGenres(genres))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [api]);

  /** Без сети: показываем новый статус сразу (и в офлайн-копии), на сервер он уйдёт из очереди. */
  function applyOffline(status: ReadingStatus | null) {
    const details = detailsRef.current;
    if (!details) return;
    const updated: BookDetails = { ...details, myEntry: status ? entryAfterStatus(details.myEntry, status) : null };
    state.setData(updated);
    void api.updateCachedResponse(updated, `books/${seg(bookId)}`);
  }

  async function setStatus(status: ReadingStatus) {
    setUpdating(true);
    await attempt(
      async () => {
        await api.setStatus(status, bookId);
        await state.reload();
      },
      () => applyOffline(status),
    );
    setUpdating(false);
  }

  async function removeFromShelf() {
    const ok = await confirm(L("Убрать книгу с полки?"), L("Оценка и отзыв тоже удалятся."), L("Убрать"));
    if (!ok) return;
    await attempt(
      async () => {
        await api.removeFromShelf(bookId);
        await state.reload();
      },
      () => applyOffline(null),
    );
  }

  async function addGenre(slug: string) {
    try {
      await api.addGenre(slug, bookId);
      await state.reload();
    } catch (error) {
      showError(error);
    }
  }

  function share(details: BookDetails) {
    const url = `${apiBaseURL().replace(/\/+$/, "")}/books/${seg(details.book.id)}`;
    void Share.share(Platform.OS === "ios" ? { url, title: details.book.title } : { message: url, title: details.book.title }).catch(
      () => undefined,
    );
  }

  function openMenu(details: BookDetails) {
    show({
      options: [
        { title: L("В списки…"), onPress: () => router.push(routes.addToList(bookId)) },
        { title: L("Создать клуб"), onPress: () => router.push(routes.clubNew(bookId)) },
        ...(details.myEntry ? [{ title: L("Убрать с полки"), destructive: true, onPress: () => void removeFromShelf() }] : []),
      ],
    });
  }

  function pickGenre(details: BookDetails) {
    const current = details.genres ?? [];
    const available = allGenres.filter((g) => !current.some((c) => c.slug === g.slug));
    show({
      title: current.length === 0 ? L("Отметить жанр") : L("Жанр"),
      options: available.map((g) => ({ title: g.name, onPress: () => void addGenre(g.slug) })),
    });
  }

  const details = state.data;
  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerRight: details
            ? () => (
                <View style={styles.headerButtons}>
                  <Pressable onPress={() => share(details)} hitSlop={8} accessibilityRole="button" accessibilityLabel={L("Поделиться")}>
                    <Ionicons name="share-outline" size={22} color={theme.accent} />
                  </Pressable>
                  <Pressable
                    onPress={() => openMenu(details)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={L("Ещё")}
                    testID="book-menu"
                  >
                    <Ionicons name="ellipsis-horizontal-circle-outline" size={24} color={theme.accent} />
                  </Pressable>
                </View>
              )
            : undefined,
        }}
      />
      <Loaded state={state}>
        {(d) => (
          <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="book-detail">
            <Section>
              <Row first>
                <Header details={d} />
              </Row>
            </Section>

            <Section title={L("Жанры")}>
              <Row first>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {(d.genres ?? []).map((g) => (
                    <Chip key={g.slug} title={g.name} onPress={() => router.push(routes.genre(g.slug))} />
                  ))}
                  <Chip
                    outlined
                    icon="add"
                    title={(d.genres ?? []).length === 0 ? L("Отметить жанр") : L("Жанр")}
                    onPress={() => pickGenre(d)}
                  />
                </ScrollView>
              </Row>
            </Section>

            <Section title={L("Моя полка")}>
              {d.myEntry && (
                <Row first>
                  <View style={styles.statusLabel} testID="book-status">
                    <Ionicons name={statusIcon(d.myEntry.status) as IconName} size={20} color={theme.accent} />
                    <Text style={[styles.statusText, { color: theme.accent }]}>{statusTitle(d.myEntry.status)}</Text>
                  </View>
                </Row>
              )}
              <Row first={!d.myEntry}>
                <View style={styles.statusButtons}>
                  {statusActions(d.myEntry?.status).map((action, i) => (
                    <Button
                      key={action.target}
                      title={action.title}
                      kind={i === 0 ? "prominent" : "bordered"}
                      disabled={updating}
                      onPress={() => void setStatus(action.target)}
                      testID={`status-${action.target}`}
                    />
                  ))}
                </View>
              </Row>
              {d.myEntry && (d.myEntry.status === "READING" || d.myEntry.status === "PAUSED") && (
                <Row>
                  <ProgressEditor
                    key={`progress-${d.myEntry.status}`}
                    bookId={d.book.id}
                    entry={d.myEntry}
                    pageCount={d.book.pageCount}
                    onSaved={state.reload}
                  />
                </Row>
              )}
            </Section>

            {d.myEntry && (
              <Section title={L("Оценка и отзыв")}>
                <MyReview details={d} />
                <LabelRow
                  icon="create-outline"
                  title={d.myEntry.rating == null && d.myEntry.review == null ? L("Оценить и написать отзыв") : L("Изменить")}
                  onPress={() => router.push(routes.review(bookId))}
                  testID="edit-review"
                />
              </Section>
            )}

            <QuotesSection bookId={d.book.id} />

            <Section title={L("Отзывы читателей")}>
              {d.reviews.length === 0 ? (
                <Row first>
                  <Caption style={{ fontSize: 16 }}>{L("Пока никто не оставил отзыв")}</Caption>
                </Row>
              ) : (
                d.reviews.map((review, i) => <ReviewRow key={review.id} review={review} first={i === 0} />)
              )}
            </Section>
          </Screen>
        )}
      </Loaded>
      {sheet}
    </>
  );
}

function Header({ details }: { details: BookDetails }) {
  const theme = useTheme();
  const router = useRouter();
  const { book, stats } = details;
  const meta = [book.year != null ? String(book.year) : null, book.pageCount != null ? L("%@ стр.", String(book.pageCount)) : null].filter(
    (x): x is string => x != null,
  );
  return (
    <View style={styles.header}>
      <BookCover url={book.coverUrl} title={book.title} width={100} />
      <View style={styles.headerText}>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          {book.title}
        </Text>
        {/* Каждый соавтор — ссылка на свою страницу. */}
        {bookAuthors(book).map((name) => (
          <Pressable
            key={name}
            onPress={() => router.push(routes.author(name))}
            accessibilityRole="link"
            style={({ pressed }) => pressed && { opacity: 0.6 }}
          >
            <Text style={[styles.author, { color: theme.accent }]}>{name}</Text>
          </Pressable>
        ))}
        {meta.length > 0 && <Text style={[styles.meta, { color: theme.secondaryText }]}>{meta.join(" · ")}</Text>}
        <View style={styles.stats}>
          <View>
            <Text style={[styles.statValue, { color: theme.star }]}>
              {stats.avgRating != null ? `★ ${stats.avgRating.toFixed(1)}` : "—"}
            </Text>
            <Caption>
              {stats.ratingsCount} {plural(stats.ratingsCount, "оценка", "оценки", "оценок")}
            </Caption>
          </View>
          <View>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.readersCount}</Text>
            <Caption>{L("прочитали")}</Caption>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Моя оценка, даты, отзыв и видимость — редактируются на отдельном экране. */
function MyReview({ details }: { details: BookDetails }) {
  const theme = useTheme();
  const entry = details.myEntry;
  if (!entry) return null;
  const dates = [
    entry.startedAt ? L("Начал %@", formatDay(entry.startedAt)) : null,
    entry.finishedAt ? L("Закончил %@", formatDay(entry.finishedAt)) : null,
  ].filter((x): x is string => x != null);
  return (
    <Row first>
      <View style={{ gap: 6 }} testID="my-review">
        {entry.rating != null ? (
          <View style={styles.myRating} accessibilityLabel={`${entry.rating} / 10`}>
            {Array.from({ length: 10 }, (_, i) => (
              <Ionicons key={i} name={i < (entry.rating ?? 0) ? "star" : "star-outline"} size={16} color={i < (entry.rating ?? 0) ? theme.star : theme.secondaryText} />
            ))}
            <Text style={[styles.meta, { color: theme.star, marginLeft: 6 }]}>{entry.rating}/10</Text>
          </View>
        ) : (
          <Caption style={{ fontSize: 15 }}>{L("Без оценки")}</Caption>
        )}
        {dates.length > 0 && <Caption>{dates.join(" · ")}</Caption>}
        {entry.review != null && <Body>{entry.review}</Body>}
        <View style={styles.privacy}>
          <Ionicons name={entry.isPublic ? "eye-outline" : "lock-closed-outline"} size={14} color={theme.secondaryText} />
          <Caption>{entry.isPublic ? L("Видно другим") : L("Видно только вам")}</Caption>
        </View>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  headerButtons: { flexDirection: "row", alignItems: "center", gap: 18 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 16, paddingVertical: 4 },
  headerText: { flex: 1, gap: 6 },
  title: { fontSize: 22, fontWeight: "700" },
  author: { fontSize: 16 },
  meta: { fontSize: 14 },
  stats: { flexDirection: "row", gap: 20, marginTop: 4 },
  statValue: { fontSize: 20, fontWeight: "700" },
  chips: { gap: 8, alignItems: "center" },
  statusLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusText: { fontSize: 16 },
  statusButtons: { gap: 8, paddingVertical: 4 },
  myRating: { flexDirection: "row", alignItems: "center", gap: 2 },
  privacy: { flexDirection: "row", alignItems: "center", gap: 4 },
});
