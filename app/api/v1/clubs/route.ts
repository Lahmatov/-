import { apiError, apiUserId, clubSummaryJSON, json, readJson, unauthorized } from "@/lib/api";
import { createClub, myClubs } from "@/lib/clubs";
import { bookExists } from "@/lib/shelf";
import { clubSchema, firstIssue } from "@/lib/validation";

/** Мои клубы. */
export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  return json({ clubs: (await myClubs(userId)).map(clubSummaryJSON) });
}

/** { name, description?, bookId, chapters? } — создатель становится владельцем и первым участником. */
export async function POST(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  const parsed = clubSchema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(firstIssue(parsed.error));
  if (!(await bookExists(parsed.data.bookId))) return apiError("Книга не найдена", 404);
  const club = await createClub(userId, parsed.data);
  return json({ club: { id: club.id, inviteCode: club.inviteCode } }, 201);
}
