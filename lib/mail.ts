import nodemailer from "nodemailer";

// Письма: подтверждение email и сброс пароля. SMTP задаётся в SMTP_URL
// (например smtps://user:password@smtp.yandex.ru:465). Без него письма пишутся в лог сервера —
// удобно при разработке: ссылку можно скопировать из консоли.

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
    console.log(`[mail] Кому: ${to}\n[mail] Тема: ${subject}\n${text}`);
    return;
  }
  await t.sendMail({ from: process.env.MAIL_FROM ?? "Книжная полка <no-reply@localhost>", to, subject, text });
}
