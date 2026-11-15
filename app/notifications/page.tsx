import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listNotifications, markAllRead } from "@/lib/notifications";
import { timeAgo } from "@/lib/time";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const items = await listNotifications(session.user.id);
  // Открыли страницу — всё прочитано (список уже загружен с прежними отметками).
  await markAllRead(session.user.id);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Уведомления</h1>
      {items.length === 0 ? (
        <p className="text-neutral-500">Пока ничего. Здесь появятся новые подписчики, лайки и комментарии к вашим отзывам.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={n.book ? `/books/${n.book.id}` : `/u/${n.actor.id}`}
                className={`flex items-baseline gap-3 rounded-lg p-3 hover:bg-neutral-900 ${n.read ? "" : "bg-neutral-900"}`}
              >
                {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-label="новое" />}
                <span className="flex-1">{n.text}</span>
                <span className="shrink-0 text-xs text-neutral-500">{timeAgo(n.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
