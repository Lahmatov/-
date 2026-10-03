import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(80),
  email: z.string().trim().toLowerCase().email("Некорректный email"),
  password: z.string().min(8, "Пароль — минимум 8 символов").max(200),
});

const maxYear = () => new Date().getFullYear() + 2;

/** Книга из JSON API: год — число или null. */
export const bookJsonSchema = z.object({
  title: z.string().trim().min(1, "Укажите название").max(300),
  author: z.string().trim().min(1, "Укажите автора").max(300),
  year: z
    .number()
    .int()
    .refine((v) => v > -3000 && v <= maxYear(), "Некорректный год")
    .nullish()
    .transform((v) => v ?? null),
});

const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().date())
  .nullish()
  .transform((v) => (v ? new Date(v) : null));

export const reviewJsonSchema = z.object({
  rating: z.number().int().min(1, "Оценка — от 1 до 10").max(10, "Оценка — от 1 до 10").nullish().transform((v) => v ?? null),
  review: z
    .string()
    .max(10000, "Слишком длинный отзыв")
    .nullish()
    .transform((v) => v?.trim() || null),
  isPublic: z.boolean().default(true),
  startedAt: isoDate,
  finishedAt: isoDate,
});

export const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Некорректные данные";

export const goalSchema = z.object({
  // Верхняя граница считается при каждой проверке, а не при старте сервера (иначе «застрянет» после Нового года).
  year: z
    .number()
    .int()
    .min(1900, "Некорректный год")
    .refine((v) => v <= new Date().getUTCFullYear() + 1, "Некорректный год"),
  // null — убрать цель
  target: z.number().int().min(1, "Цель — от 1 книги").max(1000, "Слишком большая цель").nullable(),
});

export const nameSchema = z.object({ name: z.string().trim().min(1, "Укажите имя").max(80, "Слишком длинное имя") });

export const listSchema = z.object({
  title: z.string().trim().min(1, "Укажите название списка").max(120, "Слишком длинное название"),
  description: z
    .string()
    .max(1000, "Слишком длинное описание")
    .nullish()
    .transform((v) => v?.trim() || null),
  isPublic: z.boolean().default(true),
});

/** Книга из результатов Open Library — и для JSON API, и для формы на сайте. */
export const openLibraryHitSchema = z.object({
  key: z.string().regex(/^\/works\/OL\w+$/, "Некорректный ключ Open Library"),
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().min(1).max(300),
  year: z.number().int().nullish().transform((v) => v ?? null),
  isbn: z.string().max(20).nullish().transform((v) => v ?? null),
  coverUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://covers.openlibrary.org/"), "Обложка не из Open Library")
    .nullish()
    .transform((v) => v ?? null),
  pageCount: z.number().int().min(1).max(20000).nullish().transform((v) => v ?? null),
  subjects: z.array(z.string().max(200)).max(30).nullish().transform((v) => v ?? null),
});

export const progressSchema = z.object({
  currentPage: z.number().int().min(0, "Страница не может быть отрицательной").max(20000).nullable(),
  totalPages: z.number().int().min(1).max(20000).nullish(),
});

export const commentSchema = z.object({
  text: z.string().trim().min(1, "Пустой комментарий").max(2000, "Слишком длинный комментарий"),
});
