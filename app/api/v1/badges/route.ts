import { apiUserId, json, unauthorized } from "@/lib/api";
import { badges } from "@/lib/challenges";

/** Мои значки — выполненные челленджи. */
export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  return json({ badges: await badges(userId) });
}
