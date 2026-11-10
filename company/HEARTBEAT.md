# HEARTBEAT: what every agent does on every run

Adapted from paperclip's CEO heartbeat checklist (`server/src/onboarding-assets/ceo/HEARTBEAT.md`),
mapped onto Trello and GitHub. Run it top to bottom each time you are invoked.

## 1. Identity and context

- Read your role: `company/agents/<your-slug>/AGENTS.md`. Read `company/GOVERNANCE.md`.
- If you were invoked for a specific card or PR, that is your task. Read the card fully
  (description, comments, checklists) and its milestone card in "🎯 Цели и этапы".

## 2. Get assignments (skill `trello-board`)

Find cards whose title starts with `[<your-slug>]`, and cards that name you as `Ревью:` or `Одобрение:`.
Priority:
1. **In Progress** cards you own (finish before starting anything new);
2. **In Review** cards where you are the reviewer or approver;
3. **Todo** cards you own, top first.

Skip **Blocked** unless you can remove the blocker. Never take a card that is not assigned to you
and never assign one to yourself (`producer` assigns across the company, a manager within their
team, the owner assigns `producer`: `GOVERNANCE.md` §1); if you see unassigned work that matters, comment to `producer` instead.

## 3. Check out and work

- Move the card to **In Progress** and comment a 2-4 line plan. If someone else's work is already
  in progress on it, stop and comment instead of competing.
- Do the work according to your role. Code: branch, tests, PR (see `CLAUDE.md`).
  Documents: put them in the repo path the card names, through a PR.
- Verify before claiming: run the tests (`npm test`, `npx tsc --noEmit`; iOS — CI or the Linux Swift
  check described in `CLAUDE.md`); for UI, look at a screenshot; for facts, cite sources.

## 4. Hand off

- Done with your part → move to **In Review**, comment: link (PR/doc), what you verified, what you
  could not verify and why. Then the reviewer and approver take over (`GOVERNANCE.md` §3).
- Cannot continue → move to **Blocked**, comment exactly what blocks you; if it needs the owner,
  create or link a card in "👤 Нужно решение владельца".
- Discovered new work → comment it to `producer` (or create a Backlog card titled `[slug] ...` with
  the standard card fields), do not silently widen your task.

## 5. Exit

Always leave a comment on every card you touched in this run (comment-required invariant).
Report back to whoever invoked you: card links, PR links, status, open questions.
