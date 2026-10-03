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
