---
name: verify-polka
description: Launch, check, drive, prove, and bug bash «Полка», the Expo / React Native reading-tracker app in mobile/, with e2e — in Chromium through its react-native-web build (runs anywhere), or on an iOS simulator / Android emulator (macOS CI). Use before claiming a change to the mobile app (or an API endpoint it calls) works, when asked to verify, screenshot, or QA a screen, or to add an e2e test.
---

# Verify «Полка» (mobile app)

Read the e2e skill first: `cd mobile && npx e2e guide` (topics: `npx e2e guide writing-tests`, `running`,
`mcp`, `debugging`, `bug-bash`). This skill only says what is true of this app. Everything below runs
in `mobile/`. Configs: `e2e.config.ts` (target `web`, tests `e2e/tests/web/**/*.e2e.ts`) and
`e2e.native.config.ts` (targets `ios`, `android`, tests `e2e/tests/native/**/*.e2e.ts`).

## Launch

The product is a phone app; this container has no simulator, so verification here runs the same code
in Chromium through react-native-web, on a 390×844 viewport with the `ru-RU` locale (source strings are
Russian, `L()`).

Before a run: Postgres and Redis up (`docker compose -p bookshelf -f docker-compose.dev.yml up -d` in the
repo root; start dockerd first if needed), schema and seed catalog (`npx prisma db push && npm run db:seed`
in the root), an API build (`npm run build` in the root; rebuild after changing server code), and
`npm ci` in `mobile/`.

The `web` target's `app.command` runs `node e2e/serve-web.mjs 8091`, which:

1. uses the API at `E2E_API_URL` (default `http://127.0.0.1:3100`) or starts `next start` there from the
   root build (Next.js reads the root `.env`), and stops it on exit;
2. logs in as the `reader` account or registers it (first run against a database);
3. builds `dist-web/` with `expo export --platform web --dev` (about 30 s cold, a few seconds with the Metro
   cache; `E2E_SKIP_EXPORT=1` reuses it — never when you changed app code);
4. serves the bundle on `http://127.0.0.1:8091` and proxies `/api/*` to the API (one origin, no CORS).

The runner waits for `http://127.0.0.1:8091/api/v1/genres` and stops everything after the run. Ports are
fixed (8091, 3100): another server on 8091 stops a run with `APP_ALREADY_RUNNING`. Port 3000 / 8081 may
be someone's dev server; do not use them for the web target.

Browsers: CI runs `npx @e2e-dev/web install chromium --with-deps`. In a container where that download is
blocked but an older Playwright Chromium exists (`/opt/pw-browsers`), point `PLAYWRIGHT_BROWSERS_PATH`
at a directory whose `chromium-<rev>` and `chromium_headless_shell-<rev>` entries (the revision the
installed `playwright-core` wants, shown in the `BROWSER_INSTALL_FAILED` message) symlink to the existing ones.

Native: `e2e.native.config.ts` starts `node e2e/serve-native.mjs 8081` (API on `:3000`, which a Debug build
calls, plus Metro). It needs a Debug build installed on a booted simulator / emulator; the `e2e` workflow
(`.github/workflows/e2e.yml`, jobs `ios` and `android`) has the exact build, boot, install and
`adb reverse` steps. Not runnable in a Linux container.

## Doctor

```bash
cd mobile
npx e2e list                                   # loads the config, starts nothing; 7 tests on [web]
npx e2e run e2e/tests/web/smoke.e2e.ts         # starts API + web build, pins the sign-in form; exit 0
npx e2e run e2e/tests/web/book-status.e2e.ts   # signed-in doctor: runs the `reader` setup, then a signed-in screen
npx e2e list --config e2e.native.config.ts     # native config loads (4 pairs); running it needs a Mac / KVM
```

`list` failing is the config or a dependency (`npm ci`). `APP_UNREACHABLE`: read `.e2e/logs/app.log` —
usually no API build, Postgres down, or `expo export` failing. `seed book «…» (run npm run db:seed)` in a
failure means the catalog is empty. Running `e2e/tests/web/auth.setup.e2e.ts` alone exits `NO_TESTS`.

## Drive

Scripted (preferred for proof): a test under `e2e/tests/web/`. Use test ids — the app has `testID`s on
the controls that matter and react-native-web renders them as `data-testid`, so `screen.getByTestId()`
works on web and on devices. Main ids: `signInEmail`, `signInPassword`, `signInSubmit`; tabs `tab-shelf`,
`tab-search`, `tab-feed`, `tab-stats`, `tab-profile`; shelf `shelf`, `shelf-status-<STATUS>`,
`shelf-item-<bookId>`, `shelf-bookcase`; search `search-field`, `search-results`, `search-discover`; book
card `book-detail`, `book-status`, `status-<STATUS>`, `book-menu`, `edit-review`. Add a `testID` to a
control you need rather than a CSS locator. Where text repeats (a book cover placeholder repeats the
title), scope or use a unique string (`'Лев Толстой · 1869'`).

