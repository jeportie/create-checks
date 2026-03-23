# tskickstart — Roadmap & TODO

## Current State Assessment

The current `tskickstart` is a **type-aware scaffolding CLI** (`@jeportie/create-tskickstart`) with a modular architecture. It supports a two-level prompt system that routes to type-specific generators. Currently implemented: base/common scaffolding and `frontend` project type (React + Vite + Tailwind v4) with optional Playwright E2E testing.

---

## Architecture: Two-Level Prompt System

Replace the current flat question list with a **routing pattern**: first pick project type, then ask type-specific questions.

```
Step 1: What are you building?
  ┌─ npm-lib     → Package/library published to npm
  ├─ cli         → Node.js CLI tool (may or may not publish to npm)
  ├─ backend     → Node.js API/server
  ├─ frontend    → Browser SPA/static site
  ├─ app         → Mobile application (React Native)
  ├─ fullstack   → Monorepo (frontend + backend)
  └─ fullstack + app → Monorepo (frontend + backend + mobile)

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

**Notes:** Closest to the current setup — mainly needs tsup + build pipeline + conditional semantic-release.

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

- [x] **Bundler:** Vite
- [x] **Framework:** React 18
- [x] **CSS:** Tailwind v4 (Vite plugin)
- [x] **Routing:** React Router v7
- [x] **Async state:** TanStack Query v5
- [x] **Test environment:** `happy-dom` + Testing Library
- [x] **Playwright E2E:** Optional addon
- [ ] **Vue 3 option** — offer as alternative to React
- [ ] **Tool versioning:** `mise`
- [ ] **Versioning:** NOT semantic-release — conventional commits only or nothing
- [ ] **CI:** PR checks + deploy (Vercel, Netlify, or GitHub Pages)

**React-specific tsconfig:**

- `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.test.json`
- `"jsx": "react-jsx"`, `"lib": ["ES2022", "DOM", "DOM.Iterable"]`

---

### 5. `app` — Mobile Application (React Native)

**Unique tools to add:**

- [ ] **Framework:** React Native (Expo managed workflow or bare)
- [ ] **Navigation:** React Navigation v7
- [ ] **State management:** TanStack Query v5 (same as frontend)
- [ ] **E2E testing:** Detox (replaces Playwright for mobile)
- [ ] **Unit testing:** Jest + React Native Testing Library
- [ ] **Build/deploy:** EAS Build + EAS Submit (Expo) or Fastlane (bare)
- [ ] **Tool versioning:** `mise` (node) + Xcode/Android SDK management
- [ ] **CI:** PR checks + EAS build workflow

**Template structure:**

```
src/templates/app/
  app.json                    # Expo config
  babel.config.js
  metro.config.js
  tsconfig.json
  src/
    App.tsx                   # Navigation container
    screens/
      HomeScreen.tsx
    components/
    navigation/
      index.tsx
  tests/
    setup.ts
    unit/
    e2e/
      .detoxrc.js
      firstTest.e2e.ts
```

**package.json scripts:**

```json
{
  "start": "expo start",
  "android": "expo run:android",
  "ios": "expo run:ios",
  "test": "jest",
  "test:e2e:build": "detox build --configuration ios.sim.debug",
  "test:e2e": "detox test --configuration ios.sim.debug"
}
```

**Implementation steps:**

1. Create `src/templates/app/` with all template files
2. Create `src/prompts/app.js` — Expo vs bare workflow prompt, navigation choice
3. Create `src/generators/app.js` — `generateApp(answers, cwd)`: copy templates, install deps
4. Wire into `src/index.js` orchestrator
5. Create `tests/integration/app.int.test.js`

---

### 6. `fullstack` — Monorepo

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

### 7. `fullstack + app` — Monorepo with Mobile

- [ ] Extends `fullstack` with an additional `mobile/` workspace
- [ ] Shared code packages (e.g., `packages/shared/` for types, utils)
- [ ] Detox for mobile E2E, Playwright for web E2E
- [ ] Unified CI pipeline across web + mobile

---

## Cross-Cutting Tool Decisions

| Decision                   | Recommendation                | Rationale                         |
| -------------------------- | ----------------------------- | --------------------------------- |
| Package manager (single)   | npm (default) or pnpm         | npm is universal; pnpm for perf   |
| Package manager (monorepo) | pnpm strongly preferred       | Disk space, strict hoisting       |
| Library build              | tsup                          | Dual CJS/ESM + DTS in one config  |
| Backend framework          | Hono                          | TS-first, platform-agnostic, fast |
| Frontend framework         | React (primary), Vue (option) | Ecosystem size                    |
| Mobile framework           | React Native (Expo)           | Code sharing with frontend        |
| CSS                        | Tailwind v4                   | Vite plugin = 2 lines of config   |
| Dev versioning (Node)      | mise                          | Better than nvm/nvmrc             |
| Versioning — npm packages  | semantic-release              | The right tool for this           |
| Versioning — monorepo      | changesets                    | Per-package, more control         |
| Versioning — apps/websites | none or release-it            | Apps don't need npm versioning    |
| Containerization           | Docker + compose              | Standard, broadly supported       |
| Env validation             | zod (backend only)            | Type-safe env at runtime          |
| Mobile E2E                 | Detox                         | Native testing, CI-friendly       |
| Web E2E                    | Playwright                    | Fast, reliable, multi-browser     |

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
    app.js
    fullstack.js
  generators/
    common.js                 # Shared logic (scripts injection, lint setup)
    npm-lib.js
    cli.js
    backend.js
    frontend.js
    app.js
    fullstack.js
    playwright.js             # E2E addon for frontend/fullstack
    detox.js                  # E2E addon for app
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
    app/
      expo/
        app.json
        src/App.tsx
        src/screens/
      bare/
    fullstack/
      root/
        package.json          # workspace root template
      backend/
      frontend/
    playwright/
      playwright.config.ts
      tests/e2e/
        example.spec.ts
  utils/
    prompt.js                 # Ctrl+C-safe inquirer wrapper
    spinner.js                # ASCII spinner helper
    file-system.js            # copyIfMissing, templatePath helpers
    install.js                # Dependency installation with NO_INSTALL support
    scripts.js                # package.json script/key ordering
    package-manager.js        # Abstracts npm/pnpm commands
```

