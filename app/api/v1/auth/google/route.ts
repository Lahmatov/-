import { z } from "zod";
import { apiError, issueToken, json, readJson, userJSON } from "@/lib/api";
import { AccountConflictError, findOrCreateOAuthUser, verifyGoogleIdToken } from "@/lib/mobile-auth";

const schema = z.object({ idToken: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return apiError("Нет idToken");
  try {
    const identity = await verifyGoogleIdToken(parsed.data.idToken);
    const user = await findOrCreateOAuthUser("google", identity);
    return json({ token: await issueToken(user.id, req.headers.get("x-device-name")), user: userJSON(user) });
  } catch (e) {
    if (e instanceof AccountConflictError) return apiError(e.message, 409);
    console.error("Google sign-in failed", e);
    return apiError("Не удалось проверить вход через Google", 401);
  }
}
