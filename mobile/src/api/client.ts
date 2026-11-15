import { AppLanguage, L } from "../i18n";
import type * as M from "./models";
import { OfflineStore, SyncStatus } from "./offline";

export type APIErrorKind = "unauthorized" | "server" | "invalidResponse" | "offline" | "queued";

export class APIError extends Error {
  constructor(
    readonly kind: APIErrorKind,
    message?: string,
    /** HTTP-код для kind = "server". */
    readonly status?: number,
  ) {
    super(message ?? APIError.describe(kind));
    this.name = "APIError";
  }

  static describe(kind: APIErrorKind): string {
    switch (kind) {
      case "unauthorized":
        return L("Сессия истекла — войдите снова.");
      case "invalidResponse":
        return L("Сервер вернул непонятный ответ.");
      case "offline":
        return L("Нет подключения к интернету.");
      case "queued":
        return L("Нет сети — изменение сохранено на телефоне и отправится, когда появится интернет.");
      case "server":
        return L("Ошибка сервера");
    }
  }
}

export function isQueued(error: unknown): boolean {
  return error instanceof APIError && error.kind === "queued";
}

/** Текст ошибки для алерта. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

type Query = Record<string, string | number | null | undefined>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type AuthResponse = { token: string; user: M.User };
type OK = { ok?: boolean };

/**
 * Клиент JSON API сервера (/api/v1). Токен передаётся в заголовке Authorization.
 * GET без сети отдаёт последнюю сохранённую копию ответа; изменения, которые можно сделать без сети
 * (полка, прогресс, цитаты), встают в очередь и уходят на сервер, когда связь вернётся.
 */
export class APIClient {
  token: string | null = null;
  /** Вызывается, когда сервер ответил 401 на запрос с токеном (токен отозван или аккаунт удалён). */
  onUnauthorized: (() => void) | null = null;
  readonly sync = new SyncStatus();
  private isFlushing = false;

