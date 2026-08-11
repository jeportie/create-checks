# Company OS — AI crew governance

This project is operated by a small crew of AI agents under human direction. This file is the
canonical governance every agent and contributor follows. Agent definitions live in `.claude/agents/`;
accumulated lessons in `.claude/INTEL.md`. **Adapt the specifics below to your stack** — the workflow
and rules are the point, not any one toolchain.

## Git branching
```
main (release)  ←  dev (integration)  ←  feature/<name> | fix/<name> | support/<name> | chore/<name>
```
- **NEVER** work on `main`. All work targets `dev` via PR; `dev → main` is the release PR.
- Prefixes: `feat|feature/`, `fix/`, `support/` (refactor/tests/CI), `chore/`. kebab-case, one concern per branch.
- **Merges require ONE human approval.** Agents **open** PRs and **STOP** — a human approves and merges.
  Agents MUST NOT run `gh pr merge`.

## Commits
- **Conventional Commits** (`<type>(<scope>): <desc>`). Types: feat, fix, docs, style, refactor, perf,
  test, build, ci, chore, revert.
- **NEVER add `Co-Authored-By` or any AI-attribution lines.** Small, atomic commits.

## Gates (adapt to your CI)
- Every PR must pass your checks (lint, tests, type-check, etc.) before it is mergeable.
- Reproduce them locally before opening a PR. Add tests for new behavior — a behavior with no test is not done.

## Socratic Decision Rule (Rodin) — for decisional work
- Never validate a proposal just because it was proposed. Justify agreement independently; state
  disagreement plainly; steelman the strongest opposing view before deciding. Three validations in a
  row → run a contradiction pass.
- Classify assumptions/features: `✓ Justified` · `~ Contestable` · `⚡ Simplification` · `◐ Blind spot` · `✗ Unjustified`.
  Keep only `✓ Justified` by default; defer the rest unless the human asks.
- **Hard guardrail**: never build a thing just because it is possible — only when required, testable, and in agreed scope.

## Tooling mandates
- **Context7 MCP is mandatory** before using any external-library API: `resolve-library-id` → `query-docs`.
  Do not rely on training data for library APIs.
- Prefix shell commands with `rtk` when available (`rtk --version`); otherwise run them plainly.

## The crew
```
CEO (human) → TRIAGE (feedback → tracked work) → ORCHESTRATOR (decompose, dispatch on dev)
   → THINKER + OPERATOR (TDD Red-Green-Refactor) → REVIEW (open PR, STOP) → QUALITY (gates)
   → human approves → merge → release
```
- **Run the orchestrator as your primary session** — it dispatches the crew via `Task`, and a subagent
  cannot reliably spawn further subagents. Triage is a separate primary invocation.
- Each agent carries a least-privilege `tools:` allowlist in its `.claude/agents/*.md` frontmatter.

## Lessons
Read `.claude/INTEL.md` at the start of any task and apply its lessons. When you learn a durable lesson,
append it there.

---
*Seeded by `@jeportie/create-tskickstart`. Tune the branch names, gates, and agent instructions to fit your project.*
