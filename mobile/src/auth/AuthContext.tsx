import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { APIClient, APIError, type AuthResponse } from "../api/client";
import type { User } from "../api/models";
import { OfflineStore } from "../api/offline";
import { apiBaseURL } from "../config";
import { sessionStorage } from "./storage";
import { disablePush } from "../lib/push";

export type AuthState = { kind: "restoring" } | { kind: "signedOut" } | { kind: "signedIn"; user: User };

type AuthContextValue = {
  state: AuthState;
  api: APIClient;
  user: User | null;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  signInWithApple(identityToken: string, name: string | null): Promise<void>;
  signInWithGoogle(idToken: string): Promise<void>;
  updateName(name: string): Promise<void>;
  refreshUser(): Promise<void>;
  logout(): Promise<void>;
  deleteAccount(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function createDefaultClient(): APIClient {
  return new APIClient(apiBaseURL(), new OfflineStore(AsyncStorage));
}

export function AuthProvider({ children, client }: { children: ReactNode; client?: APIClient }) {
  const api = useMemo(() => client ?? createDefaultClient(), [client]);
  const [state, setState] = useState<AuthState>({ kind: "restoring" });
  const stateRef = useRef(state);
  stateRef.current = state;

  const clearSession = useCallback(async () => {
    api.token = null;
    await sessionStorage.clear();
    await api.offline?.clear();
    api.sync.update({ pendingCount: 0, isOffline: false });
    setState({ kind: "signedOut" });
  }, [api]);

  const storeUser = useCallback(async (user: User) => {
    await sessionStorage.saveUser(user).catch(() => undefined);
    setState({ kind: "signedIn", user });
  }, []);

  const accept = useCallback(
    async (response: AuthResponse) => {
      api.token = response.token;
      await sessionStorage.saveToken(response.token);
      await storeUser(response.user);
    },
    [api, storeUser],
  );

  useEffect(() => {
    api.onUnauthorized = () => void clearSession();
    let cancelled = false;
    (async () => {
      await api.loadOffline();
      const token = await sessionStorage.readToken();
      if (cancelled) return;
      if (!token) {
        setState({ kind: "signedOut" });
        return;
      }
      api.token = token;
      const cached = await sessionStorage.readUser();
      if (cached && !cancelled) setState({ kind: "signedIn", user: cached });
      try {
        const user = await api.me();
        if (!cancelled) await storeUser(user);
      } catch (error) {
        if (error instanceof APIError && error.kind === "unauthorized") {
          await clearSession();
        } else if (!cancelled && stateRef.current.kind === "restoring") {
          // Нет сети и нет сохранённого профиля — придётся войти.
          setState({ kind: "signedOut" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, clearSession, storeUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      api,
      user: state.kind === "signedIn" ? state.user : null,
      login: async (email, password) => accept(await api.login(email, password)),
      register: async (name, email, password) => accept(await api.register(name, email, password)),
      signInWithApple: async (token, name) => accept(await api.signInWithApple(token, name)),
      signInWithGoogle: async (idToken) => accept(await api.signInWithGoogle(idToken)),
      updateName: async (name) => storeUser(await api.updateName(name)),
      refreshUser: async () => storeUser(await api.me()),
      logout: async () => {
        await disablePush(api).catch(() => undefined);
        await api.logout().catch(() => undefined);
        await clearSession();
      },
      deleteAccount: async () => {
        await api.deleteAccount();
        await clearSession();
      },
    }),
    [state, api, accept, storeUser, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth вне AuthProvider");
  return value;
}

export function useAPI(): APIClient {
  return useAuth().api;
}
