import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { errorMessage } from "../../api/client";
import type { PublicUser } from "../../api/models";
import { useAuth } from "../../auth/AuthContext";
import { Caption, Field, Row, Screen, Section } from "../../components/ui";
import { otherPeople } from "../../features/social/feedPages";
import { UserRow } from "../../features/social/UserRow";
import { L } from "../../i18n";

const DEBOUNCE_MS = 300;

/** Поиск людей по имени (от двух букв, с задержкой, пока человек печатает). */
export default function FindPeopleScreen() {
  const { api, user } = useAuth();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    setError(null);
    if (trimmed.length < 2) {
      setPeople([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      api
        .searchUsers(trimmed)
        .then((found) => {
          if (!cancelled) setPeople(found);
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(errorMessage(e));
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [api, trimmed]);

  const others = otherPeople(people, user?.id);
  const hint = error ?? (trimmed.length < 2 ? L("Введите хотя бы две буквы") : searching ? null : L("Никого не нашли"));

  return (
    <>
      <Stack.Screen options={{ title: L("Найти людей") }} />
      <Screen testID="find-people">
        <Section>
          <Field
            first
            value={query}
            onChangeText={setQuery}
            placeholder={L("Найти людей по имени")}
            accessibilityLabel={L("Найти людей по имени")}
            autoFocus
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            clearButtonMode="while-editing"
            testID="find-people-query"
          />
        </Section>
        {others.length > 0 && !error ? (
          <Section title={L("Люди")}>
            {others.map((person, index) => (
              <UserRow key={person.id} user={person} first={index === 0} />
            ))}
          </Section>
        ) : hint ? (
          <Section>
            <Row first>
              <Caption style={{ fontSize: 16 }}>{hint}</Caption>
            </Row>
          </Section>
        ) : null}
      </Screen>
    </>
  );
}
