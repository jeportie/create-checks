# AGENTS.md

Governance for this repo lives in **[CLAUDE.md](./CLAUDE.md)** — read it first.

- Crew (agent) definitions: `.claude/agents/`
- Accumulated lessons / memory: `.claude/INTEL.md`
- Feedback intake ledger: `CURRFIX.md`

Any coding agent (Claude Code, opencode, or other) operating in this repo must follow `CLAUDE.md`: the
`main ← dev ← feature/*` branch model, Conventional Commits (no AI attribution), the `checks` + `e2e-gen`
PR gates, the one-human-approval merge rule (agents open PRs, never merge), the Context7-before-library-APIs
mandate, and the Rodin/Socratic decision rule.
