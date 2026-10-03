import { createRemoteJWKSet, jwtVerify } from "jose";
import { db } from "./db";

// Проверка ID-токенов, которые iOS-приложение получает от Google Sign-In и Sign in with Apple.

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export type VerifiedIdentity = { sub: string; email: string | null };

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedIdentity> {
  // Client ID iOS-приложения (и, при желании, веба) из Google Cloud Console.
  const audience = list(process.env.AUTH_GOOGLE_IOS_CLIENT_ID);
  if (audience.length === 0) throw new Error("AUTH_GOOGLE_IOS_CLIENT_ID не задан");
  const { payload } = await jwtVerify(idToken, googleKeys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience,
  });
  const email = payload.email_verified === true && typeof payload.email === "string" ? payload.email : null;
  return { sub: String(payload.sub), email };
}

export async function verifyAppleIdentityToken(identityToken: string): Promise<VerifiedIdentity> {
  const audience = list(process.env.APPLE_BUNDLE_ID);
  if (audience.length === 0) throw new Error("APPLE_BUNDLE_ID не задан");
  const { payload } = await jwtVerify(identityToken, appleKeys, { issuer: "https://appleid.apple.com", audience });
  // Apple может отдать скрытый адрес вида xyz@privaterelay.appleid.com — это нормально.
  const verified = payload.email_verified === true || payload.email_verified === "true";
  const email = verified && typeof payload.email === "string" ? payload.email : null;
  return { sub: String(payload.sub), email };
}

export class AccountConflictError extends Error {}

/**
 * Находит пользователя по привязанному аккаунту провайдера или создаёт нового.
 * Если email уже занят аккаунтом с паролем, не склеиваем их автоматически: пароль
 * мог установить кто угодно (email при регистрации не подтверждается).
 */
export async function findOrCreateOAuthUser(provider: "google" | "apple", identity: VerifiedIdentity, name?: string | null) {
  const account = await db.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId: identity.sub } },
    include: { user: true },
  });
  if (account) return account.user;

  const email = identity.email?.toLowerCase() ?? null;
  const existing = email ? await db.user.findUnique({ where: { email } }) : null;
  if (existing?.passwordHash) {
    throw new AccountConflictError("Этот email уже зарегистрирован с паролем — войдите по email и паролю.");
  }

  const user =
    existing ??
    (await db.user.create({ data: { email, name: name?.trim() || null, emailVerified: email ? new Date() : null } }));
  await db.account.create({
    data: { userId: user.id, type: "oidc", provider, providerAccountId: identity.sub },
  });
  return user;
}
