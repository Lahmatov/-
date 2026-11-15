import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { APIClient } from "../api/client";

// Push-уведомления: разрешение, токен устройства и передача его серверу.
// Сервер пока умеет только APNs (iPhone); на Android токен FCM не отправляется, пока сервер не научится FCM.

const TOKEN_KEY = "pushDeviceToken";

export function pushSupported(): boolean {
  return Platform.OS === "ios" && Device.isDevice;
}

/** Вызывается после входа: спрашиваем разрешение (один раз) и регистрируем устройство на сервере. */
export async function enablePush(api: APIClient): Promise<void> {
  if (!pushSupported()) return;
  // Сразу привязываем сохранённый токен к текущему аккаунту: иначе уведомления прошлого аккаунта
  // ещё могли бы приходить на это устройство.
  const saved = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  if (saved) await api.registerDevice(saved).catch(() => undefined);

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    const value = typeof token.data === "string" ? token.data : null;
    if (!value) return;
    await AsyncStorage.setItem(TOKEN_KEY, value);
    if (value !== saved) await api.registerDevice(value);
  } catch {
    // Нет push-возможности (симулятор, сборка без push-прав) — работаем без push.
  }
}

/** При выходе отвязываем устройство, чтобы уведомления не приходили чужому аккаунту. */
export async function disablePush(api: APIClient): Promise<void> {
  const saved = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  if (saved) await api.unregisterDevice(saved);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0).catch(() => undefined);
}
