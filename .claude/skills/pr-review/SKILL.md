---
name: pr-review
description: Correctness review of a pull request in this repo (API server and iOS app). Use when reviewing a PR before approving and merging it.
---

# PR review (correctness)

Review the PR diff as someone who did not write it. Read the changed files in full, not just the diff
hunks, and run the checks yourself.

## Steps

1. Fetch the PR (`pull_request_read`: details, files, diff, check runs).
2. Check out the branch locally and run the server checks: `npm ci`, `npx prisma generate`,
   `npx tsc --noEmit`, `npm test` (with `REDIS_URL` set if Redis is available), `npm run build`.
   API changes: start Postgres + Redis (`docker compose -f docker-compose.dev.yml up -d`),
   `npx prisma db push`, `npm start`, and call the changed endpoints with curl.
3. iOS changes: there is no Xcode in the cloud. Read the Swift code, rely on the CI job
   `iOS — сборка и тесты` for the build and tests, and say so. Model/networking tests can also run on
   Linux in the `swift:6.0` Docker image (see `CLAUDE.md`).
4. Walk the checklist below. Every finding needs file, line and a concrete failing scenario.
5. Submit one review with `pull_request_review_write`.

## Blocking checklist

- **Auth, ownership, privacy.** Every endpoint that reads private data or mutates authenticates and
  checks ownership or membership. Private shelf entries, private quotes, quote notes, club content and
  private challenges never reach people who should not see them (profiles, feed, search, exports).
- **Input validation.** zod schemas; malformed input returns 4xx, never 500.
- **Data safety.** Schema changes keep existing data; no destructive change to production data
  without a board decision.
- **Rate limits and secrets.** Login, registration, reset and invite codes are rate-limited; no secrets
  in the repository; no reset/verification links in production logs.
- **Tests.** New behaviour has a test; a bug fix has a regression test.
- **iOS.** Strings localized; offline-capable changes go through the queue; data loading and sheets are
  not attached to a List `Section`/`Group`; UI test fixtures match the real server's JSON format.
- **Scope.** The PR does what its description says and nothing unrelated.

## Verdict

- No blocking findings and checks pass: approve.
- Blocking findings: request changes with a numbered list. Do not merge.
- Never approve a PR whose checks you could not run without saying exactly what was not verified.

GitHub rejects an approval from the PR's own author. If the review account equals the author account,
submit the review as `COMMENT` starting with `LGTM, approved by reviewer agent` (or `CHANGES REQUESTED`)
and state that a formal approval was not possible.

Reviews and comments end with the attribution footer required by the repository instructions.