- Signed-in web tests declare `{ session: 'reader' }` (saved by `e2e/tests/web/auth.setup.e2e.ts`) and open
  the screen by route: `app.open('/search')`, `app.open('/book/<id>')`. Routes: `src/lib/routes.ts`.
- Data through the API as the reader: `readerTest` in `e2e/tests/web/support.ts` (`readerApi.findBook(title)`,
  `readerApi.removeFromShelf(id)`) — the token comes from the session's `localStorage.apiToken`.
- Credentials: only `reader` (`credentials.user('reader')`; defaults in `e2e/reader.ts`, override with
  `E2E_USER_READER_USERNAME` / `E2E_USER_READER_PASSWORD`). Never print the password.
- `agent.*` steps run on Claude Code (`claudeCode({ model: 'sonnet' })` from `@e2e-dev/acp`) with its own login
  (`claude` signed in, or `CLAUDE_CODE_OAUTH_TOKEN` / `ANTHROPIC_API_KEY`). `agent.act` recordings in
  `.e2e/cache/` are committed and replay with no agent; a new or reworded goal records live and its cache
  file must be committed with the test. `agent.assert` calls the agent every run; the test that uses it skips
  in CI without a login.
- Native tests import `test` from `@e2e-dev/mobile`, start signed out through `signedOutTest`
  (`e2e/tests/native/support.ts`: keychain reset on iOS + `app.clearState()`), and have no sessions.

Live: no e2e MCP server is registered in this repo. To add one for a session:
`claude mcp add e2e -- sh -c 'cd mobile && exec npx e2e mcp'`, then `open_session`, `observe`, `locate`
before writing a locator (`npx e2e guide mcp`).

## Evidence

Every run writes `mobile/.e2e/report.json`; a failed test gets `.e2e/results/<test>/trace.md` (screen at
failure, steps, app logs); `--trace on` keeps traces for passing tests, `--video` records attempts,
`app.screenshot('<name>')` saves a frame. The next run clears `.e2e/results/` (Doctor included), so a proof
that must survive runs with `--output .e2e/proof/<name>`. Server log: `.e2e/logs/app.log`.

Proof standards: drive the real path (tap the tab, fill the field, tap the button), not internal setters;
capture the action and the state after it; check the side effect in the store — shelf entries, reviews,
quotes live in Postgres (read them back through the API as the reader, e.g. `GET /api/v1/shelf`, or
`npx prisma studio` in the root); the token in `localStorage.apiToken` on web. Mock nothing: the only
external system, Open Library search, fails fast offline and the app shows the local catalog.

## Bug bash

`e2e explore` runs only the built-in agent, which needs an AI SDK model; the Claude Code executor does not
serve it. To bash: write an untracked `e2e.bugbash.config.ts` that spreads `e2e.config.ts`, adds
`e2e/tests/bugbash/**/*.e2e.ts` to the tests, and sets `agents` with a `model` (e.g. `anthropic('…')`
from `@ai-sdk/anthropic` with `ANTHROPIC_API_KEY`) and `skeptic` / `fuzzer` personas; its `context`: the
catalog is seeded, Open Library is unreachable offline (no remote results is not a bug), email is only
logged, push and camera do not work on web. Charters come from [features/](features/) (one per feature,
`slug|target|agent|charter` lines). `.e2e/bugbash/` is already ignored (`/.e2e/*` in `mobile/.gitignore`).
One explorer at a time (one database, fixed ports). A finding is a bug only once
`e2e/tests/bugbash/<slug>.e2e.ts` fails on it (`npx e2e guide bug-bash`, step 6).

## Cleanup

The runner stops the server, the API it started, and the browser. A `next start` or dev server you started
yourself is yours to stop by its pid, never `pkill node` (other agents' servers share the machine).
`docker compose … down` only if you started the stack. Tests leave the `reader` account and its shelf
entries (the next run resets what it uses). Keep `.e2e/report.json`, `.e2e/results/`, `.e2e/proof/` — the
evidence, all gitignored; only `.e2e/cache/` is committed.

## Helpers

`e2e/serve-web.mjs` (web target command), `e2e/serve-native.mjs` (native command), `e2e/api-server.mjs`
(API start + reader account) — all started by the configs, never by hand. `npm run test:e2e` = `e2e run`;
`npm run test:e2e:native -- --target ios` on a Mac with a booted simulator.
