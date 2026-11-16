// Search on the «Поиск» tab, driven by agent.act goals and pinned by exact checks. The goals replay from the
// committed .e2e/cache without calling the agent; a changed goal or a stale replay needs a Claude login.
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('search', { session: 'reader' }, () => {
  test('finds a seed book by its title', async ({ app, agent, screen }) => {
    await app.open('/search');
    await screen.getByTestId('search-field').waitFor();

    await agent.act('search for the book {title}', { params: { title: 'Братья Карамазовы' } });

    await expect(screen.getByTestId('search-results')).toContainText('Братья Карамазовы');
    await expect(screen.getByTestId('search-results')).toContainText('Фёдор Достоевский');
  });

  test('opens a book card from the search results', async ({ app, agent, screen, browser }) => {
    await app.open('/search');
    await screen.getByTestId('search-field').fill('Война и мир');
    await screen.getByTestId('search-results').getByText('Лев Толстой · 1869').waitFor();

    await agent.act('open the book {title} from the search results', { params: { title: 'Война и мир' } });

    await expect(screen.getByTestId('book-detail')).toContainText('Лев Толстой');
    await expect(screen.getByTestId('status-READING')).toBeAttached();
    await expect(browser).toHaveURL(/\/book\/[a-z0-9]+$/);
  });
});
