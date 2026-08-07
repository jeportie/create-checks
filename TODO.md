# tskickstart — Roadmap & TODO

## Current State Assessment

The current `tskickstart` is a **type-aware scaffolding CLI** (`@jeportie/create-tskickstart`) with a modular architecture. It supports a two-level prompt system that routes to type-specific generators. Implemented project types: `npm-lib`, `cli`, `backend`, `frontend`, and `app` (React Native). Features include a wizard-based prompt system with back navigation, animated spinner, comprehensive README generation, and optional tools per mode. 300+ tests currently pass on `dev`.

## Sprint 2 Status (Current)

Phase 1 is implemented, fixed through `CURRFIX.md`, and merged to `dev`.

- [x] DB-01 Database option (completed via CURRFIX campaign)
- [x] BIOME-01 Biome alternative (completed via CURRFIX campaign)
- [x] CICD-01 CI/CD pipeline option (completed via CURRFIX campaign)
- [x] HOUSE-01 Codebase housekeeping (completed via CURRFIX campaign)

## Release-Gating DevOps Epic (Done — shipped in v1.9.0 / v1.9.1)

Before promoting `dev` → `main`, a two-tier E2E install matrix + repo CI/CD were built to prove
generated projects actually install/build/lint/test (the existing suite only ran with `NO_INSTALL`).

- [x] **E2E install matrix** (`scripts/e2e`) — Tier 1 generation (162/162) + Tier 2 real-install verify (16/16 green on Linux CI); filters, tree recap, `e2e-report.json`
- [x] **Repo CI/CD** — auto-labeler, issue/PR templates (Ledger emoji style), CODEOWNERS, Dependabot (→ `dev`), dev/release pipeline gates (`e2e-gen`, pre-publish `checks`), branch-protection rulesets, free-tier AI PR review (Groq)
- [x] **Scaffold fixes** CF-040..046 (see `CURRFIX.md`) surfaced by the gate
- [x] **Released** v1.9.0 then v1.9.1 to npm via semantic-release

---

## Architecture: Two-Level Prompt System

```
Step 1: What are you building?
  ┌─ npm-lib     → Package/library published to npm
  ├─ cli         → Node.js CLI tool (may or may not publish to npm)
  ├─ backend     → Node.js API/server
  ├─ frontend    → Browser SPA/static site
  ├─ app         → Mobile application (React Native)
  ├─ fullstack   → Monorepo (frontend + backend)
  └─ fullstack + app → Monorepo (frontend + backend + mobile)

Step 2: Type-specific questions (with ← Back navigation)

Step 3: Common questions (always asked)
  - Linter & formatter (ESLint + Prettier / Biome)
  - CSpell / Secretlint / Commitlint
  - Husky pre-commit hooks
  - Vitest setup
  - CI/CD pipeline
```

---

## Project Types

### 1. `npm-lib` — Library published to npm ✅

- [x] **Build:** `tsup` — dual CJS/ESM output + declaration files
- [x] **Versioning:** `semantic-release` + `conventional-changelog-conventionalcommits`
- [x] **Package manager choice:** `npm` (default) or `pnpm`
- [x] **GitHub Actions:** PR checks + semantic-release + npm publish workflows

---

### 2. `cli` — Node.js CLI tool ✅

- [x] `commander`, `inquirer`, or `@clack/prompts` for argument parsing / interactive prompts
- [x] `bin` field in `package.json`
- [x] Shebang in entry file (`#!/usr/bin/env node`)
- [x] Build: `tsup` with `--format cjs` only + `--shims` flag
- [x] Semantic-release if publishing to npm, otherwise skip
- [x] **Tool versioning:** `mise`

---

### 3. `backend` — Node.js API/server ✅

- [x] **Framework selection:** Hono, Fastify, Express, Elysia (Bun)
- [x] **Tool versioning:** `mise` (`.mise.toml` with node version pinned)
- [x] **Dev server:** `tsx --watch` for hot reload
- [x] **Env validation:** `zod` schema (`src/env.ts`) for type-safe environment variables
- [x] **Containerization:** `Dockerfile` + `docker-compose.yml`

