# Project Instructions

## Bootstrap

1. Read `~/.claude/CLAUDE.md` and apply all global rules (plan mode, git commits, rtk, INTEL.md).
2. Read `~/.claude/INTEL.md` and apply all lessons.
3. Read `README.md` in this repo to understand what tskickstart does and how it works.
4. Read `NEXT.md` for current priorities and `TODO.md` for the full roadmap.

## Project Overview

tskickstart (`@jeportie/create-tskickstart`) is a CLI scaffolding tool that generates TypeScript project boilerplate. It uses a two-level prompt system: first pick project type, then answer type-specific questions. Architecture is modular: `src/prompts/`, `src/generators/`, `src/templates/`, `src/utils/`.

## Testing

- All tests live in `tests/` (not `__tests__/`).
- Run `npm test` to execute the full suite (68 integration tests).
- Tests use `NO_INSTALL=1` and env vars like `PROJECT_TYPE`, `VITEST_PRESET`, `PLAYWRIGHT` to control CLI behavior without TTY prompts.
- E2E tests (Playwright) scaffold into `tests/e2e/`, not root `e2e/`.

## Git Branching Strategy

```
main (versioned, production — semantic-release)
  └── dev (integration branch)
        ├── feature/<name>  → PR to dev
        ├── feature/<name>  → PR to dev
        └── feature/<name>  → PR to dev
```

- `main` is protected. Only `dev` merges into `main` when all tests pass.
- `dev` is the integration branch. All feature work targets `dev`.
- Feature branches are created from `dev` and merged back via PR.

## Agent Development Workflow

Feature implementation uses parallel subagents, each in its own git worktree. This keeps agents isolated so they can work simultaneously without conflicts.

### Phase 1: Coding (parallel)

Each feature gets a **coding agent** launched with `isolation: "worktree"`:

```
Agent A (worktree) ──► feature/foo ──► implements + writes tests
Agent B (worktree) ──► feature/bar ──► implements + writes tests
Agent C (worktree) ──► feature/baz ──► implements + writes tests
```

- Agents work in parallel on independent feature branches.
- Each agent has a full copy of the repo via git worktree.
- Agents write code AND tests for their feature.

### Phase 2: Validation (parallel)

After coding, **test agents** validate each branch:

```
Test Agent A ──► run npm test on feature/foo
Test Agent B ──► run npm test on feature/bar
Test Agent C ──► run npm test on feature/baz
```

### Phase 3: Merge (sequential)

A **merge/review agent** integrates features into `dev` one at a time:

1. Rebase `feature/foo` onto `dev`, resolve conflicts, merge.
2. Rebase `feature/bar` onto updated `dev`, resolve conflicts, merge.
3. Rebase `feature/baz` onto updated `dev`, resolve conflicts, merge.

Order matters — foundational features merge first, dependent ones after.

### Phase 4: Final validation

Run the full test suite on `dev` to confirm everything works together before merging `dev` → `main`.

### When to use this workflow

- Multiple independent features planned in `NEXT.md` or `TODO.md`.
- Features that can be developed in parallel without stepping on each other.
- Large refactors that benefit from isolated workspaces.

For single small changes, just work directly on `dev` — no need for the full agent pipeline.

## Key Files

| File                  | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `src/index.js`        | CLI entrypoint — thin orchestrator                       |
| `src/prompts/*.js`    | Interactive prompt modules                               |
| `src/generators/*.js` | File generation logic per project type                   |
| `src/templates/`      | Template files copied into user projects                 |
| `src/utils/*.js`      | Shared utilities (prompt, spinner, fs, install, scripts) |
| `tests/integration/`  | Integration tests — spawn CLI in tmp dir, assert output  |
| `NEXT.md`             | Current sprint / immediate tasks                         |
| `TODO.md`             | Full roadmap with all project types and features         |
