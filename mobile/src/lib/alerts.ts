import { Alert } from "react-native";
import { errorMessage, isQueued } from "../api/client";
import { L } from "../i18n";

export function showError(error: unknown, title = L("Ошибка")): void {
  Alert.alert(title, errorMessage(error));
}

/**
 * Выполняет действие и показывает ошибку. Изменение, поставленное в офлайн-очередь, — не ошибка:
 * onQueued позволяет обновить экран так, будто изменение уже применено.
 */
export async function attempt<T>(action: () => Promise<T>, onQueued?: () => void): Promise<T | undefined> {
  try {
    return await action();
  } catch (error) {
    if (isQueued(error)) {
      onQueued?.();
      return undefined;
    }
    showError(error);
    return undefined;
  }
}

export function confirm(title: string, message: string | undefined, actionTitle: string, destructive = true): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: L("Отмена"), style: "cancel", onPress: () => resolve(false) },
      { text: actionTitle, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });
}
