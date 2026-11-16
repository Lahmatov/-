# Book card and shelf status

The core loop: open a book, put it on the shelf with a reading status, see it on the «Полка» tab.

## Sub-features

- Book card `/book/<id>`: header (title, author, year), genres, «Моя полка» section with status buttons
  (`status-READING`, `status-WANT`, `status-READ`, …; which ones show depends on the current status,
  `statusActions` in `src/api/models.ts`), progress editor for READING / PAUSED, review, quotes, readers' reviews.
- Shelf tab `/`: status chips `shelf-status-<STATUS>` with counts, rows `shelf-item-<bookId>`, genre filter,
  bookcase button `shelf-bookcase`.
- Status changes queue offline and flush when the network returns.

## How to get to it (user POV)

Signed in: «Поиск» → a book → its card; or a row on «Полка». Web tests open `/book/<id>` directly with
`{ session: 'reader' }`.

## Driving it with e2e

`web/book-status.e2e.ts`: `readerTest` finds «Анна Каренина» through the API, removes it from the shelf,
opens its card, taps `status-WANT`, and pins `book-status` = «Хочу прочитать». Locators: `getByTestId('book-status')`,
`getByTestId('status-<STATUS>')`, `getByTestId('book-detail')`.

## Proof

On screen: `book-status` shows the new status and the buttons change. In the store: `GET /api/v1/shelf` (as the
reader) lists the book with that status; the shelf chip count for the status goes up by one.

## Charters

```
shelf-status-flow|web|skeptic|Starting at the «Поиск» tab signed in as the reader, put a seeded book through want-to-read, reading with progress, finished, and removed; cross-check the book card, the shelf counts, and the shelf rows after each change
```

Signed in: run with `--session reader`.

## Gotchas

- Statuses are per account; leftover entries from earlier runs are normal (tests reset what they use).
- The genre filter button only appears when shelf books have genres.
