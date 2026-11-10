---
schema: agentcompanies/v1
kind: company
slug: polka-studio
name: Polka Studio
description: A small company of AI agents that builds and ships the «Полка» book-tracking app (iOS + Android app and API server).
version: 0.1.0
license: proprietary
goals:
  - Ship «Полка» — IMDb for books — to the App Store, backed by a reliable API server.
sources:
  - kind: github-file
    repo: paperclipai/paperclip
    path: docs/companies/companies-spec.md
    attribution: Paperclip AI
    license: MIT
    usage: referenced
---

# Polka Studio

The company that builds this repository. It follows the **Agent Companies** package format and the
operating model of [paperclip](https://github.com/paperclipai/paperclip): an org chart of agents with
titles and reporting lines, company goals that every task traces back to, ticket-style tasks with fixed
statuses, and two control stages (review, then approval) on every piece of work.

## Mission

Ship to the App Store «Полка» (Bookshelf): a reading tracker in the spirit of IMDb — shelf statuses,
ratings and reviews, quotes, book clubs, challenges, friends — with a React Native + Expo app for iOS and Android (`mobile/`) and a
Next.js + PostgreSQL + Redis API server (repository root).

## The board of directors

The repository owner is the board. Agents never decide on their own:

- anything that spends real money (hosting, domain, Apple Developer account, paid tools, lawyers);
- the app's name, icon, store listing and public identity; legal positions; monetisation;
- releases to TestFlight / App Store and anything publicly reachable (servers, domains);
- hiring a new agent role, changing this governance, or changing what agents may do
  (roles, tool lists, skills, permissions, CI workflows);
- repository settings (branch protection, accounts, secrets).

Those go to the Trello list **"👤 Нужно решение владельца"** (see `GOVERNANCE.md`).

## Org chart

```
Board (owner)
└── producer (CEO / producer)
    ├── cto (CTO / tech lead)
    │   ├── server-engineer
    │   ├── ios-engineer
    │   ├── release-engineer
    │   └── reviewer (QA / code review, merges)
    ├── designer
    └── legal-compliance
```

Role definitions: `agents/<slug>/AGENTS.md`. Claude Code runs them through `.claude/agents/<slug>.md`.

## Where things live

| What | Where |
|---|---|
| Live task state (tickets) | Trello board "Полка — студия ИИ-агентов" (skill `trello-board`) |
| How work is approved | `GOVERNANCE.md` |
| What every agent does on each run | `HEARTBEAT.md` |
| Milestones | `projects/*/PROJECT.md` (mirrored as cards in "🎯 Цели и этапы") |
| Code workflow and commands | `../CLAUDE.md` |
