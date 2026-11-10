import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { User } from "../api/models";

// Токен — в защищённом хранилище (Keychain / Android Keystore), профиль — в AsyncStorage,
// чтобы приложение открывалось сразу, даже без сети.

const TOKEN_KEY = "apiToken";
const USER_KEY = "currentUser";

export const sessionStorage = {
  async readToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async readUser(): Promise<User | null> {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  },
  async saveUser(user: User): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  async clear(): Promise<void> {
    await Promise.allSettled([SecureStore.deleteItemAsync(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
  },
};
