import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { appUrl, sendMail } from "./mail";

// Подтверждение email и сброс пароля. Токены одноразовые, в базе хранится только SHA-256.

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const HOUR = 3600 * 1000;

async function issue(kind: "verify" | "reset", email: string, ttlMs: number) {
  const token = randomBytes(32).toString("base64url");
  const identifier = `${kind}:${email}`;
  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({ data: { identifier, token: sha(token), expires: new Date(Date.now() + ttlMs) } });
  return token;
}

/** Находит действующий токен и сразу удаляет его (одноразовый). Возвращает email или null. */
async function consume(kind: "verify" | "reset", token: string): Promise<string | null> {
  const record = await db.verificationToken.findFirst({ where: { token: sha(token), identifier: { startsWith: `${kind}:` } } });
  if (!record) return null;
  await db.verificationToken.deleteMany({ where: { identifier: record.identifier } });
  if (record.expires < new Date()) return null;
  return record.identifier.slice(kind.length + 1);
}

export async function sendVerificationEmail(email: string) {
  const token = await issue("verify", email, 48 * HOUR);
  await sendMail(
    email,
    "Подтвердите email — Книжная полка",
    `Здравствуйте!\n\nПодтвердите адрес, чтобы мы могли помочь, если вы забудете пароль:\n${appUrl()}/verify-email?token=${token}\n\nСсылка действует 48 часов. Если вы не регистрировались — просто проигнорируйте письмо.`,
  );
}

export async function verifyEmail(token: string) {
  const email = await consume("verify", token);
  if (!email) return false;
  const { count } = await db.user.updateMany({ where: { email }, data: { emailVerified: new Date() } });
  return count > 0;
}

/**
 * Письмо со ссылкой для сброса пароля. Ответ одинаковый, есть такой email или нет, —
 * чтобы по форме нельзя было узнать, кто зарегистрирован.
 */
export async function requestPasswordReset(email: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user?.email) return;
  const token = await issue("reset", user.email, HOUR);
  await sendMail(
    user.email,
    "Сброс пароля — Книжная полка",
    `Здравствуйте!\n\nЧтобы задать новый пароль, откройте ссылку:\n${appUrl()}/reset-password?token=${token}\n\nСсылка действует час. Если вы не просили сброс — ничего делать не нужно, пароль останется прежним.`,
  );
}

/** Новый пароль по ссылке из письма. Выходит из всех приложений (токены API отзываются). */
export async function resetPassword(token: string, password: string) {
  const email = await consume("reset", token);
  if (!email) return false;
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return false;
  await db.user.update({
    where: { id: user.id },
    // Письмо дошло — значит, адрес настоящий.
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      passwordChangedAt: new Date(),
      emailVerified: user.emailVerified ?? new Date(),
    },
  });
  await db.apiToken.deleteMany({ where: { userId: user.id } });
  return true;
}
