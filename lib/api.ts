import { createHash, randomBytes } from "node:crypto";
import type { Book, ShelfEntry, User } from "@prisma/client";
import { db } from "./db";

// ---------- Ответы ----------

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export const unauthorized = () => apiError("Требуется вход", 401);

/** Читает JSON-тело запроса; при битом JSON возвращает null. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// ---------- Токены ----------

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function issueToken(userId: string, name?: string | null) {
  const token = `bks_${randomBytes(32).toString("base64url")}`;
  await db.apiToken.create({ data: { userId, tokenHash: hash(token), name: name ?? null } });
  return token;
}

function bearer(req: Request): string | null {
  const header = req.headers.get("authorization");
  const m = header?.match(/^Bearer\s+(\S+)$/i);
  return m ? m[1] : null;
}

/** id пользователя по токену из заголовка Authorization или null. */
export async function apiUserId(req: Request): Promise<string | null> {
  const token = bearer(req);
  if (!token) return null;
  const record = await db.apiToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!record) return null;
  // Обновляем «последнее использование» не чаще раза в час, чтобы не писать в базу на каждый запрос.
  if (Date.now() - record.lastUsedAt.getTime() > 60 * 60 * 1000) {
    await db.apiToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  }
  return record.userId;
}

export async function revokeToken(req: Request) {
  const token = bearer(req);
  if (token) await db.apiToken.deleteMany({ where: { tokenHash: hash(token) } });
}

// ---------- Сериализация ----------

export const userJSON = (u: Pick<User, "id" | "name" | "email"> & { emailVerified?: Date | null }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  emailVerified: !!u.emailVerified,
});

export const bookJSON = (b: Book) => ({
  id: b.id,
  title: b.title,
  author: b.author,
  year: b.year,
  isbn: b.isbn,
  coverUrl: b.coverUrl,
  pageCount: b.pageCount,
});

export const entryJSON = (e: ShelfEntry) => ({
  status: e.status,
  startedAt: e.startedAt,
  finishedAt: e.finishedAt,
  rating: e.rating,
  review: e.review,
  isPublic: e.isPublic,
  currentPage: e.currentPage,
  totalPages: e.totalPages,
  updatedAt: e.updatedAt,
});

export const publicUserJSON = (u: { id: string; name: string | null }) => ({ id: u.id, name: u.name ?? "Читатель" });

export const listSummaryJSON = (l: {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  updatedAt?: Date;
  _count?: { items: number };
}) => ({
  id: l.id,
  title: l.title,
  description: l.description,
  isPublic: l.isPublic,
  count: l._count?.items ?? 0,
});

export const quoteJSON = (
  q: {
    id: string;
    text: string;
    page: number | null;
    note: string | null;
    isPublic: boolean;
    createdAt: Date;
    userId: string;
    user: { id: string; name: string | null };
    book?: Parameters<typeof bookJSON>[0];
  },
  viewerId: string,
) => ({
  id: q.id,
  text: q.text,
  page: q.page,
  // Заметка к цитате личная: другим не показываем.
  note: q.userId === viewerId ? q.note : null,
  isPublic: q.isPublic,
  createdAt: q.createdAt,
  mine: q.userId === viewerId,
  user: publicUserJSON(q.user),
  ...(q.book ? { book: bookJSON(q.book) } : {}),
});

type ClubUser = { id: string; name: string | null };

export const clubSummaryJSON = (c: {
  id: string;
  name: string;
  description: string | null;
  chapters: number | null;
  ownerId: string;
  book: Parameters<typeof bookJSON>[0];
  _count?: { members: number; posts: number };
}) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  chapters: c.chapters,
  book: bookJSON(c.book),
  memberCount: c._count?.members ?? 0,
  postCount: c._count?.posts ?? 0,
});

export const clubPostJSON = (p: {
  id: string;
  chapter: number | null;
  text: string;
  createdAt: Date;
  userId: string;
  user: ClubUser;
  spoiler?: boolean;
}) => ({
  id: p.id,
  chapter: p.chapter,
  // Спойлер: текст не отдаём, пока участник не дочитает до этой главы.
  text: p.spoiler ? null : p.text,
  spoiler: p.spoiler ?? false,
  createdAt: p.createdAt,
  user: publicUserJSON(p.user),
});
