import { router, useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { errorMessage } from "../../../api/client";
import type { Feed, FeedItem } from "../../../api/models";
import { useAPI } from "../../../auth/AuthContext";
import { Button, Empty, ErrorView, Loading } from "../../../components/ui";
import { useTheme } from "../../../components/theme";
import { FeedRow } from "../../../features/social/FeedRow";
import { appendPage } from "../../../features/social/feedPages";
import { HeaderButton, HeaderButtons } from "../../../features/social/HeaderButton";
import { useErrorAlert } from "../../../features/social/useErrorAlert";
import { useRefresh } from "../../../features/social/useRefresh";
import { useReloadOnFocus } from "../../../features/social/useReloadOnFocus";
import { L } from "../../../i18n";
import { useLoad } from "../../../lib/useLoad";
import { routes } from "../../../lib/routes";

/** Лента: что отмечают люди, на которых я подписан. Страницы подгружаются при прокрутке вниз. */
export default function FeedScreen() {
  const api = useAPI();
  const theme = useTheme();
  const navigation = useNavigation();
  const feed = useLoad(() => api.feed(), [api]);
  useErrorAlert(feed);
  const [unread, setUnread] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  // Растёт при каждой перезагрузке: страница, запрошенная до неё, уже не к месту.
  const generation = useRef(0);
  const loadingMoreRef = useRef(false);

  const loadUnread = useCallback(async () => {
    try {
      setUnread((await api.notifications()).unread);
    } catch {
      // Счётчик не важен настолько, чтобы показывать ошибку.
    }
  }, [api]);

  const reload = useCallback(async () => {
    generation.current += 1;
    setMoreError(null);
    await Promise.all([feed.reload(), loadUnread()]);
  }, [feed.reload, loadUnread]);

  // Счётчик непрочитанных: при открытии и после возврата с экрана уведомлений.
  useEffect(() => {
    void loadUnread();
  }, [loadUnread]);
  useReloadOnFocus(loadUnread);

  const { refreshing, onRefresh } = useRefresh(reload);

  /** retry — повтор после ошибки (иначе после ошибки страницы не догружаются сами при прокрутке). */
  const loadMore = useCallback(async (retry = false) => {
    const cursor = feed.data?.nextCursor;
    if (!cursor || loadingMoreRef.current || (moreError && !retry)) return;
    const current = generation.current;
    loadingMoreRef.current = true;
    setMoreError(null);
    setLoadingMore(true);
    try {
      const next = await api.feed(cursor);
      if (current !== generation.current) return;
      feed.setData((existing) => (existing ? appendPage(existing, next) : next));
    } catch (error) {
      if (current === generation.current) setMoreError(errorMessage(error));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [api, feed.data?.nextCursor, feed.setData, moreError]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderButtons>
          <HeaderButton icon="people-circle-outline" label={L("Книжные клубы")} onPress={() => router.push(routes.clubs())} testID="feed-clubs" />
          <HeaderButton icon="person-add-outline" label={L("Найти людей")} onPress={() => router.push(routes.findPeople())} testID="feed-find-people" />
          <HeaderButton
            icon={unread > 0 ? "notifications" : "notifications-outline"}
            badge={unread > 0}
            label={unread > 0 ? L("Уведомления, новых: %@", String(unread)) : L("Уведомления")}
            onPress={() => router.push(routes.notifications())}
            testID="feed-notifications"
          />
        </HeaderButtons>
      ),
      headerRightContainerStyle: { paddingRight: 16 },
    });
  }, [navigation, unread]);

  if (feed.data === undefined) {
    if (feed.error) return <ErrorView message={feed.error} onRetry={() => void reload()} />;
    return <Loading />;
  }

  const data = feed.data;
  return (
    <FlatList
      testID="feed-list"
      style={{ flex: 1, backgroundColor: theme.groupedBackground }}
      contentContainerStyle={data.items.length === 0 ? styles.emptyContainer : undefined}
      contentInsetAdjustmentBehavior="automatic"
      data={data.items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<FeedEmpty feed={data} />}
      ListFooterComponent={
        data.nextCursor != null && data.items.length > 0 ? (
          <View style={styles.footer}>
            {loadingMore ? (
              <ActivityIndicator />
            ) : moreError ? (
              <Button title={L("Показать ещё")} onPress={() => void loadMore(true)} kind="plain" testID="feed-load-more" />
            ) : null}
          </View>
        ) : undefined
      }
    />
  );
}

function renderItem({ item }: { item: FeedItem }) {
  return <FeedRow item={item} />;
}

function FeedEmpty({ feed }: { feed: Feed }) {
  if (feed.followingCount === 0) {
    return (
      <Empty
        icon="people-outline"
        title={L("Подпишитесь на друзей")}
        message={L("Найдите их по имени или нажмите на автора отзыва на странице книги")}
      >
        <Button title={L("Найти людей")} icon="search" kind="prominent" onPress={() => router.push(routes.findPeople())} testID="feed-empty-find-people" />
      </Empty>
    );
  }
  return <Empty icon="chatbubbles-outline" title={L("Пока тихо")} message={L("Ваши подписки ещё ничего не отметили")} />;
}

const styles = StyleSheet.create({
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  footer: { paddingVertical: 16, alignItems: "center", minHeight: 52 },
});