---

### 4. `frontend` — Browser SPA ✅

- [x] **Bundler:** Vite
- [x] **Framework:** React 18
- [x] **CSS:** Tailwind v4 (Vite plugin)
- [x] **Routing:** React Router v7
- [x] **Async state:** TanStack Query v5
- [x] **Test environment:** `happy-dom` + Testing Library
- [x] **Playwright E2E:** Optional addon

---

### 5. `app` — Mobile Application (React Native) ✅

- [x] **Framework:** React Native (Expo managed workflow or bare)
- [x] **Navigation:** React Navigation v7
- [x] **State management:** TanStack Query v5
- [x] **E2E testing:** Detox
- [x] **Unit testing:** Jest + React Native Testing Library

---

### 6. `fullstack` — Monorepo

- [ ] **Package manager:** `pnpm` as default (disk space, strict hoisting, better workspace support)
- [ ] **Workspace structure:** `apps/backend/` + `apps/frontend/` + `packages/shared/`
- [ ] **Root scripts:** Delegate to workspaces via `pnpm --filter`
- [ ] **mise:** Always include
- [ ] **Shared configs:** Root `tsconfig.base.json`, root `eslint.config.js` (or `biome.json`), shared `prettier.config`
- [ ] **Docker:** Dockerfile for backend + `docker-compose.yml` for full dev env (backend + database + Redis)
- [ ] **Versioning:** `changesets` (better than semantic-release for monorepos — per-package control)
- [ ] **CI:** Root PR check + separate deploy workflows per workspace
- [ ] **Database:** Reuses database module from backend type

---

### 7. `fullstack + app` — Monorepo with Mobile

- [ ] Extends `fullstack` with an additional `apps/mobile/` workspace
- [ ] Shared code packages (`packages/shared/` for types, utils)
- [ ] Detox for mobile E2E, Playwright for web E2E
- [ ] Unified CI pipeline across web + mobile

---

## Cross-Cutting Features

### Database Option (Backend-First)

Add an optional database scaffold to the backend type. Extend to fullstack when that type ships.

**Multi-layer prompt — pick engine first, then ORM layer:**

**Step 1 — Database engine:**

| Engine     | Driver package         |
| ---------- | ---------------------- |
| PostgreSQL | `pg`                   |
| MySQL      | `mysql2`               |
| MariaDB    | `mysql2` (compatible)  |
| SQLite     | `better-sqlite3`       |
| MongoDB    | `mongodb` / `mongoose` |

**Step 2 — ORM layer (depends on engine):**

| Engine     | ORM choices                                                  |
| ---------- | ------------------------------------------------------------ |
| PostgreSQL | None (raw driver) / Drizzle / Prisma                         |
| MySQL      | None (raw driver) / Drizzle / Prisma                         |
| MariaDB    | None (raw driver) / Drizzle / Prisma                         |
| SQLite     | None (raw driver) / Drizzle / Prisma                         |
| MongoDB    | Mongoose (only — Prisma lacks migration support for MongoDB) |

**What gets scaffolded per ORM choice:**

| ORM choice | Packages | What gets scaffolded |
| --- | --- | --- |
| None (raw driver) | `pg` / `mysql2` / `better-sqlite3` | `src/db/index.ts` (connection pool), `src/db/migrations/` dir, `src/db/migrate.ts` (custom migration runner), `src/db/migrations/001_initial.sql` (template) |
| Drizzle | `drizzle-orm`, `drizzle-kit`, driver | `drizzle.config.ts`, `src/db/index.ts`, `src/db/schema.ts`, migrate script |
| Prisma | `prisma`, `@prisma/client` | `prisma/schema.prisma`, `src/db/index.ts` (singleton), generate + migrate scripts |
| Mongoose | `mongoose` | `src/db/index.ts` (connection), `src/db/models/example.ts` |

**All database choices also scaffold:**

- `.env.example` with connection string template
- Docker Compose service for the database (if Docker is enabled)
- Database section in generated README

**Prompt design:**

