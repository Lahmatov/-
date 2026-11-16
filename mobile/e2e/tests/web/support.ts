// Fixtures for the signed-in web tests: talk to the API as the signed-in reader to find seeded books and
// put the reader's shelf into a known state.
import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

type Book = { id: string; title: string };

export type ReaderApi = {
  /** A book of the seed catalog (`npm run db:seed`) by its exact title. */
  findBook(title: string): Promise<Book>;
  /** Removes the book from the reader's shelf (no-op when it is not there). */
  removeFromShelf(bookId: string): Promise<void>;
};

export const readerTest = test.extend<{ readerApi: ReaderApi }>({
  readerApi: async ({ app, browser }, use) => {
    // The restored `reader` session keeps the API token in localStorage (src/auth/storage.web.ts).
    await app.open();
    const token = await browser.evaluate(() => localStorage.getItem('apiToken'));
    expect(token, 'the reader session holds an API token').toBeTruthy();
    const api = (path: string, init: RequestInit = {}) =>
      fetch(`${app.baseUrl}/api/v1/${path}`, { ...init, headers: { authorization: `Bearer ${token}`, accept: 'application/json' } });

    const readerApi: ReaderApi = {
      async findBook(title) {
        const response = await api(`search?q=${encodeURIComponent(title)}`);
        expect(response.status).toBe(200);
        const body = (await response.json()) as { local: Book[] };
        const book = body.local.find((b) => b.title === title);
        expect(book, `seed book «${title}» (run npm run db:seed)`).toBeDefined();
        return book as Book;
      },
      async removeFromShelf(bookId) {
        const response = await api(`shelf/${bookId}`, { method: 'DELETE' });
        expect([200, 204, 404]).toContain(response.status);
      },
    };
    await use(readerApi);
  },
});
