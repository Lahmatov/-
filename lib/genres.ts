import { db } from "./db";
import type { Lang } from "./i18n";

/** Справочник жанров и темы Open Library (subjects), по которым жанр ставится автоматически. */
export const GENRES: { slug: string; name: string; nameEn: string; subjects: string[] }[] = [
  { slug: "classics", name: "Классика", nameEn: "Classics", subjects: ["classic literature", "classics"] },
  { slug: "fantasy", name: "Фэнтези", nameEn: "Fantasy", subjects: ["fantasy"] },
  { slug: "science-fiction", name: "Фантастика", nameEn: "Science fiction", subjects: ["science fiction"] },
  { slug: "dystopia", name: "Антиутопия", nameEn: "Dystopia", subjects: ["dystopia", "dystopian"] },
  { slug: "detective", name: "Детектив", nameEn: "Mystery", subjects: ["detective", "mystery"] },
  { slug: "thriller", name: "Триллер", nameEn: "Thriller", subjects: ["thriller", "suspense"] },
  { slug: "horror", name: "Ужасы", nameEn: "Horror", subjects: ["horror"] },
  { slug: "romance", name: "Любовный роман", nameEn: "Romance", subjects: ["romance", "love stories"] },
  { slug: "historical", name: "Исторический роман", nameEn: "Historical fiction", subjects: ["historical fiction"] },
  { slug: "adventure", name: "Приключения", nameEn: "Adventure", subjects: ["adventure"] },
  { slug: "humor", name: "Юмор", nameEn: "Humor", subjects: ["humor", "humorous"] },
  { slug: "poetry", name: "Поэзия", nameEn: "Poetry", subjects: ["poetry"] },
  { slug: "children", name: "Детская", nameEn: "Children's", subjects: ["juvenile fiction", "children's"] },
  { slug: "young-adult", name: "Подростковая", nameEn: "Young adult", subjects: ["young adult"] },
  { slug: "biography", name: "Биография", nameEn: "Biography", subjects: ["biography", "autobiography", "memoir"] },
  { slug: "history", name: "История", nameEn: "History", subjects: ["world history", "history, modern", "history and criticism"] },
  { slug: "science", name: "Научпоп", nameEn: "Popular science", subjects: ["popular science", "science, popular", "popular works"] },
  { slug: "psychology", name: "Психология", nameEn: "Psychology", subjects: ["psychology"] },
  { slug: "philosophy", name: "Философия", nameEn: "Philosophy", subjects: ["philosophy"] },
  { slug: "business", name: "Бизнес", nameEn: "Business", subjects: ["business", "economics", "management"] },
  { slug: "self-help", name: "Саморазвитие", nameEn: "Self-help", subjects: ["self-help", "personal development"] },
];

export const genreName = (slug: string, lang: Lang = "ru") => {
  const g = GENRES.find((x) => x.slug === slug);
  return g ? (lang === "en" ? g.nameEn : g.name) : slug;
};
export const isGenre = (slug: unknown): slug is string => typeof slug === "string" && GENRES.some((g) => g.slug === slug);

/** Жанры по темам Open Library: тема должна совпасть целиком или начинаться с ключевой фразы. */
export function genresFromSubjects(subjects: string[]): string[] {
  const lower = subjects.map((s) => s.toLowerCase().trim());
  return GENRES.filter((g) => g.subjects.some((key) => lower.some((s) => s === key || s.startsWith(`${key},`) || s.startsWith(`${key} `)))).map(
    (g) => g.slug,
  );
}

/** Заполняет справочник жанров (идемпотентно). */
export async function ensureGenres() {
  for (const g of GENRES) {
    await db.genre.upsert({ where: { slug: g.slug }, create: { slug: g.slug, name: g.name }, update: { name: g.name } });
  }
}

let genresReady: Promise<void> | null = null;

export async function addGenres(bookId: string, slugs: string[], addedById?: string | null) {
  // Справочник заполняется сидом; на всякий случай — один раз за процесс и здесь (иначе внешний ключ не даст вставить).
  genresReady ??= ensureGenres();
  await genresReady;
  for (const slug of slugs.filter(isGenre)) {
    await db.bookGenre.upsert({
      where: { bookId_genreSlug: { bookId, genreSlug: slug } },
      create: { bookId, genreSlug: slug, addedById: addedById ?? null },
      update: {},
    });
  }
}

export async function removeGenre(bookId: string, slug: string) {
  await db.bookGenre.deleteMany({ where: { bookId, genreSlug: slug } });
}

export async function bookGenres(bookId: string, lang: Lang = "ru") {
  const rows = await db.bookGenre.findMany({ where: { bookId }, select: { genreSlug: true } });
  return rows.map((r) => ({ slug: r.genreSlug, name: genreName(r.genreSlug, lang) }));
}
