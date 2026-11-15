import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAPI } from "../../auth/AuthContext";
import { BookRow } from "../../components/BookRow";
import { Caption, Empty, LabelRow, Row, Section } from "../../components/ui";
import { L } from "../../i18n";
import { routes } from "../../lib/routes";
import { useLoad } from "../../lib/useLoad";
import { loadDiscover } from "./loadDiscover";
import { RatedBookRow } from "./RatedBookRow";

/**
 * Обзор во вкладке «Поиск», пока запрос пустой: рекомендации, лучшие, популярное, жанры.
 * Возвращает секции без своей прокрутки — встраивается в Screen экрана поиска.
 */
export function DiscoverSections() {
  const api = useAPI();
  const state = useLoad(() => loadDiscover(api), [api]);
  const data = state.data;

  if (!data) {
    return (
      <View style={{ padding: 24 }}>
        <ActivityIndicator />
      </View>
    );
  }

  const { recommendations, top, genres } = data;
  const best = top?.top ?? [];
  const trending = top?.trending ?? [];

  if (recommendations.length === 0 && best.length === 0 && genres.length === 0) {
    return <Empty icon="search-outline" title={L("Найдите книгу")} message={L("Ищем по названию, автору и ISBN в нашем каталоге и в Open Library")} />;
  }

  return (
    <>
      {recommendations.length > 0 && (
        <Section title={L("Что почитать дальше")} footer={L("По вашим оценкам: книги, которые высоко оценили читатели с похожим вкусом.")}>
          {recommendations.slice(0, 8).map((item, i) => (
            <Row key={item.book.id} first={i === 0} onPress={() => router.push(routes.book(item.book.id))} accessibilityLabel={item.book.title}>
              <View style={{ gap: 4 }}>
                <BookRow book={item.book} />
                <Caption>{item.reason}</Caption>
              </View>
            </Row>
          ))}
        </Section>
      )}

      {best.length > 0 && (
        <Section title={L("Лучшие по оценкам")}>
          {best.slice(0, 8).map((item, i) => (
            <Row key={item.book.id} first={i === 0} onPress={() => router.push(routes.book(item.book.id))} accessibilityLabel={item.book.title}>
              <RatedBookRow item={item} />
            </Row>
          ))}
        </Section>
      )}

      {trending.length > 0 && (
        <Section title={L("Популярное за месяц")}>
          {trending.slice(0, 8).map((item, i) => (
            <Row key={item.book.id} first={i === 0} onPress={() => router.push(routes.book(item.book.id))} accessibilityLabel={item.book.title}>
              <BookRow book={item.book} />
            </Row>
          ))}
        </Section>
      )}

      {genres.length > 0 && (
        <Section title={L("Жанры")}>
          {genres.map((genre, i) => (
            <LabelRow key={genre.slug} first={i === 0} title={genre.name} value={String(genre.count)} onPress={() => router.push(routes.genre(genre.slug))} />
          ))}
        </Section>
      )}
    </>
  );
}
