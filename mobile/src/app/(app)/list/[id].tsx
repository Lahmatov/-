import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert, View } from "react-native";
import type { Book, ListDetails } from "../../../api/models";
import { useAPI } from "../../../auth/AuthContext";
import { BookRow } from "../../../components/BookRow";
import { Body, Button, Caption, Empty, Loading, Row, Screen, Section } from "../../../components/ui";
import { HeaderButton, HeaderButtons } from "../../../features/social/HeaderButton";
import { shareLink } from "../../../features/social/share";
import { useErrorAlert } from "../../../features/social/useErrorAlert";
import { useRefresh } from "../../../features/social/useRefresh";
import { useReloadOnFocus } from "../../../features/social/useReloadOnFocus";
import { L } from "../../../i18n";
import { attempt, confirm } from "../../../lib/alerts";
import { routes } from "../../../lib/routes";
import { useLoad } from "../../../lib/useLoad";

/** Список книг. Владелец может изменить или удалить список и убрать из него книги. */
export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = String(id ?? "");
  const api = useAPI();
  const details = useLoad(() => api.list(listId), [api, listId]);
  useErrorAlert(details);
  // Вернулись после правки списка.
  useReloadOnFocus(details.reload);
  const { refreshing, onRefresh } = useRefresh(details.reload);
  const data = details.data;

  const deleteList = async (d: ListDetails) => {
    const ok = await confirm(L("Удалить список «%@»?", d.list.title), L("Книги останутся на полке, удалится только подборка."), L("Удалить"));
    if (!ok) return;
    const done = await attempt(async () => {
      await api.deleteList(d.list.id);
      return true;
    });
    if (done) router.back();
  };

  const showMenu = (d: ListDetails) => {
    Alert.alert(d.list.title, undefined, [
      { text: L("Изменить"), onPress: () => router.push(routes.listEdit(d.list.id)) },
      { text: L("Удалить список"), style: "destructive", onPress: () => void deleteList(d) },
      { text: L("Отмена"), style: "cancel" },
    ]);
  };

  const removeBook = async (book: Book) => {
    const done = await attempt(async () => {
      await api.setBookInList(book.id, listId, false);
      return true;
    });
    if (done) await details.reload();
  };

  const askRemove = (book: Book) => {
    Alert.alert(book.title, undefined, [
      { text: L("Убрать из списка"), style: "destructive", onPress: () => void removeBook(book) },
      { text: L("Отмена"), style: "cancel" },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: data?.list.title ?? "",
          headerRight: data
            ? () => (
                <HeaderButtons>
                  {data.list.isPublic && (
                    <HeaderButton
                      icon="share-outline"
                      label={L("Поделиться")}
                      onPress={() => shareLink(`lists/${encodeURIComponent(data.list.id)}`, data.list.title)}
                      testID="list-share"
                    />
                  )}
                  {data.isOwner && <HeaderButton icon="ellipsis-horizontal-circle" label={L("Ещё")} onPress={() => showMenu(data)} testID="list-menu" />}
                </HeaderButtons>
              )
            : undefined,
        }}
      />
      {data ? (
        <Screen refreshing={refreshing} onRefresh={onRefresh} testID="list-detail">
          <Section>
            {data.list.description != null && (
              <Row first>
                <Body>{data.list.description}</Body>
              </Row>
            )}
            <Row first={data.list.description == null} onPress={() => router.push(routes.user(data.owner.id))}>
              <Caption style={{ fontSize: 15 }}>{L("Список: %@", data.owner.name) + (data.list.isPublic ? "" : L(" · личный"))}</Caption>
            </Row>
          </Section>
          <Section footer={data.isOwner && data.books.length > 0 ? L("Чтобы убрать книгу из списка, нажмите и удерживайте её") : undefined}>
            {data.books.length === 0 && (
              <Row first>
                <Caption style={{ fontSize: 16 }}>
                  {data.isOwner ? L("Добавляйте книги через меню «⋯» на странице книги") : L("В списке пока нет книг")}
                </Caption>
              </Row>
            )}
            {data.books.map((book, index) => (
              <Row
                key={book.id}
                first={index === 0}
                onPress={() => router.push(routes.book(book.id))}
                onLongPress={data.isOwner ? () => askRemove(book) : undefined}
                accessibilityActions={data.isOwner ? [{ name: "remove", label: L("Убрать из списка") }] : undefined}
                onAccessibilityAction={(event) => {
                  if (event.nativeEvent.actionName === "remove") askRemove(book);
                }}
                accessibilityLabel={book.title}
                testID={`list-book-${book.id}`}
              >
                <BookRow book={book} />
              </Row>
            ))}
          </Section>
        </Screen>
      ) : details.error ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Empty icon="albums-outline" title={L("Список недоступен")} message={details.error}>
            <Button title={L("Повторить")} onPress={() => void details.reload()} />
          </Empty>
        </View>
      ) : (
        <Loading />
      )}
    </>
  );
}