```
? Set up a database? (Y/n)
? Which database engine?
  ❯ PostgreSQL
    MySQL
    MariaDB
    SQLite
    MongoDB
? ORM layer?                          ← adapts to engine
  ❯ None (raw driver + migrations)    ← not shown for MongoDB
    Drizzle                           ← not shown for MongoDB
    Prisma                            ← not shown for MongoDB
    Mongoose                          ← only shown for MongoDB
? Set up Redis for caching? (Y/n)
```

**Files:**

- `src/prompts/database.js`
- `src/generators/database.js`
- `src/templates/database/raw/`, `drizzle/`, `prisma/`, `mongoose/`, `redis/`
- `tests/integration/database.int.test.js`

---

### CI/CD Pipeline Option (All Modes)

Add an optional CI/CD scaffold that generates a production-ready GitHub Actions pipeline:

- [ ] **PR checks workflow** — `ci.yml`: Runs `npm run check` on every pull request (lint, typecheck, test)
- [ ] **Staging deploy** — `deploy-staging.yml`: Deploy on `dev` push
- [ ] **Production deploy** — `deploy-production.yml`: Deploy on `main` push
- [ ] **Mode-specific deploy targets:**
  - `backend`: Railway / Fly.io / Docker registry (ghcr.io)
  - `frontend`: Vercel / Netlify / GitHub Pages
  - `app`: EAS Build + EAS Submit
  - `npm-lib` / `cli`: Already handled by semantic-release workflow
- [ ] **Secrets documentation** — `.github/SECRETS.md` explaining required secrets per workflow

**Prompt design:**

```
? Set up CI/CD pipeline? (Y/n)
? Which deployment target? (mode-specific choices)
  - backend: Railway / Fly.io / Docker registry / None
  - frontend: Vercel / Netlify / GitHub Pages / None
  - app: EAS / None
```

**Files:**

- `src/prompts/cicd.js`
- `src/generators/cicd.js`
- `src/templates/cicd/` (workflow templates per target)
- `tests/integration/cicd.int.test.js`

---

### Biome Alternative

Offer Biome as an alternative to ESLint + Prettier for all project types.

**What changes when Biome is selected:**

- `biome.json` replaces `eslint.config.js` + `prettier.config.js` + `.prettierignore`
- `@biomejs/biome` replaces 7+ ESLint/Prettier packages
- Scripts: `lint` → `biome check`, `format` → `biome format --write`, `check` → `biome check --write`
- Husky/lint-staged uses biome commands instead of eslint/prettier
- CSpell runs standalone (no ESLint plugin integration)

**Prompt design:**

```
? Linter & formatter?
  ❯ ESLint + Prettier (default)
    Biome (faster, single tool)
```

**Files:**

- Update `src/prompts/common.js` (add linter choice)
- `src/templates/common/biome.json`
- Update `src/generators/common.js` (conditional generation)
- Update `src/utils/install.js`, `scripts.js`, `readme.js`
- `tests/integration/biome.int.test.js`

---

### Type-Specific Implementation Workflow & Tutorials (CF-032)

The `getImplementationWorkflow()` function in `src/utils/readme.js` generates identical generic workflow steps for all non-backend types (frontend, cli, npm-lib, app), with only tiny 1-8 line tutorial snippets appended per type. The backend README path (`generateBackendReadme`) has `renderBackendDevelopmentSection()` with quick-reference how-tos (adding a route, middleware, env var, curl examples) but no Implementation Workflow or progressive tutorials either.

**Goal:** Replace generic stubs with rich, type-specific workflow steps and progressive multi-step tutorials for all 5 project types.

**Affected files:**

- `src/utils/readme.js` — refactor `getImplementationWorkflow()` into a dispatcher + 4 type-specific functions; add `renderBackendImplementationWorkflow()` + `renderBackendTutorial()` to `generateBackendReadme()`
- `tests/integration/readme.int.test.js` — add assertions for type-specific content

**Implementation plan:**

1. Refactor `getImplementationWorkflow()` (line 2018) into a dispatcher:

