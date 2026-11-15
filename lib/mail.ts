import nodemailer from "nodemailer";

// Письма: подтверждение email и сброс пароля. SMTP задаётся в SMTP_URL
// (например smtps://user:password@smtp.yandex.ru:465). Без него при разработке (`npm run dev`) письма
// пишутся в лог сервера — ссылку можно скопировать из консоли. В production без SMTP отправка падает:
// ссылки сброса пароля в логах позволили бы захватить аккаунт.

let transport: nodemailer.Transporter | null | undefined;

function getTransport() {
  if (transport === undefined) transport = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL) : null;
  return transport;
}

/** Адрес сайта для ссылок в письмах. */
export function appUrl(): string {
  return (process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function sendMail(to: string, subject: string, text: string) {
  const t = getTransport();
  if (!t) {
    if (process.env.NODE_ENV !== "development") throw new Error("SMTP_URL не задан — письмо не отправлено");
    console.log(`[mail] Кому: ${to}\n[mail] Тема: ${subject}\n${text}`);
    return;
  }
  await t.sendMail({ from: process.env.MAIL_FROM ?? "Книжная полка <no-reply@localhost>", to, subject, text });
}
