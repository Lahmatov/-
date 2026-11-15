import Constants from "expo-constants";

type Extra = { apiBaseUrl?: string; googleIosClientId?: string; googleWebClientId?: string };

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Адрес сервера (API_BASE_URL при сборке). В разработке — локальный сервер. */
export function apiBaseURL(): string {
  const value = extra.apiBaseUrl?.trim();
  if (value) {
    // В production-сборке разрешён только HTTPS: по этому адресу уходит токен входа.
    if (!__DEV__ && !value.startsWith("https://")) throw new Error("API_BASE_URL в production-сборке должен быть https://");
    return value;
  }
  if (__DEV__) return "http://localhost:3000";
  throw new Error("API_BASE_URL не задан при сборке");
}

export const googleConfig = {
  iosClientId: extra.googleIosClientId || null,
  webClientId: extra.googleWebClientId || null,
};
