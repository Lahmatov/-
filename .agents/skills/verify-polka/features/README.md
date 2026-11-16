# Feature map

User-facing features of «Полка» (mobile app). Routes are Expo Router paths (`src/app/`, `src/lib/routes.ts`);
on web they are URL paths. Tests live under `mobile/e2e/tests/`.

| Feature | Route | Test | Status |
| --- | --- | --- | --- |
| [Sign-in](sign-in.md) | `/sign-in` | `web/smoke.e2e.ts`, `web/sign-in.e2e.ts`, `web/sign-in-screen.e2e.ts`, `native/smoke.e2e.ts`, `native/sign-in.e2e.ts` | tested |
| [Book card and shelf status](book-status.md) | `/book/<id>`, `/` (Полка tab) | `web/book-status.e2e.ts` | tested |
| [Search](search.md) | `/search` | `web/search.e2e.ts` | tested |
| Feed, follows, comments | `/feed`, `/user/<id>`, `/comments/<entryId>` | — | untested |
| Stats, goal, wrapped | `/stats`, `/wrapped/<year>` | — | untested |
| Profile, lists, quotes, challenges, clubs, bookcase | `/profile`, `/lists`, `/quotes`, `/challenges`, `/clubs`, `/bookcase` | — | untested |
| Reviews | `/review/<bookId>` | — | untested |
| Barcode scan, import | `/scan`, `/import` | — | untested (camera / files: device only) |
