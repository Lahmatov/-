import { auth } from "@/auth";
import { csvResponse, exportShelf } from "@/lib/export";

/** Скачать свою полку в CSV (сайт, по сессии). */
export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Требуется вход", { status: 401 });
  return csvResponse(await exportShelf(session.user.id));
}
