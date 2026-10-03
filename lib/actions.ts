"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth, signIn, signOut } from "@/auth";
import { db } from "./db";
import { upsertFromOpenLibrary } from "./openlibrary";
import { isStatus } from "./status";
import { parseBooksCsv, parseKindleClippings, type ImportedBook } from "./importers";
import { firstIssue, goalSchema, listSchema, nameSchema, openLibraryHitSchema, registerSchema } from "./validation";
import { follow, unfollow, updateName } from "./social";
import { addToList, createList, deleteList, removeFromList, updateList } from "./lists";
import { setGoal } from "./stats";
import { bookExists, createBook, importBooks, saveShelfReview, setShelfStatus } from "./shelf";

export type FormState = { error?: string; message?: string } | undefined;

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

// ---------- Авторизация ----------

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
    if (e instanceof CredentialsSignin && e.code === "too_many_attempts") {
      return { error: "Слишком много попыток. Подождите 15 минут." };
    }
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

  const { book, existing } = await createBook(userId, { title, author, year });
  redirect(existing ? `/books/${book.id}?existing=1` : `/books/${book.id}`);
}

export async function importFromOpenLibrary(formData: FormData) {
  const userId = await requireUserId();
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v ? v : null;
  };
  const year = str("year");
  // Те же правила, что и в API: ключ /works/OL…, обложка только с covers.openlibrary.org.
  const parsed = openLibraryHitSchema.safeParse({
    key: str("key"),
    title: str("title"),
    author: str("author"),
    year: year === null ? null : Number(year),
    isbn: str("isbn"),
    coverUrl: str("coverUrl"),
  });
  if (!parsed.success) return;
  const book = await upsertFromOpenLibrary(parsed.data, userId);
  redirect(`/books/${book.id}`);
}

// ---------- Полка ----------

export async function setStatus(bookId: string, status: string) {
  const userId = await requireUserId();
  if (!isStatus(status) || !(await bookExists(bookId))) return;
  await setShelfStatus(userId, bookId, status);
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
  if (!(await bookExists(bookId))) return { error: "Книга не найдена" };
  const result = await saveShelfReview(userId, bookId, parsed.data);
  if ("error" in result) return { error: result.error };
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

  const { found, added } = await importBooks(userId, items);
  revalidatePath("/");
  return { message: `Найдено книг: ${found}, добавлено на полку: ${added}` };
}

// ---------- Цель на год ----------

export async function saveGoal(year: number, _: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const raw = String(formData.get("target") ?? "").trim();
  const parsed = goalSchema.safeParse({ year, target: raw === "" ? null : Number(raw) });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  await setGoal(userId, year, parsed.data.target);
  revalidatePath("/stats");
  return { message: parsed.data.target === null ? "Цель убрана" : "Цель сохранена" };
}

// ---------- Люди ----------

export async function followUser(userId: string) {
  const me = await requireUserId();
  await follow(me, userId);
  revalidatePath(`/u/${userId}`);
  revalidatePath("/feed");
}

export async function unfollowUser(userId: string) {
  const me = await requireUserId();
  await unfollow(me, userId);
  revalidatePath(`/u/${userId}`);
  revalidatePath("/feed");
}

export async function saveName(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUserId();
  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  await updateName(me, parsed.data.name);
  revalidatePath(`/u/${me}`);
  return { message: "Имя сохранено" };
}

// ---------- Списки ----------

/** Списки видны на /lists и в профиле владельца — обновляем обе страницы. */
function revalidateLists(me: string, listId?: string) {
  revalidatePath("/lists");
  revalidatePath(`/u/${me}`);
  if (listId) revalidatePath(`/lists/${listId}`);
}

function listInput(formData: FormData) {
  return listSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    isPublic: formData.get("isPublic") === "on",
  });
}

export async function createListAction(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUserId();
  const parsed = listInput(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const list = await createList(me, parsed.data);
  revalidateLists(me, list.id);
  const bookId = formData.get("bookId");
  if (typeof bookId === "string" && bookId) {
    await addToList(list.id, me, bookId);
    revalidatePath(`/books/${bookId}`);
    return { message: `Создан список «${list.title}», книга добавлена` };
  }
  redirect(`/lists/${list.id}`);
}

export async function updateListAction(listId: string, _: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUserId();
  const parsed = listInput(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await updateList(listId, me, parsed.data))) return { error: "Список не найден" };
  revalidateLists(me, listId);
  return { message: "Сохранено" };
}

export async function deleteListAction(listId: string) {
  const me = await requireUserId();
  await deleteList(listId, me);
  revalidateLists(me);
  redirect("/lists");
}

export async function toggleListItem(listId: string, bookId: string, add: boolean) {
  const me = await requireUserId();
  if (add) await addToList(listId, me, bookId);
  else await removeFromList(listId, me, bookId);
  revalidateLists(me, listId);
  revalidatePath(`/books/${bookId}`);
}
