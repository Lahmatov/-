import { db } from "@/lib/db";
import { apiUserId, bookJSON, entryJSON, json, unauthorized } from "@/lib/api";
import { STATUSES, isStatus } from "@/lib/status";

/** Полка: счётчики по всем статусам и книги выбранного статуса (?status=READING; без параметра — все). */
export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const status = new URL(req.url).searchParams.get("status");

  const [groups, entries] = await Promise.all([
    db.shelfEntry.groupBy({ by: ["status"], where: { userId }, _count: true }),
    db.shelfEntry.findMany({
      where: { userId, ...(isStatus(status) ? { status } : {}) },
      include: { book: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, groups.find((g) => g.status === s)?._count ?? 0]));
  return json({ counts, items: entries.map((e) => ({ book: bookJSON(e.book), entry: entryJSON(e) })) });
}
