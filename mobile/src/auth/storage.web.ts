import type { User } from "../api/models";

// Веб-сборка (react-native-web) нужна только для e2e-тестов в браузере: у expo-secure-store нет веб-версии,
// поэтому токен и профиль лежат в localStorage. Нативные сборки используют storage.ts (Keychain / Keystore).

const TOKEN_KEY = "apiToken";
const USER_KEY = "currentUser";

function read(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export const sessionStorage = {
  async readToken(): Promise<string | null> {
    return read(TOKEN_KEY);
  },
  async saveToken(token: string): Promise<void> {
    globalThis.localStorage?.setItem(TOKEN_KEY, token);
  },
  async readUser(): Promise<User | null> {
    const raw = read(USER_KEY);
    try {
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  },
  async saveUser(user: User): Promise<void> {
    globalThis.localStorage?.setItem(USER_KEY, JSON.stringify(user));
  },
  async clear(): Promise<void> {
    try {
      globalThis.localStorage?.removeItem(TOKEN_KEY);
      globalThis.localStorage?.removeItem(USER_KEY);
    } catch {
      // нет доступа к хранилищу — нечего очищать
    }
  },
};
