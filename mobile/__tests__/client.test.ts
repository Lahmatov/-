import { APIClient, APIError } from "../src/api/client";
import { OfflineStore, type KeyValueStorage } from "../src/api/offline";

class MemoryStorage implements KeyValueStorage {
  map = new Map<string, string>();
  async getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  async setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  async removeItem(k: string) {
    this.map.delete(k);
  }
  async getAllKeys() {
    return [...this.map.keys()];
  }
  async multiRemove(keys: readonly string[]) {
    keys.forEach((k) => this.map.delete(k));
  }
}

type Call = { url: string; method: string; body: unknown; headers: Record<string, string> };

/** Сервер-заглушка: ответы по очереди; "offline" — сетевой сбой. */
function stubServer(responses: (Response | "offline" | ((call: Call) => Response | "offline"))[]) {
  const calls: Call[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    const call: Call = {
      url,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body ?? null,
      headers: (init?.headers ?? {}) as Record<string, string>,
    };
    calls.push(call);
    let next = responses.shift();
    if (typeof next === "function") next = next(call);
    if (!next || next === "offline") throw new TypeError("Network request failed");
    return next;
  };
  return { calls, fetchImpl };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const entry = { status: "READING", startedAt: null, finishedAt: null, rating: null, review: null, isPublic: true, currentPage: null, totalPages: null, updatedAt: "2026-10-01T10:00:00.000Z" };

function makeClient(responses: Parameters<typeof stubServer>[0], storage = new MemoryStorage()) {
  const server = stubServer(responses);
  const client = new APIClient("https://example.com/", new OfflineStore(storage), server.fetchImpl, 1000);
  client.token = "t0ken";
  return { client, server, storage };
}

test("requests carry the token, language and JSON body", async () => {
  const { client, server } = makeClient([json({ token: "x", user: { id: "u", name: "A", email: "a@b.c" } })]);
  await client.login("a@b.c", "secret");
  expect(server.calls[0].url).toBe("https://example.com/api/v1/auth/login");
  expect(server.calls[0].method).toBe("POST");
  expect(server.calls[0].body).toEqual({ email: "a@b.c", password: "secret" });
  expect(server.calls[0].headers.Authorization).toBe("Bearer t0ken");
  expect(server.calls[0].headers["Accept-Language"]).toBe("ru");
});

test("path segments and queries are encoded", async () => {
  const { client, server } = makeClient([json({ name: "AC/DC?", books: [] }), json({ local: [], openLibrary: [] })]);
  await client.author("AC/DC?");
  await client.search("мастер и маргарита");
  expect(server.calls[0].url).toBe("https://example.com/api/v1/authors/AC%2FDC%3F");
  expect(server.calls[1].url).toBe("https://example.com/api/v1/search?q=%D0%BC%D0%B0%D1%81%D1%82%D0%B5%D1%80%20%D0%B8%20%D0%BC%D0%B0%D1%80%D0%B3%D0%B0%D1%80%D0%B8%D1%82%D0%B0");
});

test("server errors carry the server message; 401 signs out", async () => {
  const { client } = makeClient([json({ error: "Книга не найдена" }, 404), json({ error: "Нужно войти" }, 401)]);
  const onUnauthorized = jest.fn();
  client.onUnauthorized = onUnauthorized;
  await expect(client.book("x")).rejects.toMatchObject({ kind: "server", message: "Книга не найдена", status: 404 });
  await expect(client.me()).rejects.toMatchObject({ kind: "unauthorized" });
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
});

test("GET falls back to the cached response when offline", async () => {
  const shelf = { counts: { READING: 1 }, items: [] };
  const { client } = makeClient([json(shelf), "offline", "offline"]);
  await client.shelf();
  expect(await client.shelf()).toEqual(shelf);
  expect(client.sync.snapshot.isOffline).toBe(true);
  await expect(client.book("never-loaded")).rejects.toMatchObject({ kind: "offline" });
});

test("queueable changes are queued offline and sent in order when back online", async () => {
  const storage = new MemoryStorage();
  const { client, server } = makeClient(["offline"], storage);
  await expect(client.setStatus("READ", "b1")).rejects.toMatchObject({ kind: "queued" });
  expect(client.sync.snapshot.pendingCount).toBe(1);

  // Второе изменение не обгоняет первое: пока очередь не пуста, оно тоже встаёт в очередь.
  server.calls.length = 0;
  const responses: ("offline" | Response)[] = ["offline"];
  (client as unknown as { fetchImpl: unknown }).fetchImpl = stubServer(responses).fetchImpl;
  await expect(client.setProgress(10, null, "b1")).rejects.toMatchObject({ kind: "queued" });
  expect(client.offline!.pending.map((p) => p.path)).toEqual(["shelf/b1", "shelf/b1/progress"]);

  // Очередь переживает перезапуск приложения.
  await client.offline!.flushWrites();
  const restarted = new APIClient("https://example.com", new OfflineStore(storage), stubServer([json({ ok: true }), json({ entry })]).fetchImpl);
  restarted.token = "t0ken";
  await restarted.loadOffline();
  expect(restarted.sync.snapshot.pendingCount).toBe(2);
  await restarted.flushOutbox();
  expect(restarted.offline!.pending).toHaveLength(0);
  expect(restarted.sync.snapshot.pendingCount).toBe(0);
});

test("a change the server rejects is dropped and reported; transient errors keep it queued", async () => {
  const storage = new MemoryStorage();
  const store = new OfflineStore(storage);
  store.enqueue("PUT", "shelf/gone", JSON.stringify({ status: "READ" }));
  store.enqueue("PUT", "shelf/b2", JSON.stringify({ status: "READ" }));
  const server = stubServer([json({ error: "Сервер занят" }, 503)]);
  const client = new APIClient("https://example.com", store, server.fetchImpl);
  client.token = "t";
  await client.flushOutbox();
  expect(store.pending).toHaveLength(2);

  (client as unknown as { fetchImpl: unknown }).fetchImpl = stubServer([json({ error: "Книга не найдена" }, 404), json({ entry })]).fetchImpl;
  await client.flushOutbox();
  expect(store.pending).toHaveLength(0);
  expect(client.sync.snapshot.lastRejected).toBe("Книга не найдена");
});

test("progress reset sends an explicit null and goal removal sends null target", async () => {
  const { client, server } = makeClient([json({ entry }), json({ year: 2026, goal: null, readCount: 0, byMonth: [], avgRating: null, readingNow: 0, years: [] })]);
  await client.setProgress(null, null, "b1");
  await client.setGoal(2026, null);
  expect(server.calls[0].body).toEqual({ currentPage: null });
  expect(server.calls[1].body).toEqual({ year: 2026, target: null });
});

test("logout clears cached responses and the outbox", async () => {
  const storage = new MemoryStorage();
  const { client } = makeClient([json({ counts: {}, items: [] })], storage);
  await client.shelf();
  client.offline!.enqueue("DELETE", "shelf/b1", null);
  await client.offline!.flushWrites();
  expect(storage.map.size).toBeGreaterThan(0);
  await client.offline!.clear();
  expect(storage.map.size).toBe(0);
  expect(client.offline!.pending).toHaveLength(0);
});

test("APIError has readable messages", () => {
  expect(new APIError("offline").message).toBe("Нет подключения к интернету.");
});
