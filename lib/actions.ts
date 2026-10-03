"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth, signIn, signOut } from "@/auth";
import { db } from "./db";
import { findDuplicate, makeSearchText } from "./books";
import { upsertFromOpenLibrary } from "./openlibrary";
import { isStatus } from "./status";
import { parseBooksCsv, parseKindleClippings, type ImportedBook } from "./importers";

export type FormState = { error?: string; message?: string } | undefined;

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

// ---------- Авторизация ----------

const registerSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(80),
  email: z.string().trim().toLowerCase().email("Некорректный email"),
  password: z.string().min(8, "Пароль — минимум 8 символов").max(200),
});

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return {
      error: existing.passwordHash
        ? "Пользователь с таким email уже есть — войдите."
        : "Этот email уже привязан к входу через Google — войдите через Google.",
    };
  }

  await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  await signIn("credentials", { email, password, redirectTo: "/" });
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Неверный email или пароль." };
    throw e; // redirect после успешного входа
  }
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}

// ---------- Каталог ----------

const bookSchema = z.object({
  title: z.string().trim().min(1, "Укажите название").max(300),
  author: z.string().trim().min(1, "Укажите автора").max(300),
  year: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v > -3000 && v <= new Date().getFullYear() + 2), {
      message: "Некорректный год",
    }),
});

export async function addBook(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = bookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { title, author, year } = parsed.data;

  const duplicate = await findDuplicate(title, author);
  if (duplicate) redirect(`/books/${duplicate.id}?existing=1`);

  const book = await db.book.create({
    data: { title, author, year, searchText: makeSearchText(title, author), addedById: userId },
  });
  redirect(`/books/${book.id}`);
}

export async function importFromOpenLibrary(formData: FormData) {
  const userId = await requireUserId();
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v ? v : null;
  };
  const key = str("key");
  const title = str("title");
  const author = str("author");
  if (!key || !title || !author) return;
  const year = str("year");
  const book = await upsertFromOpenLibrary(
    { key, title, author, year: year ? Number(year) : null, isbn: str("isbn"), coverUrl: str("coverUrl") },
    userId,
  );
  redirect(`/books/${book.id}`);
}

// ---------- Полка ----------

export async function setStatus(bookId: string, status: string) {
  const userId = await requireUserId();
  if (!isStatus(status)) return;
  const now = new Date();
  const prev = await db.shelfEntry.findUnique({ where: { userId_bookId: { userId, bookId } } });

  const data: { status: string; startedAt?: Date | null; finishedAt?: Date | null } = { status };
  if (status === "READING") {
    // Начал заново после прочтения/брошенной книги — новый круг.
    if (!prev?.startedAt || prev.status === "READ" || prev.status === "DROPPED") data.startedAt = now;
    data.finishedAt = null;
  } else if (status === "READ") {
    data.finishedAt = now;
  } else if (status === "WANT") {
    data.startedAt = null;
    data.finishedAt = null;
  }

  await db.shelfEntry.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, ...data },
    update: data,
  });
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/");
}

export async function removeFromShelf(bookId: string) {
  const userId = await requireUserId();
  await db.shelfEntry.deleteMany({ where: { userId, bookId } });
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/");
}

const reviewSchema = z.object({
  rating: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 10), "Оценка — от 1 до 10"),
  review: z
    .string()
    .max(10000, "Слишком длинный отзыв")
    .optional()
    .transform((v) => v?.trim() || null),
  isPublic: z.string().optional().transform((v) => v === "on"),
  startedAt: z.string().optional().transform(toDate),
  finishedAt: z.string().optional().transform(toDate),
});

function toDate(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function saveReview(bookId: string, _: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  if (data.startedAt && data.finishedAt && data.startedAt > data.finishedAt) {
    return { error: "Дата окончания раньше даты начала" };
  }

  await db.shelfEntry.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, status: "READ", ...data },
    update: data,
  });
  revalidatePath(`/books/${bookId}`);
  return { message: "Сохранено" };
}

// ---------- Импорт ----------


export async function importFile(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const file = formData.get("file");
  const kind = formData.get("kind");
  if (!(file instanceof File) || file.size === 0) return { error: "Выберите файл" };
  if (file.size > 10 * 1024 * 1024) return { error: "Файл больше 10 МБ" };

  let items: ImportedBook[];
  try {
    const text = await file.text();
    items = kind === "kindle" ? parseKindleClippings(text) : parseBooksCsv(text);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось прочитать файл" };
  }
  if (items.length === 0) return { error: "В файле не найдено ни одной книги" };

  let added = 0;
  for (const item of items.slice(0, 5000)) {
    const book =
      (await findDuplicate(item.title, item.author)) ??
      (await db.book.create({
        data: {
          title: item.title,
          author: item.author,
          year: item.year ?? null,
          searchText: makeSearchText(item.title, item.author),
          addedById: userId,
        },
      }));
    const exists = await db.shelfEntry.findUnique({ where: { userId_bookId: { userId, bookId: book.id } } });
    if (exists) continue; // не перезаписываем то, что пользователь уже отметил
    await db.shelfEntry.create({
      data: {
        userId,
        bookId: book.id,
        status: item.status,
        rating: item.rating ?? null,
        review: item.review ?? null,
        finishedAt: item.finishedAt ?? null,
      },
    });
    added++;
  }
  revalidatePath("/");
  return { message: `Найдено книг: ${items.length}, добавлено на полку: ${added}` };
}
