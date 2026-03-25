# tskickstart — Roadmap & TODO

## Current State Assessment

The current `tskickstart` is a **type-aware scaffolding CLI** (`@jeportie/create-tskickstart`) with a modular architecture. It supports a two-level prompt system that routes to type-specific generators. Implemented project types: `npm-lib`, `cli`, `backend`, `frontend`, and `app` (React Native). Features include a wizard-based prompt system with back navigation, animated spinner, comprehensive README generation, and optional tools per mode.

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
  - CSpell / Secretlint / Commitlint
  - Husky pre-commit hooks
  - Vitest setup
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

## Upcoming Features

### CI/CD Pipeline Option (All Modes)

Add an optional CI/CD scaffold that generates a production-ready GitHub Actions pipeline with branch protection rules:

- [ ] **PR checks workflow** — Runs `npm run check` on every pull request (lint, typecheck, test)
- [ ] **Branch strategy enforcement** — Generate `.github/branch-protection.json` or setup instructions for:
  - `main` protected: only `dev` can merge via PR, requires passing checks
  - `dev` as integration branch: feature branches merge via PR, requires passing checks
  - Feature branches: `feature/*` → PR to `dev`
- [ ] **Deploy workflow** — Mode-specific deploy pipelines:
  - `backend`: Docker build + push + deploy placeholder (Railway, Fly.io)
  - `frontend`: Build + deploy (Vercel, Netlify, GitHub Pages)
  - `app`: EAS Build + EAS Submit
  - `npm-lib` / `cli`: Already handled by semantic-release workflow
- [ ] **Reusable workflow templates** — Shared `.github/workflows/` files:
  - `ci.yml` — Base check workflow (lint, typecheck, test)
  - `deploy-staging.yml` — Deploy to staging on `dev` push
  - `deploy-production.yml` — Deploy to production on `main` push
- [ ] **Docker registry integration** — Optional GitHub Container Registry (ghcr.io) push for backend/fullstack
- [ ] **Environment secrets setup guide** — Generate a `.github/SECRETS.md` explaining required secrets per workflow (NPM_TOKEN, DEPLOY_KEY, etc.)

**Prompt design:**

```
? Set up CI/CD pipeline? (Y/n)
? Which deployment target? (mode-specific choices)
  - backend: Railway / Fly.io / Docker registry / None
  - frontend: Vercel / Netlify / GitHub Pages / None
  - app: EAS / None
```

---

## Additional Features (Backlog)

- [ ] **Vue 3 option** — Alternative to React for frontend mode
- [ ] **Changesets** — Monorepo versioning alternative to semantic-release
- [ ] **Biome** — Alternative to ESLint + Prettier combined (faster, simpler) — offer as option
- [ ] **Storybook** — Component dev environment for React/Vue
- [ ] **OpenAPI / zod-to-ts** — Schema-first API development for backend/fullstack
- [ ] **Database options** — Drizzle or Prisma (optional, high complexity)
- [ ] **Bun as runtime** — Offer Bun as an alternative runtime, not just for Elysia
- [ ] **Deployment target prompt** — Railway, Fly.io, Vercel, Netlify (generate the right config)
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
9. [ ] **CI/CD pipeline option** — GitHub Actions, branch protection, deploy workflows
10. [ ] **Add `fullstack` type** — Monorepo with pnpm workspaces
11. [ ] **Add `fullstack + app` type** — Extends fullstack with mobile workspace
