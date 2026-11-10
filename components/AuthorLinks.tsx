import Link from "next/link";
import { splitAuthors } from "@/lib/discover";

/** Каждый соавтор — ссылка на свою страницу. */
export function AuthorLinks({ author }: { author: string }) {
  const names = splitAuthors(author);
  return (
    <>
      {names.map((name, i) => (
        <span key={name}>
          {i > 0 && ", "}
          <Link href={`/authors/${encodeURIComponent(name)}`} className="hover:text-amber-400 hover:underline">
            {name}
          </Link>
        </span>
      ))}
    </>
  );
}
