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
