import { L } from "../i18n";

// Типы повторяют JSON сервера (app/api/v1 и lib/api.ts в корне репозитория).
// Даты приходят строками ISO 8601 — разбираются в интерфейсе через api/dates.ts.

export type ReadingStatus = "WANT" | "READING" | "PAUSED" | "READ" | "DROPPED";

export const READING_STATUSES: ReadingStatus[] = ["WANT", "READING", "PAUSED", "READ", "DROPPED"];

export function statusTitle(status: ReadingStatus): string {
  switch (status) {
    case "WANT":
      return L("Хочу прочитать");
    case "READING":
      return L("Читаю");
    case "PAUSED":
      return L("Отложил");
    case "READ":
      return L("Прочитал");
    case "DROPPED":
      return L("Бросил");
  }
}

/** Иконка Ionicons для статуса. */
export function statusIcon(status: ReadingStatus): string {
  switch (status) {
    case "WANT":
      return "bookmark-outline";
    case "READING":
      return "book-outline";
    case "PAUSED":
      return "pause-circle-outline";
    case "READ":
      return "checkmark-circle-outline";
    case "DROPPED":
      return "close-circle-outline";
  }
}

export type StatusAction = { target: ReadingStatus; title: string };

/** Какие кнопки показывать на карточке книги при текущем статусе (null — книги нет на полке). */
export function statusActions(current: ReadingStatus | null | undefined): StatusAction[] {
  switch (current ?? null) {
    case null:
      return [
        { target: "READING", title: L("Начал читать") },
        { target: "WANT", title: L("Хочу прочитать") },
        { target: "READ", title: L("Уже прочитал") },
      ];
    case "WANT":
      return [
        { target: "READING", title: L("Начал читать") },
        { target: "READ", title: L("Уже прочитал") },
      ];
    case "READING":
      return [
        { target: "READ", title: L("Закончил читать") },
        { target: "PAUSED", title: L("Отложить") },
        { target: "DROPPED", title: L("Бросил") },
      ];
    case "PAUSED":
      return [
        { target: "READING", title: L("Продолжить") },
        { target: "READ", title: L("Закончил читать") },
        { target: "DROPPED", title: L("Бросил") },
      ];
    case "READ":
      return [{ target: "READING", title: L("Перечитать") }];
    case "DROPPED":
      return [{ target: "READING", title: L("Начать заново") }];
  }
  return [];
}

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  /** undefined — старый сервер без этого поля. */
  emailVerified?: boolean;
};

export type ReportReason = "SPAM" | "ABUSE" | "SPOILER" | "OTHER";
export const REPORT_REASONS: ReportReason[] = ["SPAM", "ABUSE", "SPOILER", "OTHER"];

export function reportReasonTitle(reason: ReportReason): string {
  switch (reason) {
    case "SPAM":
      return L("Спам или реклама");
    case "ABUSE":
      return L("Оскорбления");
    case "SPOILER":
      return L("Спойлер без предупреждения");
    case "OTHER":
      return L("Другое");
  }
}

export type Book = {
  id: string;
  title: string;
  author: string;
  year: number | null;
  isbn: string | null;
  coverUrl: string | null;
  pageCount: number | null;
};

/** «Автор · 1928». */
export function bookSubtitle(book: { author: string; year: number | null }): string {
  return [book.author, book.year != null ? String(book.year) : null].filter(Boolean).join(" · ");
}

