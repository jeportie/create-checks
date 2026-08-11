# AGENTS.md

Governance for this project lives in **[CLAUDE.md](./CLAUDE.md)** — read it first.

- Crew (agent) definitions: `.claude/agents/`
- Accumulated lessons / memory: `.claude/INTEL.md`

Any coding agent (Claude Code, opencode, or other) operating in this project must follow `CLAUDE.md`:
the `main ← dev ← feature/*` branch model, Conventional Commits (no AI attribution), your CI gates, the
one-human-approval merge rule (agents open PRs, never merge), the Context7-before-library-APIs mandate,
and the Rodin/Socratic decision rule.
