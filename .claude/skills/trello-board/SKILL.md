---
name: trello-board
description: How to read and update the studio's Trello board (task tracker) - list ids, card format, status moves, comments. Use whenever you pick up, hand off, block or finish a task, or when creating cards.
---

# Trello board

Board: **Полка — студия ИИ-агентов** — https://trello.com/b/51CJyjdc
Board id: `ari:cloud:trello::board/workspace/60cc4856f390b18cf0358d90/6af2dd0b2bac41d25ed670ac`

Lists (id prefix `ari:cloud:trello::list/workspace/60cc4856f390b18cf0358d90/`):

| List | Status meaning | id suffix |
|---|---|---|
| 🎯 Цели и этапы | mission and milestones (not tasks) | `6af2dd2098d1122d153b2496` |
| 👤 Нужно решение владельца | board decisions, owner acts | `6af2dd21e53954548ec63bbf` |
| Backlog | known, not ready / not prioritised | `6af2dd22525cca4ff19f6b73` |
| Todo | ready to take | `6af2dd23f20d706e494c52a0` |
| In Progress | checked out by its executor | `6af2dd24773db4daa3d94e55` |
| In Review | waiting for review / approval | `6af2dd25634d8d837c9b7c4e` |
| Blocked | waiting on a named blocker | `6af2dd279416897905f2278f` |
| Done | reviewed, approved, merged | `6af2dd2882f65768a2c294e6` |

Tools: `mcp__Trello__trelloReadList` (`list_by_board`), `mcp__Trello__trelloReadCard` (`list_by_list`,
`get`), `mcp__Trello__trelloSearch` (`search_cards` with `boardIds`), `mcp__Trello__trelloWriteCard`
(`create`, `move`, `update`, `add_comment`), `mcp__Trello__trelloWriteChecklist`. Load them with
ToolSearch if they are deferred.

## Card format (all agents share one Trello user, so the executor is in the title)

- Title: `[<executor-slug>] Short imperative task` (board decisions: `[владелец] ...`).
- Description, in Russian (the owner reads the board):
  `**Цель:** M1..M4` · `**Исполнитель:**` · `**Ревью:**` · `**Одобрение:**` ·
  `**Готово, когда:**` (verifiable) · links (PR, docs, related cards).

## Moves and comments

- Pick up: move to In Progress, comment a short plan.
- Hand off: move to In Review, comment the PR/doc link, what was verified, what was not.
- Blocked: move to Blocked, comment the exact blocker (card link or owner decision).
- Done: `reviewer` after merging the PR, for everything that produces repository files (code and
  documents); the approver only for work with no repository artifact. Comment the merge commit or
  the final link.
- Every run that touches a card leaves a comment on it.
- Timeouts: a Trello write that times out may still have succeeded. List the target list before
  retrying, so you do not create duplicates.

Do not delete cards; archive with a comment if cancelled (producer only).
