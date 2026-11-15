import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { googleIdToken, googleSignInAvailable } from "../auth/google";
import { Button, Segmented } from "../components/ui";
import { useTheme } from "../components/theme";
import { L } from "../i18n";

type Mode = "login" | "register";

export default function SignInScreen() {
  const auth = useAuth();
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") AppleAuthentication.isAvailableAsync().then(setAppleAvailable, () => setAppleAvailable(false));
  }, []);

  const trimmedEmail = email.trim();
  const canSubmit =
    mode === "login"
      ? trimmedEmail.includes("@") && password.length > 0
      : trimmedEmail.includes("@") && password.length >= 8 && name.trim().length > 0;

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    try {
      await operation();
    } catch (error) {
      Alert.alert(L("Ошибка"), errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const submit = () =>
    run(() => (mode === "login" ? auth.login(trimmedEmail, password) : auth.register(name.trim(), trimmedEmail, password)));

  const signInWithApple = () =>
    run(async () => {
      let credential: AppleAuthentication.AppleAuthenticationCredential;
      try {
        credential = await AppleAuthentication.signInAsync({
          requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        });
      } catch (error) {
        if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED") return;
        throw error;
      }
      if (!credential.identityToken) throw new Error(L("Apple не вернул токен входа"));
      // Имя Apple отдаёт только при первом входе.
      const fullName = credential.fullName ? AppleAuthentication.formatFullName(credential.fullName).trim() : "";
      await auth.signInWithApple(credential.identityToken, fullName || null);
    });

  const signInWithGoogle = () =>
    run(async () => {
      const token = await googleIdToken();
      if (token) await auth.signInWithGoogle(token);
    });

  const forgotPassword = () => {
    // Alert.prompt есть только на iOS; на Android берём адрес из поля email.
    const send = (address: string) => {
      const value = address.trim();
      if (!value.includes("@")) return;
      void run(async () => {
        await auth.api.forgotPassword(value);
        Alert.alert(L("Проверьте почту"), L("Если такой email зарегистрирован, мы отправили на него ссылку для сброса пароля."));
      });
    };
    if (Platform.OS === "ios") {
      Alert.prompt(
        L("Восстановление пароля"),
        L("Пришлём на почту ссылку, по которой можно задать новый пароль."),
        [
          { text: L("Отмена"), style: "cancel" },
          { text: L("Отправить ссылку"), onPress: (value?: string) => send(value ?? "") },
        ],
        "plain-text",
        trimmedEmail,
        "email-address",
      );
    } else if (trimmedEmail.includes("@")) {
      Alert.alert(L("Восстановление пароля"), L("Пришлём на почту ссылку, по которой можно задать новый пароль.") + `\n\n${trimmedEmail}`, [
        { text: L("Отмена"), style: "cancel" },
        { text: L("Отправить ссылку"), onPress: () => send(trimmedEmail) },
      ]);
    } else {
      Alert.alert(L("Восстановление пароля"), L("Введите email в поле выше."));
    }
  };

  const input = [styles.input, { color: theme.text, borderColor: theme.separator, backgroundColor: theme.card }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Ionicons name="library" size={56} color={theme.accent} />
            <Text style={[styles.title, { color: theme.text }]}>{L("Книжная полка")}</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{L("Отмечайте прочитанное, ставьте оценки и пишите отзывы")}</Text>
          </View>

          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={theme.dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={10}
              style={{ height: 50 }}
              onPress={signInWithApple}
            />
          )}
          {googleSignInAvailable() && <Button title={L("Войти через Google")} icon="logo-google" onPress={signInWithGoogle} disabled={busy} />}

          <Text style={[styles.or, { color: theme.secondaryText }]}>{L("или по email")}</Text>
          <Segmented<Mode>
            options={[
              { value: "login", label: L("Вход") },
              { value: "register", label: L("Регистрация") },
            ]}
            value={mode}
            onChange={setMode}
          />

          {mode === "register" && (
            <TextInput style={input} placeholder={L("Имя")} placeholderTextColor={theme.secondaryText} value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
          )}
          <TextInput
            testID="signInEmail"
            style={input}
            placeholder="Email"
            placeholderTextColor={theme.secondaryText}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextInput
            testID="signInPassword"
            style={input}
            placeholder={mode === "register" ? L("Пароль (от 8 символов)") : L("Пароль")}
            placeholderTextColor={theme.secondaryText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType={mode === "register" ? "newPassword" : "password"}
            onSubmitEditing={() => canSubmit && void submit()}
          />
          <Button testID="signInSubmit" kind="prominent" title={mode === "login" ? L("Войти") : L("Создать аккаунт")} onPress={submit} disabled={!canSubmit} busy={busy} />
          {mode === "login" && <Button kind="plain" title={L("Забыли пароль?")} onPress={forgotPassword} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  header: { alignItems: "center", gap: 8, paddingTop: 40 },
  title: { fontSize: 32, fontWeight: "700" },
  subtitle: { fontSize: 16, textAlign: "center" },
  or: { fontSize: 13, textAlign: "center" },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
});
