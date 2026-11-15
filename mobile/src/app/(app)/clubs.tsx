import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAPI } from "../../auth/AuthContext";
import { BookCover } from "../../components/BookCover";
import { Button, Empty, Loaded, Row, Screen, Section } from "../../components/ui";
import { useTheme } from "../../components/theme";
import { HeaderIconButton, JoinByCodeSection } from "../../features/challenges/CommunityControls";
import { L } from "../../i18n";
import { attempt } from "../../lib/alerts";
import { routes } from "../../lib/routes";
import { useLoad } from "../../lib/useLoad";

/** Мои книжные клубы: создать новый или вступить по коду приглашения. */
export default function ClubsScreen() {
  const api = useAPI();
  const theme = useTheme();
  const state = useLoad(() => api.clubs(), [api]);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // После создания клуба, выхода из него или вступления список обновляется при возврате на экран.
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) void state.reload();
      focusedOnce.current = true;
    }, [state.reload]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await state.reload();
    setRefreshing(false);
  };

  const join = async () => {
    const value = code.trim();
    if (!value) return;
    setJoining(true);
    const id = await attempt(() => api.joinClub(value));
    setJoining(false);
    if (id) {
      setCode("");
      router.push(routes.club(id));
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: L("Книжные клубы"),
          headerRight: () => <HeaderIconButton icon="add" label={L("Создать клуб")} onPress={() => router.push(routes.clubNew())} testID="createClub" />,
        }}
      />
      <Loaded state={state}>
        {(clubs) => (
          <Screen refreshing={refreshing} onRefresh={() => void refresh()} testID="clubs">
            {clubs.length === 0 ? (
              <Empty icon="people-outline" title={L("Клубов пока нет")} message={L("Читайте одну книгу вместе с друзьями и обсуждайте её по главам — без спойлеров.")}>
                <Button title={L("Создать клуб")} kind="prominent" onPress={() => router.push(routes.clubNew())} />
              </Empty>
            ) : (
              <Section>
                {clubs.map((club, i) => (
                  <Row key={club.id} first={i === 0} onPress={() => router.push(routes.club(club.id))}>
                    <View style={styles.club}>
                      <BookCover url={club.book.coverUrl} title={club.book.title} width={40} />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[styles.name, { color: theme.text }]}>{club.name}</Text>
                        <Text style={[styles.subtitle, { color: theme.secondaryText }]} numberOfLines={1}>
                          {club.book.title}
                        </Text>
                        <Text style={[styles.caption, { color: theme.secondaryText }]}>
                          {L("Участников: %@ · сообщений: %@", String(club.memberCount), String(club.postCount))}
                        </Text>
                      </View>
                    </View>
                  </Row>
                ))}
              </Section>
            )}
            <JoinByCodeSection code={code} onChangeCode={setCode} onJoin={() => void join()} busy={joining} footer={L("Код можно получить у участника клуба.")} testID="clubCode" />
          </Screen>
        )}
      </Loaded>
    </>
  );
}

const styles = StyleSheet.create({
  club: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 17, fontWeight: "600" },
  subtitle: { fontSize: 14 },
  caption: { fontSize: 12 },
});
