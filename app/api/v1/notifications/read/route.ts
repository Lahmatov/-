import { apiUserId, json, unauthorized } from "@/lib/api";
import { markAllRead } from "@/lib/notifications";

export async function POST(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  await markAllRead(userId);
  return json({ ok: true });
}
