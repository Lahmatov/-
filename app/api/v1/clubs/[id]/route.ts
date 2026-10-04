import { apiError, apiUserId, bookJSON, json, publicUserJSON, readJson, unauthorized } from "@/lib/api";
import { clubForMember } from "@/lib/clubs";
import { db } from "@/lib/db";
import { bookExists } from "@/lib/shelf";
import { clubPatchSchema, firstIssue } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/** Клуб для участника: книга, участники и до какой главы они дочитали, код приглашения. */
export async function GET(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const found = await clubForMember((await params).id, userId);
  if (!found) return apiError("Клуб не найден", 404);
  const { club, member } = found;
  return json({
    club: {
      id: club.id,
      name: club.name,
      description: club.description,
      chapters: club.chapters,
      inviteCode: club.inviteCode,
      book: bookJSON(club.book),
      isOwner: club.ownerId === userId,
      myChapter: member.chapter,
      members: club.members.map((m) => ({
        user: publicUserJSON(m.user),
        chapter: m.chapter,
        isOwner: m.userId === club.ownerId,
      })),
    },
  });
}

/** Владелец меняет название, описание, книгу или число глав. */
export async function PATCH(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const id = (await params).id;
  const parsed = clubPatchSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  const club = await db.club.findUnique({ where: { id } });
  if (!club) return apiError("Клуб не найден", 404);
  if (club.ownerId !== userId) return apiError("Менять клуб может только владелец", 403);
  if (parsed.data.bookId && !(await bookExists(parsed.data.bookId))) return apiError("Книга не найдена", 404);
  // Новая книга — главы и прогресс участников начинаются заново.
  const newBook = parsed.data.bookId && parsed.data.bookId !== club.bookId;
  await db.$transaction([
    db.club.update({ where: { id }, data: parsed.data }),
    ...(newBook ? [db.clubMember.updateMany({ where: { clubId: id }, data: { chapter: 0 } })] : []),
  ]);
  return json({ ok: true });
}

/** Владелец удаляет клуб вместе с обсуждением. */
export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const id = (await params).id;
  const club = await db.club.findUnique({ where: { id } });
  if (!club) return apiError("Клуб не найден", 404);
  if (club.ownerId !== userId) return apiError("Удалить клуб может только владелец", 403);
  await db.club.delete({ where: { id } });
  return json({ ok: true });
}
