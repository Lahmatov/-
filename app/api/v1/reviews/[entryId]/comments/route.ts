import { apiError, apiUserId, json, publicUserJSON, readJson, unauthorized } from "@/lib/api";
import { addComment, listComments } from "@/lib/reviews";
import { commentSchema, firstIssue } from "@/lib/validation";

type Ctx = { params: Promise<{ entryId: string }> };

const commentJSON = (c: { id: string; text: string; createdAt: Date; user: { id: string; name: string | null } }) => ({
  id: c.id,
  text: c.text,
  createdAt: c.createdAt,
  user: publicUserJSON(c.user),
});

export async function GET(_: Request, { params }: Ctx) {
  const result = await listComments((await params).entryId);
  if (!result) return apiError("Отзыв не найден", 404);
  return json({ reviewAuthorId: result.entry.userId, comments: result.comments.map(commentJSON) });
}

export async function POST(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = commentSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  const comment = await addComment(userId, (await params).entryId, parsed.data.text);
  if (!comment) return apiError("Отзыв не найден", 404);
  return json({ comment: commentJSON(comment) }, 201);
}