```js
function getImplementationWorkflow(answers) {
  switch (answers.projectType) {
    case 'frontend':
      return getFrontendImplementationWorkflow(answers);
    case 'cli':
      return getCliImplementationWorkflow(answers);
    case 'npm-lib':
      return getNpmLibImplementationWorkflow(answers);
    case 'app':
      return getAppImplementationWorkflow(answers);
    default:
      return '';
  }
}
```

2. Add 4 non-backend functions, each producing:
   - **Part A**: 5 concrete, type-specific workflow steps
   - **Part B**: Type-specific Tutorial heading + 3 progressive tutorials with full code examples, test files, and "What you learned" summaries

3. Add 2 backend functions (`renderBackendImplementationWorkflow`, `renderBackendTutorial`) and insert them into `generateBackendReadme()` after the Development section.

4. Update integration tests to assert type-specific content.

**Per-type content outline:**

| Type | Workflow focus | Tutorial topics |
| --- | --- | --- |
| frontend | Vite HMR, `.tsx` patterns, Testing Library, React Router, commitlint | NotificationBanner TDD, About page with routing, React Query data fetching |
| backend | `npm run dev`, framework-specific route, failing test first, quality gate | CRUD endpoint TDD, middleware with validation, DB-backed route (conditional) |
| cli | `src/commands/` pattern, `npm run dev -- <cmd>`, tsx watch, handler testing | Framework-specific: Commander flags, Inquirer prompts, Clack wizards |
| npm-lib | Export-first in `src/main.ts`, build to `dist/`, verify CJS+ESM+`.d.ts` | Add a utility, add a typed class, evolve API safely |
| app | Screen-first in `src/screens/`, wire navigation, Testing Library + Detox | Build a screen, add navigation, shared components |

**Frontend example (target depth for all types):**

The frontend Implementation Workflow and Tutorial should look like this — all other types should match this level of detail with their own stack-specific content.

#### Implementation Workflow

1. **Start the dev server** — run `npm run dev` and open `http://localhost:5173`. Vite HMR is active so every saved change appears instantly in the browser.

2. **Create the component** — add a new `.tsx` file in `src/`. Follow the patterns in `src/Welcome.tsx`: default export, TypeScript props type, Tailwind utility classes for styling.

3. **Write a failing test first** — create a matching test file in `tests/unit/` (e.g. `ComponentName.unit.test.tsx`). Use `render` and `screen` from Testing Library to assert the expected behavior, then run `npm run test:unit` to confirm the test fails.

4. **Implement until tests pass** — fill in the component code until `npm run test:unit` goes green. Check the browser to verify visually — Vite HMR picks up saved changes immediately.

5. **Wire into the app and run the quality gate** — if it is a page, add a `<Route>` in `src/App.tsx`. If it is a shared component, import it in the page that needs it. Then run the full check:

```bash
npm run check    # format, lint, typecheck, spellcheck, secretlint, tests
```

Commit using the conventional format enforced by commitlint:

```bash
git commit -m "feat(ui): add NotificationBanner component"
```

#### Frontend Tutorial

Three progressive tutorials that build on this project. Each one introduces a real pattern you will use when building features on top of this starter.

**Tutorial 1: Build a NotificationBanner with TDD** — A dismissible banner that accepts a message and a variant (`"info"` or `"error"`). Walks through the full red-green-refactor cycle:

- Step 1: Start with the props type and an empty component (`src/NotificationBanner.tsx`)
- Step 2: Write failing tests (`tests/unit/NotificationBanner.unit.test.tsx`) using `render`, `screen`, `userEvent`
- Step 3: Implement until green — `useState`, conditional Tailwind classes, `aria-label`
- Step 4: Use it — import in `src/Welcome.tsx`, verify in browser
- "What you learned": TypeScript props, conditional Tailwind classes, `useState` for UI state, `aria-label` for accessible button targeting in tests, `queryByText` for asserting element absence

**Tutorial 2: Add an About page with routing** — React Router v7 (`react-router` package):

