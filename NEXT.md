# NEXT: tskickstart — Sprint 2

## Focus

Database support (multi-layer prompt + No ORM option), Biome linter alternative, CI/CD pipeline, codebase housekeeping, then fullstack types.

## Live Status (Updated)

Phase 1 feature work is implemented, fixed, and merged to `dev`.

- [x] DB-01 (done)
- [x] BIOME-01 (done)
- [x] CICD-01 (done)
- [x] HOUSE-01 (done)

All sprint issues from this phase were tracked in `CURRFIX.md` and are now closed.

---

## Tooling Requirements

This sprint depends heavily on external libraries and their APIs. All agents MUST follow these rules:

### Context7 MCP — Mandatory for All External Dependencies

Every task touches third-party packages (Drizzle, Prisma, Mongoose, Biome, GitHub Actions, etc.). **Do NOT rely on training data for library APIs** — versions and configs drift constantly.

- **Before scaffolding any template** that uses an external library: call `resolve-library-id` then `query-docs` to get current API, config format, and setup steps.
- **Before adding any dependency**: verify the package name, current version, and correct import paths via Context7.
- **Key libraries to verify via Context7 this sprint:**
  - `drizzle-orm` + `drizzle-kit` — config format, migration API, dialect setup
  - `prisma` + `@prisma/client` — schema syntax, migrate commands, provider config
  - `mongoose` — connection API, model/schema definition, current best practices
  - `pg`, `mysql2`, `better-sqlite3` — connection pool setup, query API
  - `ioredis` — connection options, current API
  - `@biomejs/biome` — `biome.json` schema, CLI commands, rule categories
  - `changesets` — config format, versioning workflow
  - GitHub Actions — workflow syntax, current action versions (`actions/checkout@v4`, `actions/setup-node@v4`, etc.)

### rtk — Token Optimization

All agents MUST prefix shell commands with `rtk` to save tokens on command output:

- `rtk git status`, `rtk git diff`, `rtk git log` instead of raw git commands
- `rtk ls`, `rtk grep` instead of raw equivalents
- Check `rtk --version` first — if not installed, fall back to raw commands

---

## Agent Crew Execution Plan

This sprint uses the **full orchestrator pipeline** to parallelize independent work.

### Roles

| Agent | Role | Branch / Scope |
| --- | --- | --- |
| **Orchestrator** | Coordinates all tasks, dispatches to sub-agent pairs, sequences dependent work | `dev` (integration) |
| **Thinker** | Designs approach, breaks task into TDD micro-cycles, reviews Operator's code | One per feature branch |
| **Operator** | Executes Red-Green-Refactor TDD cycles based on Thinker instructions | One per feature branch |
| **Review** | Inspects feature branch diff vs `dev`, verifies acceptance criteria, approves or rejects | Runs before each merge to `dev` |
| **Quality** | Runs full test suite, linter, type checks, coverage analysis | Runs on `dev` after each merge |

### Execution Flow

```
                         Orchestrator (dev)
                              │
          ┌───────────────────┼───────────────────┬──────────────────┐
          │                   │                   │                  │
    feature/database    feature/biome      feature/cicd      feature/housekeeping
    Thinker + Operator  Thinker + Operator Thinker + Operator  Review agent
          │                   │                   │                  │
          ▼                   ▼                   ▼                  ▼
     Review agent        Review agent       Review agent        Review agent
          │                   │                   │                  │
          └───────────────────┼───────────────────┴──────────────────┘
                              │
                     Quality agent (dev)
                              │
                    feature/fullstack
                    Thinker + Operator
                              │
                     Review → Quality
                              │
                    feature/fullstack-app
                    Thinker + Operator
                              │
                     Review → Quality
                              │
                      PR: dev → main
```

---

## Phase 1 — Parallel Features (Completed)

All four branches run simultaneously. Each feature branch gets a Thinker + Operator pair working in TDD (Red-Green-Refactor).

### Task DB-01: Database Option (`feature/database`)

**Status:** DONE (implemented, fixed, and merged to `dev`)

**Multi-layer prompt system for backend type.**

**Step 1 — New files:**

- `src/prompts/database.js` — Two-step prompt: engine selection, then ORM layer
- `src/generators/database.js` — Generates files based on engine + ORM combo
- `src/templates/database/raw/` — Raw driver templates (connection pool, migration runner, SQL template)
- `src/templates/database/drizzle/` — Drizzle config, schema, migrate script
- `src/templates/database/prisma/` — Prisma schema, singleton client, scripts
- `src/templates/database/mongoose/` — Connection + example model
- `src/templates/database/redis/` — Connection helper
- `tests/integration/database.int.test.js`

**Step 2 — Modify existing files:**

- `src/generators/backend.js` — Call database generator after framework scaffold
- `src/prompts/backend.js` — Wire database prompt into backend flow

**Engine → ORM matrix:**

| Engine     | ORM choices                                    |
| ---------- | ---------------------------------------------- |
| PostgreSQL | None (raw `pg`) / Drizzle / Prisma             |
| MySQL      | None (raw `mysql2`) / Drizzle / Prisma         |
| MariaDB    | None (raw `mysql2`) / Drizzle / Prisma         |
| SQLite     | None (raw `better-sqlite3`) / Drizzle / Prisma |
| MongoDB    | Mongoose only                                  |

