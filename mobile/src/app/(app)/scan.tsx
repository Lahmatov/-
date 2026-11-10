import { CameraView, useCameraPermissions, type BarcodeScanningResult, type BarcodeType } from "expo-camera";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { APIError, errorMessage } from "../../api/client";
import { normalizeISBN } from "../../api/isbn";
import { useAPI } from "../../auth/AuthContext";
import { useTheme } from "../../components/theme";
import { Button, Empty, Loading } from "../../components/ui";
import { L } from "../../i18n";
import { routes } from "../../lib/routes";

// ISBN печатают как EAN-13; остальные типы отсеет normalizeISBN с подсказкой.
const BARCODE_TYPES: BarcodeType[] = ["ean13", "ean8", "upc_a", "upc_e"];

/** Сканер штрихкода на обложке. Находит книгу по ISBN (у нас или в Open Library) и открывает её. */
export default function ScanScreen() {
  const api = useAPI();
  const router = useRouter();
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualISBN, setManualISBN] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [hint, setHint] = useState(() => L("Наведите камеру на штрихкод на обороте книги"));
  const busy = useRef(false);
  // Один и тот же код камера видит много раз подряд — реагируем на него однажды.
  const lastPayload = useRef<string | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !asked.current) {
      asked.current = true;
      void requestPermission();
    }
  }, [permission, requestPermission]);

  async function lookUp(raw: string) {
    if (busy.current) return;
    // Обычные товарные штрихкоды (не 978/979) отсеиваем сразу, без запроса к серверу.
    const isbn = normalizeISBN(raw);
    if (!isbn) {
      setHint(L("Это не ISBN книги. Ищите штрихкод, который начинается с 978 или 979."));
      return;
    }
    busy.current = true;
    setLookingUp(true);
    try {
      const book = await api.bookByISBN(isbn);
      router.replace(routes.book(book.id));
    } catch (error) {
      if (error instanceof APIError && error.kind === "server") {
        Alert.alert(L("Книга не найдена"), L("Такого ISBN нет ни у нас, ни в Open Library."), [
          { text: L("Сканировать ещё"), style: "cancel" },
          { text: L("Добавить вручную"), onPress: () => router.replace(routes.addBook()) },
        ]);
      } else {
        setHint(errorMessage(error));
      }
    } finally {
      busy.current = false;
      setLookingUp(false);
    }
  }

  function onScanned(result: BarcodeScanningResult) {
    if (busy.current || result.data === lastPayload.current) return;
    lastPayload.current = result.data;
    void lookUp(result.data);
  }

  function camera() {
    if (!permission) return <Loading />;
    if (!permission.granted) {
      return (
        <Empty
          icon="camera-outline"
          title={L("Нет доступа к камере")}
          message={permission.canAskAgain ? L("Разрешите доступ, чтобы сканировать штрихкод, или введите ISBN вручную.") : L("Разрешите доступ к камере в настройках или введите ISBN вручную.")}
        >
          {permission.canAskAgain ? (
            <Button title={L("Разрешить доступ")} onPress={() => void requestPermission()} testID="camera-allow" />
          ) : (
            <Button title={L("Открыть настройки")} onPress={() => void Linking.openSettings()} testID="camera-settings" />
          )}
        </Empty>
      );
    }
    if (cameraFailed) {
      return <Empty icon="barcode-outline" title={L("Камера недоступна")} message={L("Введите ISBN с обложки вручную")} />;
    }
    return (
      <View style={styles.cameraBox}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
          onBarcodeScanned={lookingUp ? undefined : onScanned}
          onMountError={() => setCameraFailed(true)}
          accessibilityLabel={L("Камера")}
        />
        {lookingUp && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={theme.onAccent} />
          </View>
        )}
      </View>
    );
  }

  const canSearch = manualISBN.trim().length > 0 && !lookingUp;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.groupedBackground }} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.topBar, { borderBottomColor: theme.separator }]}>
          <View style={styles.side} />
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {L("Сканировать ISBN")}
          </Text>
          <View style={[styles.side, { alignItems: "flex-end" }]}>
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" testID="scan-close">
              <Text style={[styles.close, { color: theme.accent }]}>{L("Закрыть")}</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.content}>
          <View style={[styles.cameraContainer, { backgroundColor: theme.card }]}>{camera()}</View>
          <Text style={[styles.hint, { color: theme.secondaryText }]} accessibilityLiveRegion="polite">
            {hint}
          </Text>
          <View style={styles.manual}>
            <TextInput
              testID="scan-isbn-field"
              value={manualISBN}
              onChangeText={setManualISBN}
              placeholder={L("ISBN, например 978-5-389-01686-6")}
              placeholderTextColor={theme.secondaryText}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              autoCapitalize="characters"
              returnKeyType="search"
              onSubmitEditing={() => canSearch && void lookUp(manualISBN)}
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.separator }]}
            />
            <Button title={L("Найти")} onPress={() => void lookUp(manualISBN)} disabled={!canSearch} testID="scan-isbn-find" />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  side: { flex: 1 },
  title: { fontSize: 17, fontWeight: "600", textAlign: "center" },
  close: { fontSize: 17 },
  content: { flex: 1, padding: 16, gap: 16 },
  cameraContainer: { flex: 1, borderRadius: 16, overflow: "hidden", justifyContent: "center" },
  cameraBox: { flex: 1 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  hint: { fontSize: 13, textAlign: "center" },
  manual: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, fontSize: 16, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
});
