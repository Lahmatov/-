import { apiUserId, bookJSON, json, unauthorized } from "@/lib/api";
import { recommendations } from "@/lib/discover";

export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const items = await recommendations(userId);
  return json({ items: items.map((r) => ({ book: bookJSON(r.book), reason: r.reason })) });
}
