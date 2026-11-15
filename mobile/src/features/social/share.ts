import { Platform, Share } from "react-native";
import { apiBaseURL } from "../../config";

/** Публичная ссылка на страницу сайта (тот же сервер, что и API), например "u/<id>" или "lists/<id>". */
export function shareURL(path: string): string {
  return `${apiBaseURL().replace(/\/+$/, "")}/${path}`;
}

/** Системное меню «Поделиться» со ссылкой. На Android ссылка передаётся текстом. */
export function shareLink(path: string, title: string): void {
  const url = shareURL(path);
  const content = Platform.OS === "ios" ? { url, title } : { message: url, title };
  void Share.share(content, { subject: title, dialogTitle: title }).catch(() => undefined);
}
