import type { ExpoConfig } from "expo/config";

// Настройки сборки берутся из переменных окружения (локально — из .env, в EAS — из секретов/профиля):
//   API_BASE_URL            адрес сервера; в production-сборке только https://
//   APP_BUNDLE_ID           iOS bundle id и Android package (по умолчанию com.example.bookshelf)
//   GOOGLE_IOS_CLIENT_ID    Client ID типа iOS из Google Cloud Console (вход через Google на iPhone)
//   GOOGLE_WEB_CLIENT_ID    Client ID типа Web: его аудиторию получают ID-токены на Android
// Пустой Google Client ID — кнопка Google скрыта.
// BUILD_NUMBER — номер сборки (CI подставляет номер запуска): CFBundleVersion на iOS, versionCode на Android.
const buildNumber = Number(process.env.BUILD_NUMBER || 1);
const bundleId = process.env.APP_BUNDLE_ID || "com.example.bookshelf";
const googleIosClientId = process.env.GOOGLE_IOS_CLIENT_ID || "";
const googleWebClientId = process.env.GOOGLE_WEB_CLIENT_ID || "";
const reversedIosClientId = googleIosClientId.split(".").reverse().join(".");

const plugins: ExpoConfig["plugins"] = [
  "expo-router",
  "expo-secure-store",
  "expo-image",
  "expo-localization",
  "expo-sharing",
  "expo-apple-authentication",
  ["expo-camera", { cameraPermission: "Камера нужна, чтобы сканировать штрихкод (ISBN) на обложке книги." }],
  ["expo-notifications", { color: "#B5651D" }],
];
if (googleIosClientId) {
  plugins.push(["@react-native-google-signin/google-signin", { iosUrlScheme: reversedIosClientId }]);
}

const config: ExpoConfig = {
  name: "Полка",
  slug: "polka",
  scheme: "polka",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: bundleId,
    buildNumber: String(buildNumber),
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      CFBundleDevelopmentRegion: "ru",
      CFBundleLocalizations: ["ru", "en"],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: bundleId,
    versionCode: buildNumber,
    adaptiveIcon: {
      backgroundColor: "#F6EFE6",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    permissions: ["CAMERA", "POST_NOTIFICATIONS"],
  },
  locales: { ru: "./locales/ru.json", en: "./locales/en.json" },
  plugins,
  experiments: { typedRoutes: true },
  extra: {
    apiBaseUrl: process.env.API_BASE_URL || "",
    googleIosClientId,
    googleWebClientId,
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
};

export default config;
