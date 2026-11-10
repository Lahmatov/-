import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useAPI } from "../../auth/AuthContext";
import { Body, Loaded, Row, Screen, Section } from "../../components/ui";
import { useTheme } from "../../components/theme";
import { ChallengeRow } from "../../features/challenges/ChallengeRow";
import { HeaderIconButton, JoinByCodeSection } from "../../features/challenges/CommunityControls";
import { L } from "../../i18n";
import { attempt } from "../../lib/alerts";
import { routes } from "../../lib/routes";
import { useLoad } from "../../lib/useLoad";

/** Мои челленджи и открытые публичные: «10 книг за лето», «5 книг фантастики до конца года». */
export default function ChallengesScreen() {
  const api = useAPI();
  const theme = useTheme();
  const state = useLoad(() => api.challenges(), [api]);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // После создания, вступления или выхода список обновляется при возврате на экран.
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
    const id = await attempt(() => api.joinChallengeByCode(value));
    setJoining(false);
    if (id) {
      setCode("");
      router.push(routes.challenge(id));
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: L("Челленджи"),
          headerRight: () => <HeaderIconButton icon="add" label={L("Новый челлендж")} onPress={() => router.push(routes.challengeNew())} testID="createChallenge" />,
        }}
      />
      <Loaded state={state}>
        {(list) => (
          <Screen refreshing={refreshing} onRefresh={() => void refresh()} testID="challenges">
            <Section title={L("Мои")}>
              {list.mine.length === 0 && (
                <Row first>
                  <Body style={{ color: theme.secondaryText }}>{L("Вы пока ни в одном челлендже")}</Body>
                </Row>
              )}
              {list.mine.map((c, i) => (
                <Row key={c.id} first={i === 0} onPress={() => router.push(routes.challenge(c.id))}>
                  <ChallengeRow challenge={c} />
                </Row>
              ))}
            </Section>
            {list.open.length > 0 && (
              <Section title={L("Можно присоединиться")}>
                {list.open.map((c, i) => (
                  <Row key={c.id} first={i === 0} onPress={() => router.push(routes.challenge(c.id))}>
                    <ChallengeRow challenge={c} />
                  </Row>
                ))}
              </Section>
            )}
            <JoinByCodeSection code={code} onChangeCode={setCode} onJoin={() => void join()} busy={joining} testID="challengeCode" />
          </Screen>
        )}
      </Loaded>
    </>
  );
}