---

## GitHub Actions Strategy

| Project Type      | Workflows to Generate                                                                   |
| ----------------- | --------------------------------------------------------------------------------------- |
| `npm-lib` / `cli` | `pull-request-checks.yml`, `semantic-release.yml`                                       |
| `backend`         | `pull-request-checks.yml`, `deploy.yml` (placeholder)                                   |
| `frontend`        | `pull-request-checks.yml`, `deploy.yml` (Vercel/Netlify/GH Pages)                       |
| `app`             | `pull-request-checks.yml`, `eas-build.yml`                                              |
| `fullstack`       | `pull-request-checks.yml`, `deploy-backend.yml`, `deploy-frontend.yml`                  |
| `fullstack + app` | `pull-request-checks.yml`, `deploy-backend.yml`, `deploy-frontend.yml`, `eas-build.yml` |

---

## Things to Remove / Reconsider

- [x] **Flat question list** — replaced with branching two-level prompt system
- [ ] **Generic `src/main.ts` hello-world** — each type should get a relevant starter file (Hono app for backend, `App.tsx` for React, etc.)
- [ ] **No build step in templates** — libraries and backends need a build pipeline, not just tsc
- [ ] **Always-on semantic-release** — only relevant for `npm-lib` and `cli` types

---

## Additional Features (Not Yet Mentioned)

- [ ] **Changesets** — monorepo versioning alternative to semantic-release
- [ ] **Biome** — alternative to ESLint + Prettier combined (faster, simpler) — offer as option
- [x] **Playwright** — E2E testing for frontend/fullstack projects
- [ ] **Detox** — E2E testing for React Native app projects
- [ ] **Storybook** — Component dev environment for React/Vue
- [ ] **OpenAPI / zod-to-ts** — Schema-first API development for backend/fullstack
- [ ] **Database options** — Drizzle or Prisma (optional, high complexity)
- [ ] **Bun as runtime** — Some users want Bun, not just as package manager
- [ ] **Deployment target prompt** — Railway, Fly.io, Vercel, Netlify (generate the right config)
- [ ] **GitHub vs GitLab** — Affects CI/CD template choice
- [ ] **DEV.md generation** — Auto-generate a developer guide per project type

---

## Implementation Priority Order

1. [x] **Refactor architecture** — Split `index.js` into `prompts/` + `generators/` + `templates/` per type
2. [x] **Add `frontend` type** — React + Vite + Tailwind v4
3. [x] **Playwright E2E testing** — Optional addon for frontend/fullstack
4. [ ] **Add `app` type** — React Native (Expo) + Detox
5. [ ] **Add `npm-lib` type** — Closest to current; needs tsup + conditional semantic-release
6. [ ] **Add `backend` type** — Hono + mise + Docker
7. [ ] **Add `fullstack` type** — Derive from existing `ts-fullstack-starter`
8. [ ] **Add `fullstack + app` type** — Extends fullstack with mobile workspace
9. [ ] **Add `cli` type** — Variant of npm-lib with CLI specifics
