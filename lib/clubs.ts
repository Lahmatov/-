import { randomInt } from "node:crypto";
import { db } from "./db";

// Книжные клубы. Всё видно только участникам; вступают по коду приглашения.

export const MAX_MEMBERS = 100;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // без похожих 0/O, 1/I

export function makeInviteCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/** Код из ввода пользователя: регистр и пробелы/дефисы не важны. */
export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Сообщение о главе позже той, до которой участник дочитал, — спойлер.
 * Общие сообщения (без главы) и свои видны всегда.
 */
export function isSpoiler(post: { chapter: number | null; userId: string }, viewer: { userId: string; chapter: number }) {
  return post.chapter !== null && post.chapter > viewer.chapter && post.userId !== viewer.userId;
}

export function membership(clubId: string, userId: string) {
  return db.clubMember.findUnique({ where: { clubId_userId: { clubId, userId } } });
}

export async function createClub(
  userId: string,
  input: { name: string; description: string | null; bookId: string; chapters: number | null },
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.club.create({
        data: { ...input, ownerId: userId, inviteCode: makeInviteCode(), members: { create: { userId } } },
      });
    } catch (e) {
      // Совпадение кода приглашения почти невероятно, но на всякий случай пробуем другой.
      if (attempt >= 3 || !(e instanceof Error && e.message.includes("inviteCode"))) throw e;
    }
  }
}

export function myClubs(userId: string) {
  return db.club.findMany({
    where: { members: { some: { userId } } },
    include: { book: true, _count: { select: { members: true, posts: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Клуб для участника; null — нет клуба или пользователь в нём не состоит. */
export async function clubForMember(clubId: string, userId: string) {
  const member = await membership(clubId, userId);
  if (!member) return null;
  const club = await db.club.findUnique({
    where: { id: clubId },
    include: {
      book: true,
      members: { include: { user: { select: { id: true, name: true } } }, orderBy: { joinedAt: "asc" } },
    },
  });
  return club ? { club, member } : null;
}

export type JoinResult = { club: { id: string } } | { error: "NOT_FOUND" | "FULL" };

export async function joinClub(userId: string, code: string): Promise<JoinResult> {
  const club = await db.club.findUnique({
    where: { inviteCode: normalizeInviteCode(code) },
    include: { _count: { select: { members: true } } },
  });
  if (!club) return { error: "NOT_FOUND" };
  if (await membership(club.id, userId)) return { club };
  if (club._count.members >= MAX_MEMBERS) return { error: "FULL" };
  await db.clubMember.create({ data: { clubId: club.id, userId } });
  return { club };
}

/** Выйти из клуба. Владелец передаёт клуб самому давнему участнику; последний участник удаляет клуб. */
export async function leaveClub(clubId: string, userId: string) {
  const club = await db.club.findUnique({ where: { id: clubId } });
  if (!club || !(await membership(clubId, userId))) return false;
  await db.clubMember.delete({ where: { clubId_userId: { clubId, userId } } });
  if (club.ownerId === userId) {
    const next = await db.clubMember.findFirst({ where: { clubId }, orderBy: { joinedAt: "asc" } });
    if (next) await db.club.update({ where: { id: clubId }, data: { ownerId: next.userId } });
    else await db.club.delete({ where: { id: clubId } });
  }
  return true;
}

/** Перед удалением аккаунта: клубы, которыми он владеет, переходят другим участникам. */
export async function leaveAllClubs(userId: string) {
  const memberships = await db.clubMember.findMany({ where: { userId }, select: { clubId: true } });
  for (const m of memberships) await leaveClub(m.clubId, userId);
}

export function setChapter(clubId: string, userId: string, chapter: number) {
  return db.clubMember.update({ where: { clubId_userId: { clubId, userId } }, data: { chapter } });
}

export async function clubPosts(clubId: string, viewer: { userId: string; chapter: number }) {
  const posts = await db.clubPost.findMany({
    where: { clubId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  return posts.map((p) => ({ ...p, spoiler: isSpoiler(p, viewer) }));
}

export function addPost(clubId: string, userId: string, chapter: number | null, text: string) {
  return db.clubPost.create({
    data: { clubId, userId, chapter, text },
    include: { user: { select: { id: true, name: true } } },
  });
}

/** Удалить сообщение может автор или владелец клуба. */
export async function deletePost(postId: string, userId: string) {
  const post = await db.clubPost.findUnique({ where: { id: postId }, include: { club: true } });
  if (!post || (post.userId !== userId && post.club.ownerId !== userId)) return false;
  await db.clubPost.delete({ where: { id: postId } });
  return true;
}
