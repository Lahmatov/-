import { apiError, apiUserId, json, unauthorized } from "@/lib/api";
import { joinChallenge, leaveChallenge } from "@/lib/challenges";

type Ctx = { params: Promise<{ id: string }> };

/** Вступить в публичный челлендж. */
export async function PUT(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const result = await joinChallenge((await params).id, userId);
  if (!result) return apiError("Челлендж не найден", 404);
  if (result === "FINISHED") return apiError("Челлендж уже закончился", 409);
  return json({ ok: true });
}

/** Выйти из челленджа. */
export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  if (!(await leaveChallenge((await params).id, userId))) return apiError("Челлендж не найден", 404);
  return json({ ok: true });
}
