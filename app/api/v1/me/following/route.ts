import { apiUserId, json, publicUserJSON, unauthorized } from "@/lib/api";
import { getFollowing } from "@/lib/social";

export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  return json({ users: (await getFollowing(userId)).map(publicUserJSON) });
}
