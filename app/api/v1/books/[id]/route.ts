import { apiError, apiUserId, bookJSON, entryJSON, json } from "@/lib/api";
import { getBookDetails } from "@/lib/shelf";
import { socialFor } from "@/lib/reviews";
import { langOf } from "@/lib/i18n";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewerId = await apiUserId(req);
  const details = await getBookDetails(id, viewerId, langOf(req));
  if (!details) return apiError("Книга не найдена", 404);
  const social = await socialFor(details.reviews.map((r) => r.id), viewerId);
  return json({
    book: bookJSON(details.book),
    myEntry: details.mine ? entryJSON(details.mine) : null,
    stats: details.stats,
    genres: details.genres,
    reviews: details.reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name ?? "Читатель",
      rating: r.rating,
      review: r.review,
      updatedAt: r.updatedAt,
      ...social.get(r.id)!,
    })),
  });
}
