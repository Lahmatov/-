import { apiUserId, bookJSON, json, unauthorized } from "@/lib/api";
import { listNotifications, unreadCount } from "@/lib/notifications";

export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const [items, unread] = await Promise.all([listNotifications(userId), unreadCount(userId)]);
  return json({
    unread,
    items: items.map((n) => ({ ...n, book: n.book ? bookJSON(n.book) : null })),
  });
}
