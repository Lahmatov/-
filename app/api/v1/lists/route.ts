import { apiError, apiUserId, json, listSummaryJSON, readJson, unauthorized } from "@/lib/api";
import { createList, getMyLists } from "@/lib/lists";
import { firstIssue, listSchema } from "@/lib/validation";

/** Мои списки. С ?bookId= у каждого списка есть containsBook — для экрана «Добавить в список». */
export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const lists = await getMyLists(userId, new URL(req.url).searchParams.get("bookId"));
  return json({ lists });
}

export async function POST(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = listSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  return json({ list: listSummaryJSON(await createList(userId, parsed.data)) }, 201);
}
