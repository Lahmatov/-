import { PrismaClient } from "@prisma/client";
import { makeSearchText } from "../lib/books";
import { SEED_BOOKS } from "./seed-books";

const db = new PrismaClient();

async function main() {
  let created = 0;
  for (const [title, author, year] of SEED_BOOKS) {
    const searchText = makeSearchText(title, author);
    const exists = await db.book.findFirst({ where: { searchText } });
    if (exists) continue;
    await db.book.create({ data: { title, author, year, searchText } });
    created++;
  }
  console.log(`Добавлено книг: ${created} (всего в списке ${SEED_BOOKS.length})`);
}

main().finally(() => db.$disconnect());
