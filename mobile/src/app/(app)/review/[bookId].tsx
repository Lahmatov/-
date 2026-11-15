import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { seg } from "../../../api/client";
import { dayString, formatDay } from "../../../api/dates";
import type { BookDetails, ReviewUpdate, ShelfEntry } from "../../../api/models";
import { useAPI } from "../../../auth/AuthContext";
import { RatingPicker } from "../../../components/RatingPicker";
import { useTheme } from "../../../components/theme";
import { Button, Empty, Field, Loaded, Row, Screen, Section, SwitchRow } from "../../../components/ui";
import { DayPicker } from "../../../features/books/DayPicker";
import { dayKeyToISO, entryAfterReview, isoToDayKey } from "../../../features/books/calendar";
import { L } from "../../../i18n";
import { attempt } from "../../../lib/alerts";
import { useLoad } from "../../../lib/useLoad";

/** Оценка, даты чтения, отзыв и видимость. После сохранения экран книги перезагружается при возврате. */
export default function ReviewEditorScreen() {
  const params = useLocalSearchParams<{ bookId: string }>();
  const bookId = String(params.bookId ?? "");
  const api = useAPI();
  const router = useRouter();
  const theme = useTheme();
  const state = useLoad(() => api.book(bookId), [api, bookId]);

  return (
    <>
      <Stack.Screen
        options={{
          presentation: "modal",
          title: L("Оценка и отзыв"),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" testID="review-cancel">
              <Text style={{ color: theme.accent, fontSize: 17 }}>{L("Отмена")}</Text>
            </Pressable>
          ),
        }}
      />
      <Loaded state={state}>
        {(details) =>
          details.myEntry ? (
            <ReviewForm details={details} entry={details.myEntry} />
          ) : (
            <View style={{ flex: 1, justifyContent: "center", backgroundColor: theme.groupedBackground }}>
              <Empty icon="bookmark-outline" title={L("Книги нет на полке")} message={L("Сначала отметьте статус книги.")} />
            </View>
          )
        }
      </Loaded>
    </>
  );
}

function ReviewForm({ details, entry }: { details: BookDetails; entry: ShelfEntry }) {
  const api = useAPI();
  const router = useRouter();
  const bookId = details.book.id;
  const today = dayString(new Date());
  const [rating, setRating] = useState<number | null>(entry.rating);
  const [review, setReview] = useState(entry.review ?? "");
  const [isPublic, setIsPublic] = useState(entry.isPublic);
  const initialStart = isoToDayKey(entry.startedAt);
  const initialFinish = isoToDayKey(entry.finishedAt);
  const [hasStart, setHasStart] = useState(initialStart != null);
  const [startedAt, setStartedAt] = useState(initialStart ?? today);
  const [hasFinish, setHasFinish] = useState(initialFinish != null);
  const [finishedAt, setFinishedAt] = useState(initialFinish ?? today);
  const [saving, setSaving] = useState(false);

  async function save() {
    const text = review.trim();
    const update: ReviewUpdate = {
      rating,
      review: text.length > 0 ? text : null,
      isPublic,
      startedAt: hasStart ? startedAt : null,
      finishedAt: hasFinish ? finishedAt : null,
    };
    setSaving(true);
    let done = false;
    await attempt(
      async () => {
        await api.saveReview(update, bookId);
        done = true;
      },
      () => {
        // Сохранено на телефоне, отправится при появлении сети. Обновляем офлайн-копию книги,
        // чтобы экран книги без сети показал новую оценку.
        const updated: BookDetails = { ...details, myEntry: entryAfterReview(entry, update) };
        void api.updateCachedResponse(updated, `books/${seg(bookId)}`);
        done = true;
      },
    );
    setSaving(false);
    if (done) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.back();
    }
  }

  return (
    <Screen testID="review-editor">
      <Section>
        <Row first>
          <RatingPicker rating={rating} onChange={setRating} />
        </Row>
      </Section>

      <Section>
        <DateRows
          first
          toggleTitle={L("Дата начала")}
          label={L("Начал")}
          enabled={hasStart}
          onToggle={setHasStart}
          value={startedAt}
          max={today}
          onChange={setStartedAt}
          testID="review-start"
        />
        <DateRows
          toggleTitle={L("Дата окончания")}
          label={L("Закончил")}
          enabled={hasFinish}
          onToggle={setHasFinish}
          value={finishedAt}
          max={today}
          onChange={setFinishedAt}
          testID="review-finish"
        />
      </Section>

      <Section>
        <Field
          first
          multiline
          placeholder={L("Что думаете о книге?")}
          value={review}
          onChangeText={setReview}
          testID="review-text"
          style={{ minHeight: 120 }}
        />
      </Section>

      <Section>
        <SwitchRow first title={L("Видно другим — в профиле, ленте и отзывах")} value={isPublic} onChange={setIsPublic} />
      </Section>

      <View style={{ paddingHorizontal: 16 }}>
        <Button title={L("Сохранить")} kind="prominent" onPress={() => void save()} busy={saving} testID="review-save" />
      </View>
    </Screen>
  );
}

/** Переключатель «Дата начала» и под ним выбранный день; нажатие на день открывает календарь. */
function DateRows({
  first,
  toggleTitle,
  label,
  enabled,
  onToggle,
  value,
  max,
  onChange,
  testID,
}: {
  first?: boolean;
  toggleTitle: string;
  label: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  value: string;
  max: string;
  onChange: (day: string) => void;
  testID: string;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <SwitchRow first={first} title={toggleTitle} value={enabled} onChange={onToggle} />
      {enabled && (
        <Row
          onPress={() => setExpanded((e) => !e)}
          chevron={false}
          testID={`${testID}-day`}
          accessibilityLabel={`${label}: ${formatDay(dayKeyToISO(value) ?? value)}`}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 16, color: theme.text, flex: 1 }}>{label}</Text>
            <View style={{ backgroundColor: theme.placeholder, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 16, color: expanded ? theme.accent : theme.text }}>{formatDay(dayKeyToISO(value) ?? value)}</Text>
            </View>
          </View>
        </Row>
      )}
      {enabled && expanded && (
        <Row>
          <DayPicker value={value} max={max} onChange={onChange} />
        </Row>
      )}
    </>
  );
}
