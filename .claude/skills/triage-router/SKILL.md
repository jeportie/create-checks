---
name: triage-router
description: Decide whether an incoming issue/feature is necessary and useful, then route it to the right level of action — do-now (L1), delegate (L2), human-only (L3), or reject. Used both by the triage agent locally and by the agent-triage CI workflow. Read when triaging any GitHub issue or feature request for this repo.
---

# Triage router — classify & route incoming work

Every incoming issue or feature request is classified into exactly one level, then routed. Spend
effort only where it is justified (Rodin rule), and keep a **human gate at every level — nothing is
merged automatically.**

Applied two ways:
- **Automatically** by `.github/workflows/agent-triage.yml` on issue-open (a free model classifies,
  applies a label, and comments).
- **By the `triage` agent** when a human runs it (it also files the `CF-XXX` entry — see `triage` + `CURRFIX.md`).

## The levels

| Verdict | Label | Criteria | Route |
|---|---|---|---|
| **L1 — do now** | `triage:l1-do-now` | trivial · low-risk · clearly useful · testable · **not** touching published `src/` API, UI, or security (docs, typos, config/lint nits, small obvious bug fixes) | the **crew** implements on a `fix/…` branch and **opens a PR** — a human merges |
| **L2 — delegate** | `triage:l2-delegate` | medium scope, worth prioritising; a well-scoped bug or small feature with clear acceptance criteria | a **Jira ticket** → **human approves** → worked by a human *or* the **half-daily cron agent** (opens PRs) |
| **L3 — human** | `triage:l3-human` | new feature · UI/UX · security-sensitive · architecture · change to the published `src/` API · ambiguous/underspecified | **label + assign a human**; not auto-worked |
| **Reject / needs-info** | `triage:needs-info` | not useful · out of scope · duplicate · too underspecified to act on | comment (ask for repro/scope) + close-or-hold |

**When unsure between two levels, pick the more conservative (higher) one.** A false L3 costs a human
glance; a false L1 ships an unreviewed change.

## Decision heuristics
- Touches the **published surface** (`src/`) or how a scaffolded project behaves for users? → at least L2, usually L3.
- Correct behaviour **obvious and testable**, tiny diff? → L1.
- A **judgement / prioritisation / design** call? → L2 (queue) or L3 (human).
- Security, auth, secrets, data handling? → never L1; L3.
- Can't tell what "done" means? → Reject / needs-info; ask.

## Routing actions
- **L1** → the crew (orchestrator → thinker/operator) builds it TDD-first, `review` opens the PR,
  `quality` gates, a human merges. Never auto-merge.
- **L2** → create a Jira ticket (see *Stubs*), await human approval, then a human or the cron agent
  runs the crew on it.
- **L3** → assign/notify a human with enough context to pick it up.
- **Reject** → a courteous comment (scope / duplicate / needs-info); a human closes.

## The human gate (all levels)
Agents only ever **open** PRs; `gh pr merge` is denied to them. The classifier only labels and
comments — it never writes code and never merges. Every level ends at a human.

## Stubs (wire when ready — kept out of v1 on purpose)
- **Jira auto-creation** for L2 is not wired — a human files the ticket for now. Enable with Jira creds
  and a step that creates the ticket from the issue.
- **The half-daily cron agent** (a `schedule:` workflow that picks up human-approved tickets and runs
  the crew, opening PRs) is documented, not scheduled. Enable with a scheduled workflow + an
  `ANTHROPIC_API_KEY` secret once you want in-CI implementation.
- **L1 autofix directly in CI** (instead of the crew doing it): opt-in — add a coding-agent job guarded
  by `ANTHROPIC_API_KEY`.

## Setup
Run `node scripts/ci/labels.mjs` once to create the `triage:*` labels. The CI classifier reuses the
`AI_REVIEW_API_KEY` secret (+ optional `AI_REVIEW_ENDPOINT` / `AI_REVIEW_MODEL` variables) — the same
free-tier model as the AI review — and skips cleanly if unset. Note: `issues:` workflows run from the
**default branch**, so triage activates once this lands on `main`.