/** «Илья Ильф, Евгений Петров» → два автора (как lib/discover.ts на сервере). */
export function bookAuthors(book: { author: string }): string[] {
  return book.author
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export type ShelfEntry = {
  status: ReadingStatus;
  startedAt: string | null;
  finishedAt: string | null;
  rating: number | null;
  review: string | null;
  isPublic: boolean;
  currentPage: number | null;
  totalPages: number | null;
  updatedAt: string;
};

/** Доля прочитанного 0...1, если известно число страниц. */
export function entryProgress(entry: ShelfEntry, pageCount: number | null | undefined): number | null {
  const total = entry.totalPages ?? pageCount ?? null;
  if (entry.currentPage == null || total == null || total <= 0) return null;
  return Math.min(1, entry.currentPage / total);
}

export type BookStats = { avgRating: number | null; ratingsCount: number; readersCount: number };

export type Review = {
  id: string;
  userId: string;
  userName: string;
  rating: number | null;
  review: string | null;
  updatedAt: string;
  likes?: number;
  likedByMe?: boolean;
  comments?: number;
};

export type BookDetails = {
  book: Book;
  myEntry: ShelfEntry | null;
  stats: BookStats;
  reviews: Review[];
  genres?: GenreRef[];
};

export type OpenLibraryHit = {
  key: string;
  title: string;
  author: string;
  year: number | null;
  isbn: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  subjects?: string[];
};

export type SearchResults = { local: Book[]; openLibrary: OpenLibraryHit[] };

export type ShelfItem = { book: Book; entry: ShelfEntry; genres?: string[] };

export type Shelf = {
  /** Ключи — статусы. */
  counts: Partial<Record<ReadingStatus, number>>;
  items: ShelfItem[];
};

export type ImportResult = { found: number; added: number; quotes?: number };
export type ImportKind = "kindle" | "csv";

/** Что отправляем при сохранении оценки/отзыва. Даты — календарные дни "YYYY-MM-DD". */
export type ReviewUpdate = {
  rating: number | null;
  review: string | null;
  isPublic: boolean;
  startedAt: string | null;
  finishedAt: string | null;
};

export type YearStats = {
  year: number;
  goal: number | null;
  readCount: number;
  /** Январь — индекс 0. */
  byMonth: number[];
  avgRating: number | null;
  readingNow: number;
  years: number[];
};

// Люди и лента

export type PublicUser = { id: string; name: string };

export type FeedItem = {
  id: string;
  type: "STATUS" | "REVIEW";
  status: ReadingStatus | null;
  rating: number | null;
  review: string | null;
  createdAt: string;
  user: PublicUser;
  book: Book;
  entryId: string | null;
  likes?: number;
  likedByMe?: boolean;
  comments?: number;
};

/** Подпись без глаголов прошедшего времени, чтобы не угадывать род. */
export function feedLabel(item: FeedItem): string {
  if (item.type === "REVIEW") return item.review == null ? L("оценка") : L("отзыв");
  switch (item.status) {
    case "WANT":
      return L("хочет прочитать");
    case "READING":
      return L("читает");
    case "PAUSED":
      return L("отложено");
    case "READ":
      return L("прочитано");
    case "DROPPED":
      return L("брошено");
    default:
      return "";
  }
}

export type Feed = { followingCount: number; nextCursor: string | null; items: FeedItem[] };

export type UserProfile = {
  user: PublicUser;
  isMe: boolean;
  isFollowing: boolean;
  counts: { followers: number; following: number; read: number };
  readingNow: Book[];
  recentlyRead: { book: Book; rating: number | null; finishedAt: string | null }[];
  lists: ListSummary[];
};

// Списки

export type ListSummary = { id: string; title: string; description: string | null; isPublic: boolean; count: number };

/** Мой список с первыми обложками; containsBook есть, если список запрашивали для конкретной книги. */
export type MyList = ListSummary & { covers: string[]; containsBook?: boolean };

export type ListDetails = { list: ListSummary; owner: PublicUser; isOwner: boolean; books: Book[] };

export type ListInput = { title: string; description: string | null; isPublic: boolean };

// Обзор

export type GenreRef = { slug: string; name: string };
export type Genre = GenreRef & { count: number };
export type GenreBooks = GenreRef & { books: Book[] };
export type RatedBook = { book: Book; avgRating: number | null; ratingsCount: number };
export type AuthorDetails = {
  name: string;
  avgRating: number | null;
  ratingsCount: number;
  readersCount: number;
  books: RatedBook[];
};
export type TrendingBook = { book: Book; count: number };
export type TopBooks = { top: RatedBook[]; trending: TrendingBook[] };
export type Recommendation = { book: Book; reason: string };

// Лайки, комментарии, уведомления

export type LikeState = { likes: number; likedByMe: boolean };
export type Comment = { id: string; text: string; createdAt: string; user: PublicUser };
export type CommentThread = { reviewAuthorId: string; comments: Comment[] };
export type AppNotification = {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  actor: PublicUser;
  book: Book | null;
  text: string;
};
export type NotificationList = { unread: number; items: AppNotification[] };

// Итоги года

export type Wrapped = {
  year: number;
  name: string;
  booksRead: number;
  pagesRead: number;
  avgRating: number | null;
  topAuthor: { value: string; count: number } | null;
  topGenre: { slug: string; name: string; count: number } | null;
  bestBook: { book: Book; rating: number } | null;
  longestBook: { book: Book; pages: number } | null;
  busiestMonth: number | null;
  byMonth: number[];
};

// Цитаты

export type Quote = {
  id: string;
  text: string;
  page: number | null;
  /** Личная заметка — приходит только автору цитаты. */
  note: string | null;
  isPublic: boolean;
  createdAt: string;
  mine: boolean;
  user: PublicUser;
  /** Есть в списке «Мои цитаты», где цитаты из разных книг. */
  book?: Book | null;
};
export type BookQuotes = { mine: Quote[]; others: Quote[] };
export type QuotePage = { quotes: Quote[]; nextCursor: string | null };
/** Пустые поля отправляем явным null: в PATCH так стирается страница или заметка. */
export type QuoteDraft = { text: string; page: number | null; note: string | null; isPublic: boolean };

// Книжные клубы

export type ClubSummary = {
  id: string;
  name: string;
  description: string | null;
  chapters: number | null;
  book: Book;
  memberCount: number;
  postCount: number;
};
export type ClubMemberInfo = { user: PublicUser; chapter: number; isOwner: boolean };
export type ClubDetails = {
  id: string;
  name: string;
  description: string | null;
  chapters: number | null;
  inviteCode: string;
  book: Book;
  isOwner: boolean;
  myChapter: number;
  members: ClubMemberInfo[];
};

/** Главы для выбора: из настроек клуба, иначе с запасом от того, где все сейчас. */
export function clubChapterRange(club: ClubDetails): { min: number; max: number } {
  if (club.chapters) return { min: 1, max: club.chapters };
  const furthest = club.members.reduce((m, x) => Math.max(m, x.chapter), 0);
  return { min: 1, max: Math.max(30, furthest + 10) };
}

export type ClubPost = {
  id: string;
  /** null — общее сообщение без спойлеров. */
  chapter: number | null;
  /** null, если это спойлер к главе, до которой я ещё не дочитал. */
  text: string | null;
  spoiler: boolean;
  createdAt: string;
  user: PublicUser;
};
export type ClubDraft = { name: string; description: string | null; bookId: string; chapters: number | null };

// Челленджи

export type ChallengePhase = "upcoming" | "active" | "finished";

export type Challenge = {
  id: string;
  title: string;
  description: string | null;
  goal: number;
  startsAt: string;
  endsAt: string;
  genre: GenreRef | null;
  isPublic: boolean;
  isOwner: boolean;
  participantCount: number;
  phase: ChallengePhase;
  /** null — я не участвую. */
  myProgress: number | null;
};

export function challengeFraction(c: { myProgress: number | null; goal: number }): number {
  return Math.min(1, (c.myProgress ?? 0) / Math.max(c.goal, 1));
}

export function challengeCompleted(c: { myProgress: number | null; goal: number }): boolean {
  return (c.myProgress ?? 0) >= c.goal;
}

export type ChallengeList = { mine: Challenge[]; open: Challenge[] };
export type LeaderboardRow = { user: PublicUser; progress: number; completed: boolean };
export type ChallengeDetails = Challenge & {
  isMember: boolean;
  inviteCode: string | null;
  leaderboard: LeaderboardRow[];
};
export type ChallengeDraft = {
  title: string;
  description: string | null;
  goal: number;
  /** "YYYY-MM-DD" */
  startsAt: string;
  endsAt: string;
  genre: string | null;
  isPublic: boolean;
};
export type Badge = { id: string; title: string; goal: number; endsAt: string; progress: number };
