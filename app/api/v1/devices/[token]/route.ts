import { apiUserId, json, unauthorized } from "@/lib/api";
import { unregisterDevice } from "@/lib/notifications";

export async function DELETE(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  await unregisterDevice(userId, (await params).token.toLowerCase());
  return json({ ok: true });
}
