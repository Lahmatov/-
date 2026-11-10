import { apiError, apiUserId, clubPostJSON, json, readJson, unauthorized } from "@/lib/api";
import { addPost, clubPosts, membership } from "@/lib/clubs";
import { clubPostSchema, firstIssue } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/** Обсуждение: сообщения о главах дальше моей приходят как спойлеры без текста. */
export async function GET(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const id = (await params).id;
  const member = await membership(id, userId);
  if (!member) return apiError("Клуб не найден", 404);
  const posts = await clubPosts(id, { userId, chapter: member.chapter });
  return json({ posts: posts.map(clubPostJSON) });
}

/** { text, chapter? } */
export async function POST(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const id = (await params).id;
  const parsed = clubPostSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  if (!(await membership(id, userId))) return apiError("Клуб не найден", 404);
  const post = await addPost(id, userId, parsed.data.chapter, parsed.data.text);
  return json({ post: clubPostJSON(post) }, 201);
}
