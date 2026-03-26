# tskickstart — Roadmap & TODO

## Current State Assessment

The current `tskickstart` is a **type-aware scaffolding CLI** (`@jeportie/create-tskickstart`) with a modular architecture. It supports a two-level prompt system that routes to type-specific generators. Implemented project types: `npm-lib`, `cli`, `backend`, `frontend`, and `app` (React Native). Features include a wizard-based prompt system with back navigation, animated spinner, comprehensive README generation, and optional tools per mode. 262 integration tests across 11 test files.

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
- [x] **Containerization:** `Dockerfile` + `docker-compose.yml` + `Makefile`

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

**ORM / driver combinations:**

| Choice | Packages | What gets scaffolded |
| --- | --- | --- |
| Drizzle + PostgreSQL | `drizzle-orm`, `drizzle-kit`, `pg` | `drizzle.config.ts`, `src/db/index.ts`, `src/db/schema.ts`, migrate script |
| Drizzle + MySQL | `drizzle-orm`, `drizzle-kit`, `mysql2` | Same as above with MySQL dialect |
| Drizzle + SQLite | `drizzle-orm`, `drizzle-kit`, `better-sqlite3` | Same as above with SQLite dialect |
| Prisma + PostgreSQL | `prisma`, `@prisma/client` | `prisma/schema.prisma`, `src/db/index.ts` (singleton), generate + migrate scripts |
| Prisma + MySQL | `prisma`, `@prisma/client` | Same as above with MySQL provider |
| Prisma + SQLite | `prisma`, `@prisma/client` | Same as above with SQLite provider |
| MongoDB | `mongoose` | `src/db/index.ts` (connection), `src/db/models/example.ts` |
| Redis | `ioredis` | `src/redis.ts` (connection helper) |

**All database choices also scaffold:**

- `.env.example` with connection string template
- Docker Compose service for the database (if Docker is enabled)
- Database section in generated README

**Prompt design:**

```
? Set up a database? (Y/n)
? Which database?
  ❯ PostgreSQL (Drizzle)
    PostgreSQL (Prisma)
    MySQL (Drizzle)
    MySQL (Prisma)
    SQLite (Drizzle)
    SQLite (Prisma)
    MongoDB (Mongoose)
? Set up Redis for caching? (Y/n)
```

**Files:**

- `src/prompts/database.js`
- `src/generators/database.js`
- `src/templates/database/drizzle/`, `prisma/`, `mongoose/`, `redis/`
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

## Additional Features (Backlog)

- [ ] **Vue 3 option** — Alternative to React for frontend mode
- [ ] **Storybook** — Component dev environment for React/Vue
- [ ] **OpenAPI / zod-to-ts** — Schema-first API development for backend/fullstack
- [ ] **Bun as runtime** — Offer Bun as an alternative runtime, not just for Elysia
- [ ] **GitHub vs GitLab** — Affects CI/CD template choice
- [ ] **`pkg` or `ncc`** — Standalone binary distribution for CLI tools

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
9. [ ] **Biome alternative** — ESLint+Prettier vs Biome choice (independent)
10. [ ] **Database option** — Drizzle/Prisma/MongoDB/Redis for backend (independent)
11. [ ] **CI/CD pipeline option** — GitHub Actions, deploy workflows (independent)
12. [ ] **Add `fullstack` type** — pnpm monorepo with workspaces + changesets (depends on #10)
13. [ ] **Add `fullstack + app` type** — Extends fullstack with mobile workspace (depends on #12)
