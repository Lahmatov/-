# Search

The «Поиск» tab: discover sections when empty; typing 2+ characters searches the local catalog and Open Library.

## Sub-features

- `search-field` («Название или автор»), debounced 350 ms; clear button «Очистить».
- Results `search-results`: «В каталоге» (local books, open the card) and «Open Library» (tap adds the book
  to the catalog and opens it); «Добавить книгу вручную».
- Barcode scan button `scan-barcode` (device camera only).
- Empty query: `search-discover` (recommendations, top, genres).

## How to get to it (user POV)

Signed in, tab «Поиск» (`tab-search`), or `/search`.

## Driving it with e2e

`web/search.e2e.ts`: `agent.act('search for the book {title}')` then `search-results` contains the title and
author; arrange-by-typing then `agent.act('open the book {title} from the search results')` and `book-detail`
contains the author, URL `/book/<id>`. Both goals replay from `.e2e/cache`. Locators:
`getByTestId('search-field')`, `getByTestId('search-results').getByText('Лев Толстой · 1869')`.

## Proof

Results list the seeded book under «В каталоге»; tapping it opens `/book/<id>` with the same title and author.

## Charters

```
search-queries|web|fuzzer|Starting at /search signed in as the reader, search by title, by author, by a misspelled title, by ISBN, and with one character; report results that are missing, wrong, duplicated, or confusing
```

Signed in: run with `--session reader`.

## Gotchas

- Offline (this container), Open Library is unreachable: no «Open Library» section is expected, not a bug.
- A query under 2 characters shows nothing by design.
- The cover placeholder repeats the title, so `getByText(title)` matches twice in a row.
