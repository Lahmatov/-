import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { unreadCount } from "@/lib/notifications";
import { db } from "@/lib/db";
import { resendVerification } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Книжная полка",
  description: "Отмечайте, что читаете, и делитесь отзывами о книгах",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const unread = session?.user ? await unreadCount(session.user.id) : 0;
  // Плашка «подтвердите email» — только для входа по паролю (Google и Apple адрес уже подтвердили).
  const me = session?.user
    ? await db.user.findUnique({ where: { id: session.user.id }, select: { emailVerified: true, passwordHash: true } })
    : null;
  const needsVerification = !!me?.passwordHash && !me.emailVerified;
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
        {needsVerification && (
          <div className="border-b border-neutral-800 bg-neutral-900">
            <form action={resendVerification} className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-2 text-sm">
              <span className="text-neutral-300">
                Подтвердите email — письмо со ссылкой отправлено на {session?.user?.email}.
              </span>
              <SubmitButton className="btn px-2 py-0.5 text-amber-400 hover:underline">Отправить ещё раз</SubmitButton>
            </form>
          </div>
        )}
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
