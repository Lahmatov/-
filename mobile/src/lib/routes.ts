import type { Href } from "expo-router";

// Пути экранов в одном месте: экраны разных разделов ссылаются друг на друга только через эти функции.
// Файлы маршрутов лежат в src/app/(app)/.

const enc = encodeURIComponent;

export const routes = {
  book: (id: string) => `/book/${enc(id)}` as Href,
  review: (bookId: string) => `/review/${enc(bookId)}` as Href,
  addBook: () => "/add-book" as Href,
  scan: () => "/scan" as Href,
  author: (name: string) => `/author/${enc(name)}` as Href,
  genre: (slug: string) => `/genre/${enc(slug)}` as Href,
  top: () => "/top" as Href,
  genres: () => "/genres" as Href,
  user: (id: string) => `/user/${enc(id)}` as Href,
  following: () => "/following" as Href,
  findPeople: () => "/find-people" as Href,
  comments: (entryId: string) => `/comments/${enc(entryId)}` as Href,
  notifications: () => "/notifications" as Href,
  lists: () => "/lists" as Href,
  list: (id: string) => `/list/${enc(id)}` as Href,
  listEdit: (id?: string) => (id ? `/list-edit?id=${enc(id)}` : "/list-edit") as Href,
  addToList: (bookId: string) => `/add-to-list/${enc(bookId)}` as Href,
  quotes: () => "/quotes" as Href,
  quoteEdit: (params: { bookId: string; quoteId?: string }) =>
    (`/quote-edit?bookId=${enc(params.bookId)}` + (params.quoteId ? `&quoteId=${enc(params.quoteId)}` : "")) as Href,
  clubs: () => "/clubs" as Href,
  club: (id: string) => `/club/${enc(id)}` as Href,
  clubNew: (bookId?: string) => (bookId ? `/club-new?bookId=${enc(bookId)}` : "/club-new") as Href,
  challenges: () => "/challenges" as Href,
  challenge: (id: string) => `/challenge/${enc(id)}` as Href,
  challengeNew: () => "/challenge-new" as Href,
  wrapped: (year: number) => `/wrapped/${year}` as Href,
  importBooks: () => "/import" as Href,
  settings: () => "/settings" as Href,
};
