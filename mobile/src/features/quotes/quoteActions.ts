import { Alert, Share } from "react-native";
import type { Book, Quote } from "../../api/models";
import { L } from "../../i18n";
import { showError } from "../../lib/alerts";

/** Текст цитаты для «Поделиться»: «…»\n— Название, Автор. */
export function quoteShareText(quote: Pick<Quote, "text" | "page">, book: Pick<Book, "title" | "author"> | null | undefined): string {
  const lines = [`«${quote.text}»`];
  if (book) {
    const source = [book.title, book.author].filter((s) => s.trim().length > 0).join(", ");
    lines.push(`— ${source}${quote.page != null ? `, ${L("стр. %@", String(quote.page))}` : ""}`);
  }
  return lines.join("\n");
}

/** Системное окно «Поделиться» (в нём есть и «Скопировать»). */
export async function shareQuote(quote: Quote, book: Book | null | undefined): Promise<void> {
  try {
    await Share.share({ message: quoteShareText(quote, book) });
  } catch (error) {
    showError(error);
  }
}

/** Меню цитаты по долгому нажатию: поделиться, удалить свою (onDelete есть только у своих). */
export function showQuoteActions(quote: Quote, actions: { onShare: () => void; onDelete?: () => void }): void {
  const { onShare, onDelete } = actions;
  const buttons: { text: string; style?: "cancel" | "destructive" | "default"; onPress?: () => void }[] = [
    { text: L("Поделиться"), onPress: onShare },
  ];
  if (onDelete) buttons.push({ text: L("Удалить"), style: "destructive", onPress: onDelete });
  buttons.push({ text: L("Отмена"), style: "cancel" });
  Alert.alert(L("Цитата"), quote.text.length > 120 ? `${quote.text.slice(0, 120)}…` : quote.text, buttons);
}
