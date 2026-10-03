import { z } from "zod";
import { apiError, apiUserId, json, readJson, unauthorized } from "@/lib/api";
import { registerDevice } from "@/lib/notifications";

/** Токен APNs устройства: { token } (hex). */
export async function POST(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = z.object({ token: z.string().regex(/^[0-9a-f]{32,200}$/i) }).safeParse(await readJson(req));
  if (!parsed.success) return apiError("Некорректный токен устройства");
  await registerDevice(userId, parsed.data.token.toLowerCase());
  return json({ ok: true });
}
