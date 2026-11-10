import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { APIClient } from "../../api/client";
import { L } from "../../i18n";

/** Скачивает полку в CSV, сохраняет во временный файл и открывает системное меню «Поделиться / Сохранить в Файлы». */
export async function exportShelfCSV(api: APIClient): Promise<void> {
  const csv = await api.exportCSV();
  const file = new File(Paths.cache, "bookshelf.csv");
  file.create({ overwrite: true });
  await file.write(csv);
  if (!(await Sharing.isAvailableAsync())) throw new Error(L("На этом устройстве нельзя поделиться файлом."));
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: L("Экспорт в CSV"),
  });
}
