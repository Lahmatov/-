"use client";

import { useState } from "react";

/** «Поделиться»: системное меню на телефоне, иначе копирование ссылки. */
export function ShareButton({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // пользователь закрыл меню — ничего не делаем
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" onClick={share} className="btn-ghost py-1 text-sm">
      {copied ? "Ссылка скопирована" : "Поделиться"}
    </button>
  );
}
