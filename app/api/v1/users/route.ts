import { json, publicUserJSON } from "@/lib/api";
import { searchUsers } from "@/lib/social";

/** Поиск людей по имени: ?q= */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return json({ users: (await searchUsers(q)).map(publicUserJSON) });
}