**"None" (raw driver) scaffolds:**

- `src/db/index.ts` — Connection pool setup
- `src/db/migrate.ts` — Custom migration runner (reads `*.sql` files, tracks applied migrations in a `_migrations` table)
- `src/db/migrations/001_initial.sql` — Template migration

**Acceptance criteria:**

- [x] Two-step prompt works with back navigation
- [x] All 13 engine+ORM combinations scaffold correctly
- [x] Raw driver migration runner executes SQL files in order
- [x] `.env.example` populated with correct connection string template
- [x] Docker Compose service added when Docker is enabled
- [x] README section generated for chosen database

---

### Task BIOME-01: Biome Alternative (`feature/biome`)

**Status:** DONE (implemented, fixed, and merged to `dev`)

**Offer Biome as single-tool alternative to ESLint + Prettier.**

**Modify:**

- `src/prompts/common.js` — Add linter choice: "ESLint + Prettier" / "Biome"
- `src/generators/common.js` — Conditional: if Biome, skip ESLint/Prettier config and deps
- `src/utils/install.js` — Biome dependency (`@biomejs/biome`)
- `src/utils/scripts.js` — Biome scripts (`biome check`, `biome format --write`)
- `src/utils/readme.js` — Biome section in README

**Create:**

- `src/templates/common/biome.json` — Biome config
- `tests/integration/biome.int.test.js`

**Acceptance criteria:**

- [x] Biome selection replaces all ESLint + Prettier config and packages
- [x] `biome.json` generated with correct rules
- [x] Scripts use biome commands
- [x] Husky/lint-staged uses biome when selected
- [x] CSpell runs standalone (no ESLint plugin integration)
- [x] All existing project types work with Biome choice

---

### Task CICD-01: CI/CD Pipeline Option (`feature/cicd`)

**Status:** DONE (implemented, fixed, and merged to `dev`)

**GitHub Actions pipeline scaffold for all project types.**

**Files:**

- `src/prompts/cicd.js` — CI/CD prompt (yes/no)
- `src/generators/cicd.js` — Generates CI workflow
- `tests/integration/cicd.int.test.js`

**Acceptance criteria:**

- [x] PR checks workflow runs `npm run check`
- [x] Works for all existing project types
- [x] Skips CI generation for npm-lib (has its own PR workflow)

---

### Task HOUSE-01: Codebase Housekeeping (`feature/housekeeping`)

**Status:** DONE (implemented, fixed, and merged to `dev`)

**Review agent runs a full codebase audit.** This is a refactoring and quality pass, not a feature.

**Scope:**

- Code duplication across generators — extract shared utilities if patterns repeat 3+ times
- Consistent error handling in prompts (back navigation edge cases)
- Template file consistency (naming, structure, comments)
- Test coverage gaps — identify untested paths in existing integration tests
- Dead code / unused imports / stale TODO comments
- Package.json scripts consistency
- Dependency audit (outdated or unnecessary packages)

**Rules:**

- No functional changes — refactoring only
- Baseline test suite on `dev` must still pass
- No new features, no scope creep

**Acceptance criteria:**

- [x] Baseline test suite on `dev` passes
- [x] No new test failures introduced
- [ ] Code review findings documented in PR description
- [ ] Any extracted utilities have tests

---

## Phase 2 — Sequential (after Phase 1 completion)

These depend on Phase 1 being complete. Quality agent validates `dev` before each starts.

### Task FS-01: Fullstack Type (`feature/fullstack`)

Depends on: DB-01, BIOME-01, CICD-01 merged to `dev`.

- pnpm monorepo: `apps/backend/` + `apps/frontend/` + `packages/shared/`
- Reuses backend + frontend generators
- Root `tsconfig.base.json`, shared lint config (ESLint or Biome)
- Docker Compose for full dev env (backend + database + Redis)
- Changesets for per-package versioning
- Database prompt reused from DB-01 inside fullstack flow
- CI: root PR check + per-workspace deploy workflows

### Task FSA-01: Fullstack + App Type (`feature/fullstack-app`)

Depends on: FS-01 merged to `dev`.

- Extends fullstack with `apps/mobile/` workspace
- Reuses app generator
- Shared packages for types/utils
- Detox for mobile E2E, Playwright for web E2E
- Unified CI pipeline

---

## Quality Gates

After **every** feature branch merge to `dev`:

1. **Review agent** inspects the feature branch diff against `dev`
   - Verifies all acceptance criteria
   - Checks test quality (not just passing, but meaningful assertions)
   - Approves → merge, or rejects with actionable feedback
2. **Quality agent** runs on `dev` post-merge
   - Full test suite (`npm test`)
   - Linter pass
   - Coverage analysis (flag regressions)
   - Reports structured pass/fail result

Before **PR to `main`**:

- Quality agent runs final pre-PR gate on `dev`
- All tests pass, no coverage regressions, clean lint
- Only then create PR: `dev → main`
