# tskickstart — Roadmap & TODO

## Current State Assessment

The current `tskickstart` is solid but **project-type agnostic** — it generates the same base
for everything. The goal is to make it a **type-aware scaffolding CLI** that adapts to the kind
of project the user is building.

---

## Architecture: Two-Level Prompt System

Replace the current flat question list with a **routing pattern**: first pick project type, then
ask type-specific questions.

```
Step 1: What are you building?
  ┌─ npm-lib     → Package/library published to npm
  ├─ cli         → Node.js CLI tool (may or may not publish to npm)
  ├─ backend     → Node.js API/server
  ├─ frontend    → Browser SPA/static site
  └─ fullstack   → Monorepo (frontend + backend)

Step 2: Type-specific questions (see per-type sections below)

Step 3: Common questions (always asked)
  - CSpell / Secretlint / Commitlint
  - Husky pre-commit hooks
  - Vitest setup
```

---

## Project Types

### 1. `npm-lib` — Library published to npm

**Unique tools to add:**
- [ ] **Build:** `tsup` — dual CJS/ESM output + declaration files in one command (winner for libraries)
- [ ] **Versioning:** `semantic-release` + `conventional-changelog-conventionalcommits`
- [ ] **Package manager choice:** `npm` (default) or `pnpm`
- [ ] **GitHub Actions:** PR checks + semantic-release + npm publish workflows

**tsconfig specifics:**
- `declaration: true`, `declarationMap: true`, `sourceMap: true`
- `exports` field in `package.json` with proper CJS/ESM paths

**Notes:** Closest to the current setup — mainly needs tsup + build pipeline + conditional
semantic-release.

---

### 2. `cli` — Node.js CLI tool

**Unique tools to add:**
- [ ] `commander` or `@clack/prompts` for argument parsing / interactive prompts
- [ ] `bin` field in `package.json`
- [ ] Shebang in entry file (`#!/usr/bin/env node`)
- [ ] Optional: `pkg` or `ncc` for standalone binary distribution
- [ ] Build: `tsup` with `--format cjs` only + `--shims` flag
- [ ] Semantic-release if publishing to npm, otherwise skip

---

### 3. `backend` — Node.js API/server

**Unique tools to add:**
- [ ] **Framework selection:**
  - `Hono` (recommended — TypeScript-first, ultrafast, platform-agnostic)
  - `Fastify` (production-proven, excellent performance)
  - `Express` (legacy/familiarity only)
