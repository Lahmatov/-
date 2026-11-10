/* eslint-disable @next/next/no-img-element */
export function BookCover({ title, coverUrl, size = "sm" }: { title: string; coverUrl: string | null; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-60 w-40" : "h-24 w-16";
  if (coverUrl) {
    return <img src={coverUrl} alt={title} className={`${cls} shrink-0 rounded object-cover`} loading="lazy" />;
  }
  return (
    <div className={`${cls} flex shrink-0 items-center justify-center rounded bg-neutral-800 p-1 text-center text-[10px] leading-tight text-neutral-500`}>
      {title}
    </div>
  );
}