- Step 1: Create the page component (`src/About.tsx`)
- Step 2: Write a unit test (`tests/unit/About.unit.test.tsx`)
- Step 3: Register the route in `src/App.tsx`
- Step 4: Write a routing integration test with `MemoryRouter` + `initialEntries`
- Step 5: Add navigation links with `<Link>` in both pages
- Step 6: Write an E2E test (`tests/e2e/about.spec.ts`) with Playwright
- "What you learned": Page layout consistency with Tailwind, React Router v7 route registration, `MemoryRouter` with `initialEntries` for test-time routing, `Link` for client-side navigation, Playwright E2E tests for cross-page flows

**Tutorial 3: Fetch data with React Query** — `@tanstack/react-query` already installed:

- Step 1: Add the `QueryClientProvider` in `src/main.tsx`
- Step 2: Create a custom data-fetching hook (`src/useUsers.ts`) with `useQuery`
- Step 3: Build the `UserList` component (`src/UserList.tsx`)
- Step 4: Test it — fresh `QueryClientProvider` per test with `retry: false`, mock `fetch` with `vi.fn()`, `waitFor` for async
- Step 5: Add a route and navigate to it
- "What you learned": Where to place `QueryClientProvider` relative to `ErrorBoundary`, separating fetch logic into a custom hook, the `useQuery` return shape, testing async components with `waitFor`, mocking `fetch` with `vi.fn()`, creating a fresh `QueryClient` per test

Each tutorial includes complete, copy-paste-ready code for every file (component, test, route registration) — not just snippets.

---

## Additional Features (Backlog)

- [ ] **Storybook** — Component dev environment for React
- [ ] **OpenAPI / zod-to-ts** — Schema-first API development for backend/fullstack
- [ ] **Bun as runtime** — Offer Bun as an alternative runtime, not just for Elysia
- [ ] **GitHub vs GitLab** — Affects CI/CD template choice
- [ ] **`pkg` or `ncc`** — Standalone binary distribution for CLI tools
- [ ] **Ink for `cli` mode** — Add a React-based Node.js TUI framework option alongside `commander`, `inquirer`, and `@clack/prompts`
- [ ] **Ink add-on toolkit** — Scaffold `@inkjs/ui` by default for Ink-based CLIs (inputs, select, spinner, progress, alerts), with `ink-markdown` and `ink-table` as optional specialized extras
- [ ] **Ink single-purpose addons** — Only evaluate `ink-text-input`, `ink-spinner`, and `ink-select-input` if a lighter alternative to `@inkjs/ui` is needed
- [ ] **`electron` desktop project type** — new type alongside `frontend`/`app` (Ledger-tools epic; needs a `ledger-live` discovery pass)
- [ ] **Tool-option alternatives** — `hk` vs husky (pre-commit hooks), `oxlint` / `oxfmt` vs ESLint/Prettier (Ledger-tools epic)

---

## Implementation Priority Order

1. [x] **Refactor architecture** — Split `index.js` into `prompts/` + `generators/` + `templates/` per type
2. [x] **Add `frontend` type** — React + Vite + Tailwind v4
3. [x] **Playwright E2E testing** — Optional addon for frontend/fullstack
4. [x] **Add `app` type** — React Native (Expo) + Detox
5. [x] **Add `npm-lib` type** — tsup + conditional semantic-release
6. [x] **Add `backend` type** — Hono/Fastify/Express/Elysia + Docker + Zod
7. [x] **Add `cli` type** — Commander/Inquirer/Clack + tsup + optional semantic-release
8. [x] **UX polish** — Spinner animation, back navigation, ASCII banner, README deep-dive
9. [x] **Database option** — Drizzle/Prisma/MongoDB/Redis for backend
10. [x] **Biome alternative** — ESLint+Prettier vs Biome choice
11. [x] **CI/CD pipeline option** — GitHub Actions, deploy workflows
12. [ ] **Add `fullstack` type** — pnpm monorepo with workspaces + changesets (next, depends on #10)
13. [ ] **Add `fullstack + app` type** — Extends fullstack with mobile workspace (depends on #12)
14. [ ] **`electron` type + tool-option alternatives** — Ledger-tools epic (deferred, needs `ledger-live` discovery)
