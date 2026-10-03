import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { apiError, issueToken, json, readJson, userJSON } from "@/lib/api";
import { firstIssue, registerSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const parsed = registerSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  const { name, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return apiError("Пользователь с таким email уже есть — войдите.", 409);
  }
  const user = await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  return json({ token: await issueToken(user.id, req.headers.get("x-device-name")), user: userJSON(user) }, 201);
}
