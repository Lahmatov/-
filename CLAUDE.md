# Полка (Bookshelf)

Reading tracker «like IMDb for books». The product is the **mobile app for iOS and Android** (`mobile/`, React Native +
Expo, TypeScript). The repository
root is its **API server**: Next.js 15 (App Router) + Prisma + PostgreSQL + Redis, JSON API in
`app/api/v1`. The few web pages serve share links, email links (verify / reset password) and moderation.

## How the team works (mandatory)

The project is run by **Polka Studio**, a company of AI agents modelled on
[paperclip](https://github.com/paperclipai/paperclip). Read `company/COMPANY.md` first.

- **Roles** (`company/agents/<slug>/AGENTS.md`, run via `.claude/agents/<slug>.md`):
  `producer` (CEO), `cto`, `server-engineer`, `ios-engineer`, `release-engineer`, `reviewer`
  (QA + merges), `designer`, `legal-compliance`. The owner is the board.
- **Tasks** live on the Trello board (skill `trello-board`): Backlog → Todo → In Progress → In Review
  → Done, plus Blocked and "👤 Нужно решение владельца" for board decisions.
- **Every run** follows `company/HEARTBEAT.md`; **approvals** follow `company/GOVERNANCE.md`.

Code rules:

1. Nothing goes to `main` directly. Work on a branch, open a PR, link it on the card.
2. Review stage: `reviewer` (separate context, `pr-review` skill, runs the checks).
3. Approval stage: the approver named on the card (`cto` for code by default) comments
   `APPROVED (<slug>)` on the PR; board-reserved changes need the owner's explicit approval.
4. Only after both stages does `reviewer` squash-merge (real head SHA) and move the card to Done.
5. Nobody reviews, approves or merges their own work.

Limitation: all agents share one GitHub account, and GitHub does not allow approving your own PR,
so verdicts are PR comments.

## Commands

- Dev database: `docker compose -f docker-compose.dev.yml up -d` (Postgres + Redis on localhost),
  `cp .env.example .env`, `npx prisma db push`, `npm run db:seed`.
- Server checks: `npx tsc --noEmit && npm test && npm run build`; run the server with `npm start` after
  a build and check changed endpoints with curl (see the API table in `README.md`).
- Mobile: `cd mobile && npm ci && npm run typecheck && npm test && npm run export` (JS bundles for iOS and Android).
  Native builds need Xcode / Android SDK: CI jobs `Mobile — сборка Android` and `Mobile — сборка iOS` run
  `expo prebuild` and compile. Native folders `mobile/ios`, `mobile/android` are generated, never committed.
- Release: Docker image + `docker-compose.yml` (README «Деплой»); TestFlight and Android release workflows
  (`mobile/README.md`, «Выпуск») — need the owner's Apple Developer / Google Play accounts and secrets.

## Conventions

- Talk to the owner and write Trello cards in Russian; code, commits and PRs in English.
- App strings: Russian source via `L()`, English in `mobile/src/i18n/en*.json`.
- Server error messages are Russian; validation lives in `lib/validation.ts`, JSON shapes in `lib/api.ts`.
