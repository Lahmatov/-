import { db } from "./db";

/** Справочник жанров и темы Open Library (subjects), по которым жанр ставится автоматически. */
export const GENRES: { slug: string; name: string; subjects: string[] }[] = [
  { slug: "classics", name: "Классика", subjects: ["classic literature", "classics"] },
  { slug: "fantasy", name: "Фэнтези", subjects: ["fantasy"] },
  { slug: "science-fiction", name: "Фантастика", subjects: ["science fiction"] },
  { slug: "dystopia", name: "Антиутопия", subjects: ["dystopia", "dystopian"] },
  { slug: "detective", name: "Детектив", subjects: ["detective", "mystery"] },
  { slug: "thriller", name: "Триллер", subjects: ["thriller", "suspense"] },
  { slug: "horror", name: "Ужасы", subjects: ["horror"] },
  { slug: "romance", name: "Любовный роман", subjects: ["romance", "love stories"] },
  { slug: "historical", name: "Исторический роман", subjects: ["historical fiction"] },
  { slug: "adventure", name: "Приключения", subjects: ["adventure"] },
  { slug: "humor", name: "Юмор", subjects: ["humor", "humorous"] },
  { slug: "poetry", name: "Поэзия", subjects: ["poetry"] },
  { slug: "children", name: "Детская", subjects: ["juvenile fiction", "children's"] },
  { slug: "young-adult", name: "Подростковая", subjects: ["young adult"] },
  { slug: "biography", name: "Биография", subjects: ["biography", "autobiography", "memoir"] },
  { slug: "history", name: "История", subjects: ["world history", "history, modern", "history and criticism"] },
  { slug: "science", name: "Научпоп", subjects: ["popular science", "science, popular", "popular works"] },
  { slug: "psychology", name: "Психология", subjects: ["psychology"] },
  { slug: "philosophy", name: "Философия", subjects: ["philosophy"] },
  { slug: "business", name: "Бизнес", subjects: ["business", "economics", "management"] },
  { slug: "self-help", name: "Саморазвитие", subjects: ["self-help", "personal development"] },
];

export const genreName = (slug: string) => GENRES.find((g) => g.slug === slug)?.name ?? slug;
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

export async function bookGenres(bookId: string) {
  const rows = await db.bookGenre.findMany({ where: { bookId }, select: { genreSlug: true } });
  return rows.map((r) => ({ slug: r.genreSlug, name: genreName(r.genreSlug) }));
}
