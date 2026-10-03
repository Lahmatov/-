import { apiUserId, bookJSON, json, unauthorized } from "@/lib/api";
import { REASON_TEXT, recommendations } from "@/lib/discover";
import { langOf } from "@/lib/i18n";

export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const items = await recommendations(userId);
  return json({ items: items.map((r) => ({ book: bookJSON(r.book), reason: REASON_TEXT[r.reason][langOf(req)] })) });
}
