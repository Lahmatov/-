import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { useAPI } from "../../../auth/AuthContext";
import { useTheme } from "../../../components/theme";
import { Body, Empty, Loading, Row, Screen, Section } from "../../../components/ui";
import { RatedBookRow } from "../../../features/discover/RatedBookRow";
import { L, plural } from "../../../i18n";
import { routes } from "../../../lib/routes";
import { useLoad } from "../../../lib/useLoad";

export default function AuthorScreen() {
  const { name = "" } = useLocalSearchParams<{ name: string }>();
  const api = useAPI();
  const theme = useTheme();
  const state = useLoad(() => api.author(name), [api, name]);
  const [refreshing, setRefreshing] = useState(false);
  const author = state.data;

  const refresh = async () => {
    setRefreshing(true);
    await state.reload();
    setRefreshing(false);
  };

  const title = <Stack.Screen options={{ title: author?.name ?? name }} />;

  if (!author) {
    return (
      <>
        {title}
        {state.error ? (
          <Screen onRefresh={() => void refresh()} refreshing={refreshing}>
            <Empty icon="help-circle-outline" title={L("Автор не найден")} message={state.error} />
          </Screen>
        ) : (
          <Loading />
        )}
      </>
    );
  }

  const count = author.books.length;
  return (
    <>
      {title}
      <Screen testID="authorScreen" refreshing={refreshing} onRefresh={() => void refresh()}>
        <Section>
          <Row first>
            <View style={{ gap: 4 }}>
              <Body>{L("%@ в каталоге", `${count} ${plural(count, "книга", "книги", "книг")}`)}</Body>
              {author.avgRating != null && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="star" size={14} color={theme.star} />
                  <Text style={{ color: theme.star, fontSize: 15 }}>
                    {`${author.avgRating.toFixed(1)} · ${author.ratingsCount} ${plural(author.ratingsCount, "оценка", "оценки", "оценок")}`}
                  </Text>
                </View>
              )}
            </View>
          </Row>
        </Section>
        <Section title={L("Книги")}>
          {author.books.map((item, i) => (
            <Row key={item.book.id} first={i === 0} onPress={() => router.push(routes.book(item.book.id))} accessibilityLabel={item.book.title}>
              <RatedBookRow item={item} />
            </Row>
          ))}
        </Section>
      </Screen>
    </>
  );
}
