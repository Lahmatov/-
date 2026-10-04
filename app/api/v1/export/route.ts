import { apiUserId, unauthorized } from "@/lib/api";
import { csvResponse, exportShelf } from "@/lib/export";

/** Своя полка в CSV (приложение, по токену). */
export async function GET(req: Request) {
  const userId = await apiUserId(req);
  if (!userId) return unauthorized();
  return csvResponse(await exportShelf(userId));
}
