---
name: onboard-company
description: One-time onboarding — install and link the external channels the AI company runs on (GitHub, Slack, Google Mail, Obsidian), with skippable choices and a verification step per integration. Use when setting the company up in a new project or environment.
---

# Onboard the company — install & link your channels

Set up the external tools the crew uses for feedback intake and delivery. Each integration is
**optional and skippable** — link only what your team uses. Do them one at a time and **verify each
with a real read before marking it linked**.

## How to choose
Ask the human which to link (default: skip each). The recommended core is **GitHub** — the crew already
reads issues and opens PRs. Slack, Google Mail, and Obsidian are additional feedback / knowledge
channels. Jira is intentionally out of this set (add it later if adopted).

## Integrations

### 1. GitHub (issues & PRs) — core
- **Purpose:** the primary feedback + delivery channel. Issue → triage (`triage-router`) → crew → PR.
- **Link:** authenticate `gh` (`gh auth login`, `repo` scope) or the GitHub connector.
- **Verify:** `gh auth status` shows the account with `repo` scope, and `gh issue list` works.
- **Record:** the repo (`owner/name`) the crew operates on.

### 2. Slack
- **Purpose:** feedback intake + status notifications — a thread/message becomes a work item; the crew posts status back.
- **Link:** connect the Slack connector and authorize the workspace.
- **Verify:** read a thread or search a channel; confirm the workspace + channels are visible.
- **Record:** which channel(s) are the feedback inbox.

### 3. Google Mail
- **Purpose:** email as a feedback channel — an inbound message becomes a triaged work item.
- **Link:** connect the Google connector and authorize Gmail read scope.
- **Verify:** list recent messages / read one via the connector.
- **Record:** which label or sender routes to the company (so triage ignores the rest).

### 4. Obsidian
- **Purpose:** knowledge base / project notes (a "second brain") the crew reads and writes summaries into.
- **Link:** point to the vault path (a local folder) — no auth, it is just files.
- **Verify:** read the vault index; confirm write access to a `projects/` note.
- **Record:** the vault path and where project notes live.

## Process (per integration — skippable)
1. Ask whether to link it (default: **skip**). If skipped, note it and move on.
2. Detect whether it is already connected; if so, verify and record — done.
3. If not, guide the connection (connector auth / `gh auth login` / vault path).
4. **Verify** with a concrete read (the checks above). Never mark linked without a successful read.
5. Record what you linked (account / workspace / label / path) in the project notes or `.claude/INTEL.md`.

## Notes
- Connectors (Slack, Google) are per-user OAuth in Claude — they are **not** committed to the repo; each
  user links their own. Only GitHub (`gh`) and the Obsidian vault path are environment-level.
- Keep secrets out of the repo — record *what* is linked, never tokens.
- Re-run this skill any time you add a channel.
