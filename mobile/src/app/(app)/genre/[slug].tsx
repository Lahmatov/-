import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useAPI } from "../../../auth/AuthContext";
import { BookRow } from "../../../components/BookRow";
import { Caption, Loaded, Row, Screen, Section } from "../../../components/ui";
import { RatedBookRow } from "../../../features/discover/RatedBookRow";
import { L } from "../../../i18n";
import { routes } from "../../../lib/routes";
import { useLoad } from "../../../lib/useLoad";

export default function GenreScreen() {
  const { slug = "" } = useLocalSearchParams<{ slug: string }>();
  const api = useAPI();
  const state = useLoad(async () => {
    // Лучшие в жанре — дополнительный раздел: его ошибка не мешает показать все книги.
    const [genre, top] = await Promise.all([api.genre(slug), api.top(slug).catch(() => null)]);
    return { genre, best: top?.top ?? [] };
  }, [api, slug]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await state.reload();
    setRefreshing(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: state.data?.genre.name ?? "" }} />
      <Loaded state={state}>
        {({ genre, best }) => (
          <Screen testID="genreScreen" refreshing={refreshing} onRefresh={() => void refresh()}>
            {best.length > 0 && (
              <Section title={L("Лучшее в жанре")}>
                {best.slice(0, 5).map((item, i) => (
                  <Row key={item.book.id} first={i === 0} onPress={() => router.push(routes.book(item.book.id))} accessibilityLabel={item.book.title}>
                    <RatedBookRow item={item} />
                  </Row>
                ))}
              </Section>
            )}
            <Section title={L("Все книги")}>
              {genre.books.length === 0 ? (
                <Row first>
                  <Caption style={{ fontSize: 15 }}>{L("Пока ни одной книги. Жанр можно отметить на странице книги.")}</Caption>
                </Row>
              ) : (
                genre.books.map((book, i) => (
                  <Row key={book.id} first={i === 0} onPress={() => router.push(routes.book(book.id))} accessibilityLabel={book.title}>
                    <BookRow book={book} />
                  </Row>
                ))
              )}
            </Section>
          </Screen>
        )}
      </Loaded>
    </>
  );
}
