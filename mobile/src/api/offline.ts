// Офлайн-режим: последние ответы GET-запросов и очередь изменений, сделанных без сети.
// Хранилище подключается снаружи (AsyncStorage в приложении, Map в тестах) и стирается при выходе.

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: readonly string[]): Promise<void>;
}

export type PendingRequest = {
  id: string;
  method: string;
  path: string;
  body: string | null;
  createdAt: string;
};

const RESPONSE_PREFIX = "offline:response:";
const OUTBOX_KEY = "offline:outbox";

/** FNV-1a (64 бита): короткий стабильный ключ для URL запроса. */
export function hashKey(key: string): string {
  let hash = 0xcbf29ce484222325n;
  const bytes = new TextEncoder().encode(key);
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16);
}

let counter = 0;
function makeId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class OfflineStore {
  private _pending: PendingRequest[] = [];
  private loaded = false;

  constructor(private readonly storage: KeyValueStorage) {}

  /** Читает очередь с диска; вызывается один раз при старте. */
  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = await this.storage.getItem(OUTBOX_KEY);
      const parsed = raw ? (JSON.parse(raw) as PendingRequest[]) : [];
      // То, что успели поставить в очередь до окончания загрузки, остаётся в конце.
      this._pending = [...parsed, ...this._pending];
    } catch {
      this._pending = [...this._pending];
    }
  }

  get pending(): readonly PendingRequest[] {
    return this._pending;
  }

  // Ответы

  async response(key: string): Promise<string | null> {
    try {
      return await this.storage.getItem(RESPONSE_PREFIX + hashKey(key));
    } catch {
      return null;
    }
  }

  async saveResponse(body: string, key: string): Promise<void> {
    try {
      await this.storage.setItem(RESPONSE_PREFIX + hashKey(key), body);
    } catch {
      // Нет места — офлайн-копия просто не обновится.
    }
  }

  // Очередь

  enqueue(method: string, path: string, body: string | null): PendingRequest {
    const item: PendingRequest = { id: makeId(), method, path, body, createdAt: new Date().toISOString() };
    this._pending = [...this._pending, item];
    void this.persist();
    return item;
  }

  remove(id: string): void {
    this._pending = this._pending.filter((p) => p.id !== id);
    void this.persist();
  }

  /** Выход из аккаунта: чужие данные и неотправленные изменения не должны достаться следующему пользователю. */
  async clear(): Promise<void> {
    this._pending = [];
    try {
      const keys = (await this.storage.getAllKeys()).filter((k) => k.startsWith(RESPONSE_PREFIX) || k === OUTBOX_KEY);
      if (keys.length) await this.storage.multiRemove(keys);
    } catch {
      // ignore
    }
  }

  private persistChain: Promise<void> = Promise.resolve();

  private persist(): Promise<void> {
    const snapshot = this._pending;
    // Записи идут по очереди, чтобы старая не перезаписала новую.
    this.persistChain = this.persistChain.then(async () => {
      try {
        if (snapshot.length === 0) await this.storage.removeItem(OUTBOX_KEY);
        else await this.storage.setItem(OUTBOX_KEY, JSON.stringify(snapshot));
      } catch {
        // ignore
      }
    });
    return this.persistChain;
  }

  /** Для тестов: дождаться записи очереди. */
  flushWrites(): Promise<void> {
    return this.persistChain;
  }
}

/** Состояние связи для интерфейса: баннер «нет сети» и счётчик неотправленных изменений. */
export type SyncState = {
  isOffline: boolean;
  pendingCount: number;
  /** Сервер отклонил изменение из очереди (например, книгу удалили) — показываем один раз. */
  lastRejected: string | null;
};

export class SyncStatus {
  private state: SyncState = { isOffline: false, pendingCount: 0, lastRejected: null };
  private listeners = new Set<() => void>();

  get snapshot(): SyncState {
    return this.state;
  }

  update(patch: Partial<SyncState>): void {
    const next = { ...this.state, ...patch };
    if (
      next.isOffline === this.state.isOffline &&
      next.pendingCount === this.state.pendingCount &&
      next.lastRejected === this.state.lastRejected
    )
      return;
    this.state = next;
    this.listeners.forEach((l) => l());
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): SyncState => this.state;
}
