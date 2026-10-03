import { apiError, apiUserId, bookJSON, entryJSON, json } from "@/lib/api";
import { getBookDetails } from "@/lib/shelf";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const details = await getBookDetails(id, await apiUserId(req));
  if (!details) return apiError("Книга не найдена", 404);
  return json({
    book: bookJSON(details.book),
    myEntry: details.mine ? entryJSON(details.mine) : null,
    stats: details.stats,
    reviews: details.reviews.map((r) => ({
      id: r.id,
      userName: r.user.name ?? "Читатель",
      rating: r.rating,
      review: r.review,
      updatedAt: r.updatedAt,
    })),
  });
}
