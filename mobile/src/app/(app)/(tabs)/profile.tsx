import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import { useAuth } from "../../../auth/AuthContext";
import { useTheme } from "../../../components/theme";
import { Body, Button, Field, Headline, LabelRow, Row, Screen, Section } from "../../../components/ui";
import { BadgesSection } from "../../../features/challenges/BadgesSection";
import { exportShelfCSV } from "../../../features/profile/exportCSV";
import { L } from "../../../i18n";
import { attempt, confirm, showError } from "../../../lib/alerts";
import { routes } from "../../../lib/routes";
import { useLoad } from "../../../lib/useLoad";

export default function ProfileScreen() {
  const { api, user, updateName, refreshUser, logout, deleteAccount } = useAuth();
  const theme = useTheme();
  // Значки — дополнение: ошибка загрузки просто прячет секцию.
  const badges = useLoad(() => api.badges().catch(() => []), [api]);
  const [refreshing, setRefreshing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameText, setNameText] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [exporting, setExporting] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([badges.reload(), refreshUser().catch(() => undefined)]);
    setRefreshing(false);
  };

  const saveName = async () => {
    const name = nameText.trim();
    if (!name) return;
    setSavingName(true);
    try {
      await updateName(name);
      setEditingName(false);
    } catch (error) {
      showError(error);
    } finally {
      setSavingName(false);
    }
  };

  const resendVerification = async () => {
    const sent = await attempt(async () => {
      await api.resendVerification();
      return true;
    });
    if (sent) Alert.alert(L("Письмо отправлено — проверьте почту."));
  };

  const exportCSV = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportShelfCSV(api);
    } catch (error) {
      showError(error);
    } finally {
      setExporting(false);
    }
  };

  const confirmLogout = async () => {
    if (await confirm(L("Выйти из аккаунта?"), undefined, L("Выйти"))) await logout();
  };

  const confirmDelete = async () => {
    const ok = await confirm(L("Удалить аккаунт?"), L("Полка, оценки и отзывы будут удалены без возможности восстановления."), L("Удалить навсегда"));
    if (ok) await attempt(deleteAccount);
  };

  return (
    <Screen testID="profileScreen" refreshing={refreshing} onRefresh={() => void refresh()}>
      <Section footer={L("Имя видно в отзывах, ленте и профиле.")}>
        {user && (
          <Row first onPress={() => router.push(routes.user(user.id))} testID="myProfileLink" accessibilityLabel={user.name ?? L("Читатель")}>
            <View style={{ gap: 2 }}>
              <Headline>{user.name ?? L("Читатель")}</Headline>
              {user.email && <Body style={{ color: theme.secondaryText, fontSize: 15 }}>{user.email}</Body>}
            </View>
          </Row>
        )}
        {editingName ? (
          <>
            <Field
              label={L("Ваше имя")}
              value={nameText}
              onChangeText={setNameText}
              placeholder={L("Имя")}
              textContentType="name"
              autoComplete="name"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void saveName()}
              testID="nameField"
            />
            <Row>
              <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                <Button title={L("Сохранить")} kind="prominent" onPress={() => void saveName()} busy={savingName} disabled={!nameText.trim()} testID="saveName" />
                <Button title={L("Отмена")} kind="plain" onPress={() => setEditingName(false)} disabled={savingName} />
              </View>
            </Row>
          </>
        ) : (
          <LabelRow
            first={!user}
            icon="pencil"
            title={L("Изменить имя")}
            color={theme.accent}
            onPress={() => {
              setNameText(user?.name ?? "");
              setEditingName(true);
            }}
            testID="editName"
          />
        )}
      </Section>

      {user?.emailVerified === false && (
        <Section
          title={L("Email не подтверждён")}
          footer={L("Подтвердите адрес по ссылке из письма — тогда пароль можно будет восстановить, если забудете.")}
        >
          <LabelRow first icon="mail-outline" title={L("Отправить письмо ещё раз")} color={theme.accent} onPress={() => void resendVerification()} testID="resendVerification" />
        </Section>
      )}

      <BadgesSection badges={badges.data ?? []} />

      <Section>
        <LabelRow first icon="list-outline" title={L("Мои списки")} onPress={() => router.push(routes.lists())} testID="listsLink" />
        <LabelRow icon="people-outline" title={L("Книжные клубы")} onPress={() => router.push(routes.clubs())} testID="clubsLink" />
        <LabelRow icon="chatbox-ellipses-outline" title={L("Мои цитаты")} onPress={() => router.push(routes.quotes())} testID="quotesLink" />
        <LabelRow icon="flag-outline" title={L("Челленджи")} onPress={() => router.push(routes.challenges())} testID="profileChallengesLink" />
        <LabelRow icon="person-add-outline" title={L("Подписки")} onPress={() => router.push(routes.following())} testID="followingLink" />
        <LabelRow icon="notifications-outline" title={L("Уведомления")} onPress={() => router.push(routes.notifications())} testID="notificationsLink" />
      </Section>

      <Section title={L("Импорт")} footer={L("Kindle (My Clippings.txt), Goodreads или CSV.")}>
        <LabelRow first icon="download-outline" title={L("Импортировать книги")} onPress={() => router.push(routes.importBooks())} testID="importLink" />
      </Section>

      <Section footer={L("Файл в том же формате, что и импорт: его можно загрузить обратно или открыть в Excel и Numbers.")}>
        <LabelRow
          first
          icon="share-outline"
          title={L("Экспорт в CSV")}
          color={theme.accent}
          value={exporting ? L("Готовим файл…") : undefined}
          onPress={() => void exportCSV()}
          testID="exportCSV"
        />
      </Section>

      <Section>
        <LabelRow first title={L("Выйти")} destructive onPress={() => void confirmLogout()} testID="logout" />
        <LabelRow title={L("Удалить аккаунт")} destructive onPress={() => void confirmDelete()} testID="deleteAccount" />
      </Section>
    </Screen>
  );
}
