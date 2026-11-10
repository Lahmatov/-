import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, isLoginLimited, loginKeys, recordLoginFailure, recordLoginSuccess } from "@/lib/rate-limit";

class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // Вход по паролю в Auth.js работает только с JWT-сессиями.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(googleEnabled ? [Google] : []),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) throw new CredentialsSignin();
        const keys = loginKeys(clientIp(request), parsed.data.email);
        if (await isLoginLimited(keys)) throw new TooManyAttempts();
        const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
        const ok = !!user?.passwordHash && (await bcrypt.compare(parsed.data.password, user.passwordHash));
        if (!user || !ok) {
          await recordLoginFailure(keys);
          throw new CredentialsSignin();
        }
        await recordLoginSuccess(keys);
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  events: {
    /**
     * Auth.js создаёт пользователя Google с emailVerified: null. Если Google подтвердил адрес, отмечаем его
     * подтверждённым: от этого зависят права модератора (lib/moderation.ts) и баннер «подтвердите email».
     */
    async signIn({ user, account, profile }) {
      const email = typeof profile?.email === "string" ? profile.email.toLowerCase() : null;
      if (account?.provider !== "google" || profile?.email_verified !== true || !user.id || !email) return;
      if (user.email?.toLowerCase() !== email) return;
      await db.user.updateMany({ where: { id: user.id, emailVerified: null }, data: { emailVerified: new Date() } });
    },
  },
  callbacks: {
    /** Сессия, выданная до смены пароля, больше не действует. */
    async jwt({ token }) {
      if (!token.sub) return token;
      const user = await db.user.findUnique({ where: { id: token.sub }, select: { passwordChangedAt: true } });
      if (!user) return null;
      if (user.passwordChangedAt && token.iat && token.iat * 1000 < user.passwordChangedAt.getTime()) return null;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

/** Возвращает id текущего пользователя или null. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
