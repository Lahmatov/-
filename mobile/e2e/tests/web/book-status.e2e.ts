// The core flow of the app: put a book on the shelf from its card. Web only (uses the saved session and the API).
import { describe } from '@e2e-dev/web';
import { expect } from 'e2e';
import { readerTest } from './support';

const TITLE = 'Анна Каренина';

describe('book status', { session: 'reader' }, () => {
  readerTest('marks a book as want-to-read from its card', async ({ app, screen, readerApi }) => {
    const book = await readerApi.findBook(TITLE);
    await readerApi.removeFromShelf(book.id);
    await app.open(`/book/${book.id}`);
    await screen.getByTestId('status-WANT').waitFor();

    await screen.getByTestId('status-WANT').tap();

    await expect(screen.getByTestId('book-status')).toContainText('Хочу прочитать');
    await expect(screen.getByTestId('status-READING')).toBeVisible();
    await expect(screen.getByTestId('status-WANT')).toBeHidden();
  });
});