- [ ] **Tool versioning:** `mise` (`.mise.toml` with node version pinned)
- [ ] **Dev server:** `tsx --watch` for hot reload
- [ ] **Env validation:** `zod` schema (`src/env.ts`) for type-safe environment variables
- [ ] **Containerization:** `Dockerfile` + `docker-compose.yml` for dev
- [ ] **Versioning:** NOT semantic-release (it's an app). Optional: `release-it` for changelog
- [ ] **CI:** PR checks + deploy workflow (Railway, Fly.io, or generic placeholder)

**package.json scripts:**
```json
{
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js"
}
```

---

### 4. `frontend` — Browser SPA

**Unique tools to add:**
- [ ] **Bundler:** Vite — always, no question
- [ ] **Framework:** React 18 (primary) or Vue 3 (offer as option)
- [ ] **CSS:** Tailwind v4 (Vite plugin = 2 lines of config), CSS Modules, or none
- [ ] **Routing:** React Router v7 (React) / Vue Router (Vue) — optional
- [ ] **Async state:** TanStack Query v5 — optional
- [ ] **Test environment:** `happy-dom` + Testing Library
- [ ] **Tool versioning:** `mise`
- [ ] **Versioning:** NOT semantic-release — conventional commits only or nothing
- [ ] **CI:** PR checks + deploy (Vercel, Netlify, or GitHub Pages)

**React-specific tsconfig:**
- `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.test.json`
- `"jsx": "react-jsx"`, `"lib": ["ES2022", "DOM", "DOM.Iterable"]`

---

### 5. `fullstack` — Monorepo

**Unique tools to add:**
- [ ] **Package manager:** `pnpm` as default (disk space, strict hoisting, better workspace support)
- [ ] **Workspace structure:** `backend/` + `frontend/` workspaces
- [ ] **Root scripts:** Delegate to workspaces via `--workspace` / `--filter`
- [ ] **mise:** Always include
- [ ] **Shared configs:** Root `tsconfig.base.json`, root `eslint.config.js`, shared `prettier.config`
- [ ] **Docker:** Dockerfile for backend + `docker-compose.yml` for full dev env
- [ ] **Versioning:** `changesets` (better than semantic-release for monorepos — per-package control)
- [ ] **CI:** Root PR check + separate deploy workflows per workspace

---

## Cross-Cutting Tool Decisions

| Decision | Recommendation | Rationale |
|---|---|---|
| Package manager (single) | npm (default) or pnpm | npm is universal; pnpm for perf |
| Package manager (monorepo) | pnpm strongly preferred | Disk space, strict hoisting |
| Library build | tsup | Dual CJS/ESM + DTS in one config |
| Backend framework | Hono | TS-first, platform-agnostic, fast |
| Frontend framework | React (primary), Vue (option) | Ecosystem size |
| CSS | Tailwind v4 | Vite plugin = 2 lines of config |
| Dev versioning (Node) | mise | Better than nvm/nvmrc |
| Versioning — npm packages | semantic-release | The right tool for this |
| Versioning — monorepo | changesets | Per-package, more control |
| Versioning — apps/websites | none or release-it | Apps don't need npm versioning |
| Containerization | Docker + compose | Standard, broadly supported |
| Env validation | zod (backend only) | Type-safe env at runtime |

---

## Code Architecture Refactor

Split `src/index.js` into a modular structure:

```
src/
  index.js                    # Entry: route to correct generator
  prompts/
    project-type.js           # First question: what are you building?
    common.js                 # Shared questions (lint, test, hooks)
    npm-lib.js
    cli.js
    backend.js
    frontend.js
    fullstack.js
  generators/
    common.js                 # Shared logic (scripts injection, lint setup)
    npm-lib.js
    cli.js
    backend.js
    frontend.js
    fullstack.js
  templates/
    common/                   # eslint, prettier, tsconfig.base, gitignore...
    npm-lib/
      tsup.config.ts
      tsconfig.json           # declaration=true variant
      .github/workflows/
        release.yml
        publish.yml
    cli/
      src/index.ts            # with shebang
    backend/
      hono/
        src/index.ts
        src/env.ts
      fastify/
      express/
      docker/
        Dockerfile
        docker-compose.yml
      mise/
        .mise.toml
    frontend/
      react/
        index.html
        src/main.tsx
        src/App.tsx
        vite.config.ts
      vue/
    fullstack/
      root/
        package.json          # workspace root template
      backend/
      frontend/
  utils/
    package-manager.js        # Abstracts npm/pnpm commands
    install.js                # Handles install with right PM
    file-system.js            # copy, skip-existing logic
    scripts.js                # package.json scripts injection
```

---

## GitHub Actions Strategy

| Project Type | Workflows to Generate |
|---|---|
| `npm-lib` / `cli` | `pull-request-checks.yml`, `semantic-release.yml` |
| `backend` | `pull-request-checks.yml`, `deploy.yml` (placeholder) |
| `frontend` | `pull-request-checks.yml`, `deploy.yml` (Vercel/Netlify/GH Pages) |
| `fullstack` | `pull-request-checks.yml`, `deploy-backend.yml`, `deploy-frontend.yml` |

---

## Things to Remove / Reconsider

- [ ] **Flat question list** — must become branching. Current list doesn't scale beyond 5 types.
- [ ] **Generic `src/main.ts` hello-world** — each type should get a relevant starter file
      (Hono app for backend, `App.tsx` for React, etc.)
- [ ] **No build step in templates** — libraries and backends need a build pipeline, not just tsc
- [ ] **Always-on semantic-release** — only relevant for `npm-lib` and `cli` types

---

## Additional Features (Not Yet Mentioned)

- [ ] **Changesets** — monorepo versioning alternative to semantic-release
- [ ] **Biome** — alternative to ESLint + Prettier combined (faster, simpler) — offer as option
- [ ] **Playwright** — E2E testing for frontend/fullstack projects
- [ ] **Storybook** — Component dev environment for React/Vue
- [ ] **OpenAPI / zod-to-ts** — Schema-first API development for backend/fullstack
- [ ] **Database options** — Drizzle or Prisma (optional, high complexity)
- [ ] **Bun as runtime** — Some users want Bun, not just as package manager
- [ ] **Deployment target prompt** — Railway, Fly.io, Vercel, Netlify (generate the right config)
- [ ] **GitHub vs GitLab** — Affects CI/CD template choice
- [ ] **DEV.md generation** — Auto-generate a developer guide per project type

---

## Implementation Priority Order

1. [ ] **Refactor architecture** — Split `index.js` into `prompts/` + `generators/` + `templates/` per type
2. [ ] **Add `npm-lib` type** — Closest to current; needs tsup + conditional semantic-release
3. [ ] **Add `frontend` type** — React + Vite is the highest demand
4. [ ] **Add `backend` type** — Hono + mise + Docker
5. [ ] **Add `fullstack` type** — Derive from existing `ts-fullstack-starter`
6. [ ] **Add `cli` type** — Variant of npm-lib with CLI specifics
