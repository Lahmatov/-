import { PrismaClient } from "@prisma/client";
import { makeSearchText } from "../lib/books";
import { SEED_BOOKS } from "./seed-books";
import { SEED_GENRES } from "./seed-genres";
import { GENRES } from "../lib/genres";

const db = new PrismaClient();

async function main() {
  for (const g of GENRES) {
    await db.genre.upsert({ where: { slug: g.slug }, create: { slug: g.slug, name: g.name }, update: { name: g.name } });
  }
  let created = 0;
  for (const [title, author, year] of SEED_BOOKS) {
    const searchText = makeSearchText(title, author);
    const book =
      (await db.book.findFirst({ where: { searchText } })) ??
      (created++, await db.book.create({ data: { title, author, year, searchText } }));
    for (const slug of SEED_GENRES[title] ?? []) {
      await db.bookGenre.upsert({
        where: { bookId_genreSlug: { bookId: book.id, genreSlug: slug } },
        create: { bookId: book.id, genreSlug: slug },
        update: {},
      });
    }
  }
  console.log(`Добавлено книг: ${created} (всего в списке ${SEED_BOOKS.length})`);
}

main().finally(() => db.$disconnect());
