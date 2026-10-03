import { db } from "./db";

// Жалобы на отзывы и комментарии. Модераторы — пользователи с email из ADMIN_EMAILS (через запятую).

export const REPORT_REASONS = {
  SPAM: "Спам или реклама",
  ABUSE: "Оскорбления",
  SPOILER: "Спойлер без предупреждения",
  OTHER: "Другое",
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;
export const isReportReason = (v: unknown): v is ReportReason =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(REPORT_REASONS, v);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export async function isAdmin(userId: string | null | undefined) {
  if (!userId) return false;
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  return isAdminEmail(user?.email);
}

/** Жалоба. Повторная жалоба того же человека на то же — не дублируется. */
export async function report(reporterId: string, target: { entryId?: string; commentId?: string }, reason: ReportReason) {
  if (target.entryId) {
    const entry = await db.shelfEntry.findUnique({ where: { id: target.entryId } });
    if (!entry || !entry.isPublic || !entry.review || entry.userId === reporterId) return false;
  } else if (target.commentId) {
    const comment = await db.reviewComment.findUnique({ where: { id: target.commentId } });
    if (!comment || comment.userId === reporterId) return false;
  } else {
    return false;
  }
  const where = { reporterId, resolvedAt: null, entryId: target.entryId ?? null, commentId: target.commentId ?? null };
  if (!(await db.report.findFirst({ where }))) {
    await db.report.create({ data: { ...where, reason } });
  }
  return true;
}

export async function openReports() {
  const reports = await db.report.findMany({
    where: { resolvedAt: null },
    include: { reporter: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  const entryIds = reports.flatMap((r) => (r.entryId ? [r.entryId] : []));
  const commentIds = reports.flatMap((r) => (r.commentId ? [r.commentId] : []));
  const [entries, comments] = await Promise.all([
    db.shelfEntry.findMany({
      where: { id: { in: entryIds } },
      include: { user: { select: { id: true, name: true } }, book: { select: { id: true, title: true } } },
    }),
    db.reviewComment.findMany({
      where: { id: { in: commentIds } },
      include: { user: { select: { id: true, name: true } }, entry: { select: { bookId: true } } },
    }),
  ]);
  return reports.map((r) => ({
    ...r,
    entry: entries.find((e) => e.id === r.entryId) ?? null,
    comment: comments.find((c) => c.id === r.commentId) ?? null,
  }));
}

/**
 * Решение по жалобе: HIDE — скрыть текст отзыва, DELETE — удалить комментарий, DISMISS — отклонить.
 * Закрывает все открытые жалобы на тот же отзыв или комментарий.
 */
export async function resolveReport(reportId: string, action: "HIDE" | "DELETE" | "DISMISS") {
  const r = await db.report.findUnique({ where: { id: reportId } });
  if (!r || r.resolvedAt) return false;
  if (action === "HIDE" && r.entryId) {
    await db.shelfEntry.updateMany({ where: { id: r.entryId }, data: { reviewHidden: true } });
  } else if (action === "DELETE" && r.commentId) {
    await db.reviewComment.deleteMany({ where: { id: r.commentId } });
  }
  await db.report.updateMany({
    where: { resolvedAt: null, entryId: r.entryId, commentId: r.commentId },
    data: { resolvedAt: new Date(), resolution: action === "HIDE" ? "HIDDEN" : action === "DELETE" ? "DELETED" : "DISMISSED" },
  });
  return true;
}