  constructor(
    readonly baseURL: string,
    readonly offline: OfflineStore | null = null,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init),
    private readonly timeoutMs = 20000,
  ) {
    this.sync.update({ pendingCount: offline?.pending.length ?? 0 });
  }

  /** Загружает очередь изменений с диска (вызывается при старте приложения). */
  async loadOffline(): Promise<void> {
    await this.offline?.load();
    this.sync.update({ pendingCount: this.offline?.pending.length ?? 0 });
  }

  // Авторизация

  register(name: string, email: string, password: string) {
    return this.send<AuthResponse>("POST", "auth/register", { json: { name, email, password } });
  }
  login(email: string, password: string) {
    return this.send<AuthResponse>("POST", "auth/login", { json: { email, password } });
  }
  signInWithGoogle(idToken: string) {
    return this.send<AuthResponse>("POST", "auth/google", { json: { idToken } });
  }
  signInWithApple(identityToken: string, name: string | null) {
    return this.send<AuthResponse>("POST", "auth/apple", { json: { identityToken, name } });
  }
  async logout(): Promise<void> {
    await this.send<OK>("POST", "auth/logout");
  }
  async me(): Promise<M.User> {
    return (await this.send<{ user: M.User }>("GET", "me")).user;
  }
  async deleteAccount(): Promise<void> {
    await this.send<OK>("DELETE", "me");
  }
  async updateName(name: string): Promise<M.User> {
    return (await this.send<{ user: M.User }>("PATCH", "me", { json: { name } })).user;
  }
  async forgotPassword(email: string): Promise<void> {
    await this.send<OK>("POST", "auth/forgot-password", { json: { email } });
  }
  async resendVerification(): Promise<void> {
    await this.send<OK>("POST", "auth/resend-verification");
  }

  // Каталог

  search(query: string) {
    return this.send<M.SearchResults>("GET", "search", { query: { q: query } });
  }
  book(id: string) {
    return this.send<M.BookDetails>("GET", `books/${seg(id)}`);
  }
  async bookByISBN(isbn: string): Promise<M.Book> {
    return (await this.send<{ book: M.Book }>("GET", `books/isbn/${seg(isbn)}`)).book;
  }
  addBook(title: string, author: string, year: number | null) {
    return this.send<{ book: M.Book; existing: boolean }>("POST", "books", { json: { title, author, year } });
  }
  async addFromOpenLibrary(hit: M.OpenLibraryHit): Promise<M.Book> {
    return (await this.send<{ book: M.Book }>("POST", "books/openlibrary", { json: hit })).book;
  }

  // Полка

  shelf(status?: M.ReadingStatus | null) {
    return this.send<M.Shelf>("GET", "shelf", { query: { status } });
  }
  async setStatus(status: M.ReadingStatus, bookId: string): Promise<M.ShelfEntry> {
    return (await this.sendQueueable<{ entry: M.ShelfEntry }>("PUT", `shelf/${seg(bookId)}`, { status })).entry;
  }
  async saveReview(update: M.ReviewUpdate, bookId: string): Promise<M.ShelfEntry> {
    return (await this.sendQueueable<{ entry: M.ShelfEntry }>("PATCH", `shelf/${seg(bookId)}`, update)).entry;
  }
  async removeFromShelf(bookId: string): Promise<void> {
    await this.sendQueueable<OK>("DELETE", `shelf/${seg(bookId)}`);
  }
  /** currentPage = null сбрасывает прогресс; totalPages — число страниц в издании читателя. */
  async setProgress(currentPage: number | null, totalPages: number | null, bookId: string): Promise<M.ShelfEntry> {
    const body: Record<string, number | null> = { currentPage };
    if (totalPages != null) body.totalPages = totalPages;
    return (await this.sendQueueable<{ entry: M.ShelfEntry }>("PUT", `shelf/${seg(bookId)}/progress`, body)).entry;
  }

  // Обзор

  author(name: string) {
    return this.send<M.AuthorDetails>("GET", `authors/${seg(name)}`);
  }
  async genres(): Promise<M.Genre[]> {
    return (await this.send<{ genres: M.Genre[] }>("GET", "genres")).genres;
  }
  genre(slug: string) {
    return this.send<M.GenreBooks>("GET", `genres/${seg(slug)}`);
  }
  async addGenre(slug: string, bookId: string): Promise<M.GenreRef[]> {
    return (await this.send<{ genres: M.GenreRef[] }>("POST", `books/${seg(bookId)}/genres`, { json: { slug } })).genres;
  }
  top(genre?: string | null) {
    return this.send<M.TopBooks>("GET", "top", { query: { genre } });
  }
  async recommendations(): Promise<M.Recommendation[]> {
    return (await this.send<{ items: M.Recommendation[] }>("GET", "recommendations")).items;
  }

  // Лайки, комментарии, уведомления

  setLiked(liked: boolean, entryId: string) {
    return this.send<M.LikeState>(liked ? "POST" : "DELETE", `reviews/${seg(entryId)}/like`);
  }
  comments(entryId: string) {
    return this.send<M.CommentThread>("GET", `reviews/${seg(entryId)}/comments`);
  }
  async addComment(text: string, entryId: string): Promise<M.Comment> {
    return (await this.send<{ comment: M.Comment }>("POST", `reviews/${seg(entryId)}/comments`, { json: { text } }))
      .comment;
  }
  async deleteComment(id: string): Promise<void> {
    await this.send<OK>("DELETE", `comments/${seg(id)}`);
  }
  notifications() {
    return this.send<M.NotificationList>("GET", "notifications");
  }
  async markNotificationsRead(): Promise<void> {
    await this.send<OK>("POST", "notifications/read");
  }
  async registerDevice(token: string): Promise<void> {
    await this.send<OK>("POST", "devices", { json: { token } });
  }
  async unregisterDevice(token: string): Promise<void> {
    await this.send<OK>("DELETE", `devices/${seg(token)}`);
  }
  async report(reason: M.ReportReason, target: { entryId?: string; commentId?: string }): Promise<void> {
    await this.send<OK>("POST", "reports", {
      json: { entryId: target.entryId ?? null, commentId: target.commentId ?? null, reason },
    });
  }

  // Челленджи

  challenges() {
    return this.send<M.ChallengeList>("GET", "challenges");
  }
  async challenge(id: string): Promise<M.ChallengeDetails> {
    return (await this.send<{ challenge: M.ChallengeDetails }>("GET", `challenges/${seg(id)}`)).challenge;
  }
  /** Возвращает id нового челленджа. */
  async createChallenge(draft: M.ChallengeDraft): Promise<string> {
    return (await this.send<{ challenge: { id: string } }>("POST", "challenges", { json: draft })).challenge.id;
  }
  async joinChallenge(id: string): Promise<void> {
    await this.send<OK>("PUT", `challenges/${seg(id)}/membership`);
  }
  /** Закрытый челлендж по коду; возвращает его id. */
  async joinChallengeByCode(code: string): Promise<string> {
    return (await this.send<{ challenge: { id: string } }>("POST", "challenges/join", { json: { code } })).challenge.id;
  }
  async leaveChallenge(id: string): Promise<void> {
    await this.send<OK>("DELETE", `challenges/${seg(id)}/membership`);
  }
  async deleteChallenge(id: string): Promise<void> {
    await this.send<OK>("DELETE", `challenges/${seg(id)}`);
  }
  async badges(): Promise<M.Badge[]> {
    return (await this.send<{ badges: M.Badge[] }>("GET", "badges")).badges;
  }

  // Клубы

  async clubs(): Promise<M.ClubSummary[]> {
    return (await this.send<{ clubs: M.ClubSummary[] }>("GET", "clubs")).clubs;
  }
  /** Возвращает id нового клуба. */
  async createClub(draft: M.ClubDraft): Promise<string> {
    return (await this.send<{ club: { id: string } }>("POST", "clubs", { json: draft })).club.id;
  }
  /** Вступить по коду приглашения; возвращает id клуба. */
  async joinClub(code: string): Promise<string> {
    return (await this.send<{ club: { id: string } }>("POST", "clubs/join", { json: { code } })).club.id;
  }
  async club(id: string): Promise<M.ClubDetails> {
    return (await this.send<{ club: M.ClubDetails }>("GET", `clubs/${seg(id)}`)).club;
  }
  async leaveClub(id: string): Promise<void> {
    await this.send<OK>("DELETE", `clubs/${seg(id)}/membership`);
  }
  async deleteClub(id: string): Promise<void> {
    await this.send<OK>("DELETE", `clubs/${seg(id)}`);
  }
  async setClubChapter(chapter: number, clubId: string): Promise<number> {
    return (await this.send<{ chapter: number }>("PUT", `clubs/${seg(clubId)}/progress`, { json: { chapter } })).chapter;
  }
  async clubPosts(clubId: string): Promise<M.ClubPost[]> {
    return (await this.send<{ posts: M.ClubPost[] }>("GET", `clubs/${seg(clubId)}/posts`)).posts;
  }
  async addClubPost(text: string, chapter: number | null, clubId: string): Promise<M.ClubPost> {
    return (await this.send<{ post: M.ClubPost }>("POST", `clubs/${seg(clubId)}/posts`, { json: { text, chapter } })).post;
  }
  async deleteClubPost(id: string): Promise<void> {
    await this.send<OK>("DELETE", `club-posts/${seg(id)}`);
  }

  // Цитаты

  quotes(bookId: string) {
    return this.send<M.BookQuotes>("GET", `books/${seg(bookId)}/quotes`);
  }
  async addQuote(draft: M.QuoteDraft, bookId: string): Promise<M.Quote> {
    return (await this.sendQueueable<{ quote: M.Quote }>("POST", `books/${seg(bookId)}/quotes`, draft)).quote;
  }
  async updateQuote(id: string, draft: M.QuoteDraft): Promise<M.Quote> {
    return (await this.sendQueueable<{ quote: M.Quote }>("PATCH", `quotes/${seg(id)}`, draft)).quote;
  }
  async deleteQuote(id: string): Promise<void> {
    await this.sendQueueable<OK>("DELETE", `quotes/${seg(id)}`);
  }
  myQuotes(cursor?: string | null) {
    return this.send<M.QuotePage>("GET", "quotes", { query: { cursor } });
  }

  // Люди и лента

  feed(cursor?: string | null) {
    return this.send<M.Feed>("GET", "feed", { query: { cursor } });
  }
  async searchUsers(query: string): Promise<M.PublicUser[]> {
    return (await this.send<{ users: M.PublicUser[] }>("GET", "users", { query: { q: query } })).users;
  }
  profile(userId: string) {
    return this.send<M.UserProfile>("GET", `users/${seg(userId)}`);
  }
  async setFollowing(follow: boolean, userId: string): Promise<boolean> {
    return (await this.send<{ isFollowing: boolean }>(follow ? "POST" : "DELETE", `users/${seg(userId)}/follow`))
      .isFollowing;
  }
  async following(): Promise<M.PublicUser[]> {
    return (await this.send<{ users: M.PublicUser[] }>("GET", "me/following")).users;
  }

  // Списки

  /** С bookId у каждого списка заполнено containsBook. */
  async myLists(bookId?: string | null): Promise<M.MyList[]> {
    return (await this.send<{ lists: M.MyList[] }>("GET", "lists", { query: { bookId } })).lists;
  }
  async createList(input: M.ListInput): Promise<M.ListSummary> {
    return (await this.send<{ list: M.ListSummary }>("POST", "lists", { json: input })).list;
  }
  list(id: string) {
    return this.send<M.ListDetails>("GET", `lists/${seg(id)}`);
  }
  async updateList(id: string, input: M.ListInput): Promise<M.ListSummary> {
    return (await this.send<{ list: M.ListSummary }>("PATCH", `lists/${seg(id)}`, { json: input })).list;
  }
  async deleteList(id: string): Promise<void> {
    await this.send<OK>("DELETE", `lists/${seg(id)}`);
  }
  async setBookInList(bookId: string, listId: string, included: boolean): Promise<void> {
    if (included) await this.send<OK>("POST", `lists/${seg(listId)}/items`, { json: { bookId } });
    else await this.send<OK>("DELETE", `lists/${seg(listId)}/items/${seg(bookId)}`);
  }

  // Итоги

  stats(year?: number | null) {
    return this.send<M.YearStats>("GET", "stats", { query: { year } });
  }
  /** target = null убирает цель. */
  setGoal(year: number, target: number | null) {
    return this.send<M.YearStats>("PUT", "goal", { json: { year, target } });
  }
  wrapped(year: number) {
    return this.send<M.Wrapped>("GET", "wrapped", { query: { year } });
  }

  // Экспорт и импорт

  /** Своя полка в CSV (формат совместим с импортом). */
  async exportCSV(): Promise<string> {
    const response = await this.fetchRaw(this.makeRequest("GET", "export"));
    return response.text();
  }

  /** Файл выделений Kindle (My Clippings.txt) или CSV Goodreads/«Полки». */
  async importFile(file: { uri: string; name: string; mimeType?: string | null }, kind: M.ImportKind): Promise<M.ImportResult> {
    const form = new FormData();
    form.append("kind", kind);
    // React Native отправляет файл по uri; в тестах можно передать Blob через uri-объект.
    form.append("file", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/octet-stream" } as unknown as Blob);
    const request = this.makeRequest("POST", "import");
    request.init.body = form;
    return this.perform<M.ImportResult>(request);
  }

  // Транспорт

  private makeRequest(method: string, path: string, query: Query = {}): { url: string; init: RequestInit & { headers: Record<string, string> } } {
    const base = this.baseURL.replace(/\/+$/, "");
    const params = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    const url = `${base}/api/v1/${path}${params ? `?${params}` : ""}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      // Жанры, причины рекомендаций и тексты уведомлений сервер отдаёт на языке интерфейса.
      "Accept-Language": AppLanguage.code,
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    return { url, init: { method, headers } };
  }

  private send<T>(method: string, path: string, options: { query?: Query; json?: unknown } = {}): Promise<T> {
    const request = this.makeRequest(method, path, options.query);
    if (options.json !== undefined) {
      request.init.headers["Content-Type"] = "application/json";
      request.init.body = JSON.stringify(options.json);
    }
    return this.perform<T>(request);
  }

  /**
   * Изменение, которое можно сделать без сети: при обрыве связи оно встаёт в очередь (APIError "queued")
   * и уйдёт на сервер, когда связь вернётся. Порядок изменений сохраняется.
   */
  private async sendQueueable<T>(method: string, path: string, json?: unknown): Promise<T> {
    const body = json === undefined ? null : JSON.stringify(json);
    const request = this.makeRequest(method, path);
    if (body !== null) {
      request.init.headers["Content-Type"] = "application/json";
      request.init.body = body;
    }
    const offline = this.offline;
    if (!offline) return this.perform<T>(request);
    // Сначала отправляем то, что накопилось, иначе новое изменение обгонит старые.
    if (offline.pending.length > 0) await this.flushOutbox();
    if (offline.pending.length > 0) {
      this.enqueue(method, path, body);
      throw new APIError("queued");
    }
    try {
      return await this.perform<T>(request);
    } catch (error) {
      if (error instanceof APIError && error.kind === "offline") {
        this.enqueue(method, path, body);
        throw new APIError("queued");
      }
      throw error;
    }
  }

  private enqueue(method: string, path: string, body: string | null) {
    if (!this.offline) return;
    this.offline.enqueue(method, path, body);
    this.sync.update({ pendingCount: this.offline.pending.length });
  }

  /** Отправляет очередь изменений по порядку. Вызывается при появлении сети и при возврате в приложение. */
  async flushOutbox(): Promise<void> {
    const offline = this.offline;
    if (!offline || this.isFlushing || !this.token || offline.pending.length === 0) return;
    this.isFlushing = true;
    try {
      for (const item of [...offline.pending]) {
        const request = this.makeRequest(item.method, item.path);
        if (item.body !== null) {
          request.init.headers["Content-Type"] = "application/json";
          request.init.body = item.body;
        }
        try {
          await this.fetchRaw(request);
          offline.remove(item.id);
          this.sync.update({ isOffline: false });
        } catch (error) {
          if (error instanceof APIError && error.kind === "offline") {
            this.sync.update({ isOffline: true });
            return;
          }
          if (error instanceof APIError && error.kind === "unauthorized") return;
          // Временный сбой сервера (5xx, 429): изменение остаётся в очереди, повторим позже.
          if (error instanceof APIError && error.status !== undefined && (error.status >= 500 || error.status === 429)) return;
          // Сервер отклонил изменение (например, книгу удалили) — повтор не поможет.
          offline.remove(item.id);
          this.sync.update({ lastRejected: errorMessage(error) });
        }
      }
    } finally {
      this.isFlushing = false;
      this.sync.update({ pendingCount: offline.pending.length });
    }
  }

  /** Сохраняет значение как офлайн-копию ответа GET (например, после изменения, поставленного в очередь). */
  async updateCachedResponse(value: unknown, path: string, query: Query = {}): Promise<void> {
    if (!this.offline) return;
    await this.offline.saveResponse(JSON.stringify(value), this.cacheKey(this.makeRequest("GET", path, query)));
  }

  private cacheKey(request: { url: string; init: { headers: Record<string, string> } }): string {
    return `${request.url}|${request.init.headers["Accept-Language"] ?? ""}`;
  }

  /** GET без сети отдаёт последнюю сохранённую копию ответа; остальные запросы — APIError "offline". */
  private async perform<T>(request: { url: string; init: RequestInit & { headers: Record<string, string> } }): Promise<T> {
    const isGet = request.init.method === "GET";
    let text: string;
    try {
      text = await (await this.fetchRaw(request)).text();
    } catch (error) {
      if (error instanceof APIError && error.kind === "offline") {
        this.sync.update({ isOffline: true });
        if (isGet && this.offline) {
          const cached = await this.offline.response(this.cacheKey(request));
          if (cached !== null) return decode<T>(cached);
        }
      }
      throw error;
    }
    this.sync.update({ isOffline: false });
    const value = decode<T>(text);
    if (isGet && this.offline) await this.offline.saveResponse(text, this.cacheKey(request));
    if (this.offline && this.offline.pending.length > 0 && !this.isFlushing) void this.flushOutbox();
    return value;
  }

  /** Запрос без кэша: успешный ответ или ошибка (сетевая — APIError "offline"). */
  private async fetchRaw(request: { url: string; init: RequestInit & { headers: Record<string, string> } }): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(request.url, { ...request.init, signal: controller.signal });
    } catch {
      throw new APIError("offline");
    } finally {
      clearTimeout(timer);
    }
    if (response.ok) return response;

    let message: string | undefined;
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // тело не JSON
    }
    if (response.status === 401 && request.init.headers.Authorization) {
      this.onUnauthorized?.();
      throw new APIError("unauthorized");
    }
    throw new APIError("server", message ?? L("Ошибка сервера (%@)", String(response.status)), response.status);
  }
}

function decode<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new APIError("invalidResponse");
  }
}

/** Кодирует текст как один сегмент пути: «/» и «?» в имени автора не должны менять маршрут. */
export function seg(value: string): string {
  return encodeURIComponent(value);
}
