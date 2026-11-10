import { Alert, Platform, type AlertButton } from "react-native";
import type { APIClient } from "../../api/client";
import { REPORT_REASONS, reportReasonTitle, type ReportReason } from "../../api/models";
import { L } from "../../i18n";
import { showError } from "../../lib/alerts";

/**
 * «Пожаловаться» на отзыв или комментарий: выбор причины и отправка жалобы.
 * На Android в алерте помещаются только три кнопки, поэтому причины показываются в два шага.
 */
export function reportContent(api: APIClient, target: { entryId?: string; commentId?: string }): void {
  const send = (reason: ReportReason) => {
    api
      .report(reason, target)
      .then(() => Alert.alert(L("Жалоба отправлена"), L("Спасибо! Модератор посмотрит её в ближайшее время.")))
      .catch((error: unknown) => showError(error));
  };
  const reasonButton = (reason: ReportReason): AlertButton => ({ text: reportReasonTitle(reason), onPress: () => send(reason) });
  const cancel: AlertButton = { text: L("Отмена"), style: "cancel" };
  const title = L("Пожаловаться");
  const message = L("Что не так?");

  if (Platform.OS !== "android") {
    Alert.alert(title, message, [...REPORT_REASONS.map(reasonButton), cancel]);
    return;
  }
  const [first, second, ...rest] = REPORT_REASONS;
  const more: AlertButton = {
    text: L("Ещё…"),
    onPress: () => Alert.alert(title, message, [...rest.map(reasonButton), cancel], { cancelable: true }),
  };
  Alert.alert(title, message, [reasonButton(first), reasonButton(second), more], { cancelable: true });
}
