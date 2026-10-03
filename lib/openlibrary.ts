import { db } from "./db";
import { makeSearchText } from "./books";

export type OpenLibraryHit = {
  key: string;
  title: string;
  author: string;
  year: number | null;
  isbn: string | null;
  coverUrl: string | null;
};

type OLDoc = {
  key: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
};

const FIELDS = "key,title,author_name,first_publish_year,cover_i,isbn";

function toHit(doc: OLDoc): OpenLibraryHit | null {
  if (!doc.title || !doc.author_name?.length) return null;
  return {
    key: doc.key,
    title: doc.title,
    author: doc.author_name.slice(0, 3).join(", "),
    year: doc.first_publish_year ?? null,
    isbn: doc.isbn?.[0] ?? null,
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
  };
}

/** Поиск в Open Library (~30 млн изданий). При недоступности сервиса возвращает []. */
export async function searchOpenLibrary(query: string, limit = 10): Promise<OpenLibraryHit[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=${FIELDS}&limit=${limit}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Bookshelf/0.1 (book tracking app)" },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { docs: OLDoc[] };
    return data.docs.map(toHit).filter((h): h is OpenLibraryHit => h !== null);
  } catch {
    return [];
  }
}

export async function fetchOpenLibraryBySubject(subject: string, limit: number, offset: number) {
  const url = `https://openlibrary.org/search.json?subject=${encodeURIComponent(subject)}&fields=${FIELDS}&limit=${limit}&offset=${offset}&sort=rating`;
  const res = await fetch(url, { headers: { "User-Agent": "Bookshelf/0.1 (book tracking app)" } });
  if (!res.ok) throw new Error(`Open Library ответил ${res.status}`);
  const data = (await res.json()) as { docs: OLDoc[] };
  return data.docs.map(toHit).filter((h): h is OpenLibraryHit => h !== null);
}

/** Сохраняет книгу из Open Library в локальный каталог (или возвращает уже сохранённую). */
export async function upsertFromOpenLibrary(hit: OpenLibraryHit, addedById?: string) {
  const existing = await db.book.findFirst({
    where: { OR: [{ openLibraryKey: hit.key }, { searchText: makeSearchText(hit.title, hit.author) }] },
  });
  if (existing) return existing;
  return db.book.create({
    data: {
      title: hit.title,
      author: hit.author,
      year: hit.year,
      isbn: hit.isbn,
      coverUrl: hit.coverUrl,
      openLibraryKey: hit.key,
      searchText: makeSearchText(hit.title, hit.author),
      addedById,
    },
  });
}

/** Ищет книгу по ISBN в Open Library. null — не нашли или сервис недоступен. */
export async function lookupOpenLibraryIsbn(isbn13: string): Promise<OpenLibraryHit | null> {
  const url = `https://openlibrary.org/search.json?isbn=${isbn13}&fields=${FIELDS}&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Bookshelf/0.1 (book tracking app)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { docs: OLDoc[] };
    const hit = data.docs.map(toHit).find((h) => h !== null) ?? null;
    return hit && { ...hit, isbn: isbn13 };
  } catch {
    return null;
  }
}
