import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { auth } from "@/auth";
import { parseYear } from "@/lib/stats";
import { getWrapped } from "@/lib/wrapped";
import { Plural } from "@/lib/plural";

export const runtime = "nodejs";

const font = (file: string) => readFile(path.join(process.cwd(), "assets/fonts", file));

/** Картинка «Итоги года» 1080×1350 для соцсетей. Только для владельца (по сессии). */
export async function GET(_: Request, { params }: { params: Promise<{ year: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Требуется вход", { status: 401 });
  const year = parseYear((await params).year);
  const w = await getWrapped(session.user.id, year);
  const [regular, bold] = await Promise.all([font("DejaVuSans.ttf"), font("DejaVuSans-Bold.ttf")]);

  const facts: [string, string][] = [];
  if (w.pagesRead) facts.push(["страниц прочитано", w.pagesRead.toLocaleString("ru-RU")]);
  if (w.avgRating) facts.push(["средняя оценка", `★ ${w.avgRating}`]);
  if (w.topAuthor) facts.push(["любимый автор", w.topAuthor.value]);
  if (w.topGenre) facts.push(["любимый жанр", w.topGenre.name]);
  if (w.bestBook) facts.push(["лучшая книга", `«${w.bestBook.book.title}» — ${w.bestBook.rating}/10`]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 90,
          background: "linear-gradient(135deg, #f59e0b 0%, #c2410c 100%)",
          color: "#0a0a0a",
          fontFamily: "DejaVu",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 6 }}>{`ИТОГИ ${year}`}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 260, fontWeight: 700, lineHeight: 1 }}>{String(w.booksRead)}</div>
          <div style={{ fontSize: 56, fontWeight: 700 }}>
            {Plural.ru(w.booksRead, "книга прочитана", "книги прочитано", "книг прочитано")}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {facts.map(([label, value]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 28, opacity: 0.7 }}>{label}</div>
              <div style={{ fontSize: 44, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 32, opacity: 0.75 }}>{`${w.name} · Книжная полка`}</div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "DejaVu", data: regular, weight: 400, style: "normal" },
        { name: "DejaVu", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
