import { z } from "zod";
import { apiError, issueToken, json, readJson, userJSON } from "@/lib/api";
import { AccountConflictError, findOrCreateOAuthUser, verifyAppleIdentityToken } from "@/lib/mobile-auth";

// Apple присылает имя пользователя только при самом первом входе, поэтому приложение передаёт его отдельно.
const schema = z.object({ identityToken: z.string().min(1), name: z.string().max(80).nullish() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return apiError("Нет identityToken");
  try {
    const identity = await verifyAppleIdentityToken(parsed.data.identityToken);
    const user = await findOrCreateOAuthUser("apple", identity, parsed.data.name);
    return json({ token: await issueToken(user.id, req.headers.get("x-device-name")), user: userJSON(user) });
  } catch (e) {
    if (e instanceof AccountConflictError) return apiError(e.message, 409);
    console.error("Apple sign-in failed", e);
    return apiError("Не удалось проверить вход через Apple", 401);
  }
}
