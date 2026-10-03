import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { unreadCount } from "@/lib/notifications";
import "./globals.css";

export const metadata: Metadata = {
  title: "Книжная полка",
  description: "Отмечайте, что читаете, и делитесь отзывами о книгах",
};

export const viewport: Viewport = { themeColor: "#0a0a0a" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const unread = session?.user ? await unreadCount(session.user.id) : 0;
  return (
    <html lang="ru">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
            <Link href="/" className="rounded bg-amber-500 px-2 py-1 text-sm font-black text-black">
              BOOKS
            </Link>
            <form action="/search" className="min-w-40 flex-1">
              <input name="q" placeholder="Название или автор…" className="input py-1.5" />
            </form>
            {session?.user ? (
              <nav className="flex items-center gap-3 text-sm">
                {[
                  ["/feed", "Лента"],
                  ["/discover", "Обзор"],
                  ["/lists", "Списки"],
                  ["/stats", "Итоги"],
                  [`/u/${session.user.id}`, "Профиль"],
                ].map(([href, label]) => (
                  <Link key={href} href={href} className="text-neutral-400 hover:text-neutral-100">
                    {label}
                  </Link>
                ))}
                <Link href="/notifications" className="relative text-neutral-400 hover:text-neutral-100" aria-label="Уведомления">
                  🔔
                  {unread > 0 && (
                    <span className="absolute -right-2 -top-1 rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
              </nav>
            ) : (
              <>
              <Link href="/discover" className="text-sm text-neutral-400 hover:text-neutral-100">
                Обзор
              </Link>
              <Link href="/login" className="btn-primary py-1.5">
                Войти
              </Link>
              </>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
