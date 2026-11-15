/**
 * Массовое наполнение каталога из Open Library по тематикам.
 *
 *   npm run import:openlibrary                     # тематики по умолчанию, по 500 книг
 *   npm run import:openlibrary -- fantasy history  # свои тематики
 *   PER_SUBJECT=2000 npm run import:openlibrary
 */
import { db } from "../lib/db";
import { fetchOpenLibraryBySubject, upsertFromOpenLibrary } from "../lib/openlibrary";

const DEFAULT_SUBJECTS = [
  "fiction", "classics", "science_fiction", "fantasy", "mystery", "thriller", "romance",
  "historical_fiction", "horror", "biography", "history", "science", "philosophy",
  "psychology", "business", "russian_literature", "poetry", "children", "young_adult",
];
const PER_SUBJECT = Number(process.env.PER_SUBJECT ?? 500);
const PAGE = 100;

async function main() {
  const subjects = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_SUBJECTS;
  const before = await db.book.count();
  for (const subject of subjects) {
    for (let offset = 0; offset < PER_SUBJECT; offset += PAGE) {
      const hits = await fetchOpenLibraryBySubject(subject, PAGE, offset);
      for (const hit of hits) await upsertFromOpenLibrary(hit);
      process.stdout.write(`\r${subject}: ${offset + hits.length}`);
      if (hits.length < PAGE) break;
      await new Promise((r) => setTimeout(r, 1000)); // бережём API Open Library
    }
    console.log();
  }
  console.log(`Готово. В каталоге ${await db.book.count()} книг (+${(await db.book.count()) - before}).`);
}

main().finally(() => db.$disconnect());
