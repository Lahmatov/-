import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { resolveReportAction } from "@/lib/actions";
import { REPORT_REASONS, isAdmin, isReportReason, openReports } from "@/lib/moderation";
import { timeAgo } from "@/lib/time";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ReportsPage() {
  const session = await auth();
  if (!(await isAdmin(session?.user?.id))) notFound();
  const reports = await openReports();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Жалобы</h1>
      {reports.length === 0 && <p className="text-neutral-500">Открытых жалоб нет.</p>}
      {reports.map((r) => {
        const author = r.entry?.user ?? r.comment?.user;
        const text = r.entry?.review ?? r.comment?.text;
        const bookId = r.entry?.book.id ?? r.comment?.entry.bookId;
        return (
          <article key={r.id} className="space-y-2 rounded-lg border border-neutral-800 p-4">
            <div className="flex flex-wrap gap-x-3 text-sm text-neutral-400">
              <span className="font-semibold text-neutral-200">{isReportReason(r.reason) ? REPORT_REASONS[r.reason] : r.reason}</span>
              <span>{r.entry ? "отзыв" : "комментарий"}</span>
              <span>от {r.reporter.name ?? "читателя"}</span>
              <span>{timeAgo(r.createdAt)}</span>
            </div>
            {text ? (
              <blockquote className="border-l-2 border-neutral-700 pl-3 whitespace-pre-line text-neutral-200">{text}</blockquote>
            ) : (
              <p className="text-neutral-500">Текст уже удалён.</p>
            )}
            <div className="text-sm text-neutral-500">
              Автор:{" "}
              {author ? (
                <Link href={`/u/${author.id}`} className="hover:underline">
                  {author.name ?? "Читатель"}
                </Link>
              ) : (
                "—"
              )}
              {bookId && (
                <>
                  {" · "}
                  <Link href={`/books/${bookId}`} className="hover:underline">
                    к книге
                  </Link>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {r.entry && (
                <form action={resolveReportAction.bind(null, r.id, "HIDE")}>
                  <SubmitButton className="btn-ghost py-1 text-sm text-red-400">Скрыть отзыв</SubmitButton>
                </form>
              )}
              {r.comment && (
                <form action={resolveReportAction.bind(null, r.id, "DELETE")}>
                  <SubmitButton className="btn-ghost py-1 text-sm text-red-400">Удалить комментарий</SubmitButton>
                </form>
              )}
              <form action={resolveReportAction.bind(null, r.id, "DISMISS")}>
                <SubmitButton className="btn-ghost py-1 text-sm">Отклонить жалобу</SubmitButton>
              </form>
            </div>
          </article>
        );
      })}
    </div>
  );
}
