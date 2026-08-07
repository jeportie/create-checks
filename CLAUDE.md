# tskickstart — Company OS

This repo is operated by a small crew of AI agents (a "company") under human direction. This file is
the canonical governance every agent and contributor follows. Agent definitions live in
`.claude/agents/`; accumulated lessons in `.claude/INTEL.md`.

## Project snapshot
- **Package**: `@jeportie/create-tskickstart` — a promptless, env-var-driven scaffolding CLI
  (`src/index.js`, pipeline `prompts → generators → templates`).
- **Stack**: pure ESM, **npm only** (`npm ci`), Node **20.14** (`.nvmrc`), **Vitest**,
  ESLint 9 + Prettier, secretlint, cspell, commitlint. Releases via **semantic-release** on `main`.
- Only `src/` is published. Never edit the `version` field — semantic-release owns it.

## Git branching
```
main (release; semantic-release)  ←  dev (integration)  ←  feature/<name> | fix/cf-<n>-<slug> | support/<name> | chore/<name>
```
- **NEVER** work on `main`. All work targets `dev` via PR; `dev → main` is the release PR.
- Prefixes: `feat|feature/`, `fix/`, `support/` (refactor/tests/CI), `chore/`. kebab-case, one concern per branch.
- **Merges into `dev` and `main` require ONE human approval** (enforced by `.github/rulesets/*.json`).
  Agents **open** PRs (`gh pr create`) and **STOP** — a human approves and merges. Agents MUST NOT run
  `gh pr merge` on `dev`/`main`.

## Commits
- **Conventional Commits** (`<type>(<scope>): <desc>`) — they drive semantic-release. Types: feat, fix,
  docs, style, refactor, perf, test, build, ci, chore, revert. Scopes: prompts, generators, templates,
  utils, cli, backend, frontend, npm-lib, app, e2e, ci, docs, agents.
- **NEVER add `Co-Authored-By` or any AI-attribution lines.**
- Describe the behavior/change, not the mechanics. Small, atomic commits.

## Gates every PR must pass (never bypass)
- **`checks`**: `npm run lint` · `npm run secretlint` · `npm run spellcheck` · `npm test` · `npm run test:integration`
- **`e2e-gen`**: `npm run e2e:gen` — fast, no-network scaffold smoke test (`scripts/e2e/run.mjs`)
- Reproduce locally with `npm run check` and `npm run e2e:gen` before opening a PR.
- New vocabulary must be added to `cspell.json` (it also spell-checks commit messages).

## Issue-Fix Campaign Rule (feedback → work)
Feedback enters as **GitHub Issues** (bug/feature templates) and is tracked in `CURRFIX.md` as `CF-XXX`
lines. For each issue:
1. **Triage** → append a `CF-XXX` line to `CURRFIX.md` on a dedicated `fix/cf-<n>-<slug>` branch (the
   CF line rides in the same PR as the fix).
2. **Implement** the fix TDD-first on that branch; keep the branch to that one concern.
3. **Open a PR** to `dev`; a human approves + merges.
4. **After merge**, mark the line `- [x] … STATUS=DONE … GH=#<n> | PR=#<n> merged to dev` and close the issue.

CF grammar: `- [ ] CF-0NN | AREA | short description | STATUS=OPEN | reported_by=<login> | GH=#<n>`
(next id = highest existing CF number + 1, zero-padded to 3).

## Socratic Decision Rule (Rodin) — mandatory for decisional work
Applies to the orchestrator, thinker, review, and quality agents (plan + reflection).
- Never validate a proposal just because it was proposed. If you agree, justify it independently and add
  the missing trade-offs. If you disagree, say so and why. If it is debatable, steelman the strongest
  opposing view before deciding. Three validations in a row → run a contradiction pass.
- **Steelman** a position in its strongest form before critiquing it.
- Classify assumptions/features: `✓ Justified` · `~ Contestable` · `⚡ Simplification` · `◐ Blind spot` · `✗ Unjustified`.
- Keep only `✓ Justified` items by default; defer the rest unless the human asks.
- **Hard guardrail**: never build a thing just because it is possible — only when required, testable, and in agreed scope.

## Tooling mandates
- **Context7 MCP is mandatory** before using any external-library API: `resolve-library-id` → `query-docs`.
  Do not rely on training data for library APIs.
- Prefix shell commands with `rtk` when available (`rtk --version`); otherwise run them plainly.

## The crew (who does what)
```
CEO (human) → TRIAGE (issue → CF-XXX) → ORCHESTRATOR (decompose, dispatch on dev)
   → THINKER + OPERATOR (TDD Red-Green-Refactor on fix/cf-<n>) → REVIEW (open PR, STOP)
   → QUALITY (gates) → human approves → merge → semantic-release
```
- **Run the orchestrator as your primary session** — it dispatches the crew via `Task`, and a subagent
  cannot reliably spawn further subagents. Triage is a separate primary invocation.
- Each agent carries a least-privilege tool allowlist in its `.claude/agents/*.md` frontmatter.

## Lessons
Read `.claude/INTEL.md` at the start of any task and apply its lessons. When you learn a durable lesson
(or make a mistake worth not repeating), append it there.
