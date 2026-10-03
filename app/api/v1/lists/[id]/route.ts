import { apiError, apiUserId, bookJSON, json, listSummaryJSON, publicUserJSON, readJson, unauthorized } from "@/lib/api";
import { deleteList, getList, updateList } from "@/lib/lists";
import { firstIssue, listSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const result = await getList((await params).id, await apiUserId(req));
  if (!result) return apiError("Список не найден", 404);
  const { list, isOwner } = result;
  return json({
    list: { ...listSummaryJSON({ ...list, _count: { items: list.items.length } }) },
    owner: publicUserJSON(list.user),
    isOwner,
    books: list.items.map((i) => bookJSON(i.book)),
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = listSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  const list = await updateList((await params).id, userId, parsed.data);
  if (!list) return apiError("Список не найден", 404);
  return json({ list: listSummaryJSON(list) });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  if (!(await deleteList((await params).id, userId))) return apiError("Список не найден", 404);
  return json({ ok: true });
}
