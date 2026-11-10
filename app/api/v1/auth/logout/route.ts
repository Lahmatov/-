import { json, revokeToken } from "@/lib/api";

export async function POST(req: Request) {
  await revokeToken(req);
  return json({ ok: true });
}
