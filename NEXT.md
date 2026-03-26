# NEXT: tskickstart — Sprint 2

## Focus

Database support, fullstack types, CI/CD pipeline, and Biome linter alternative.

## Tasks

### Independent (can be parallelized)

- [ ] **Biome alternative** — Offer Biome as alternative to ESLint + Prettier for all project types. `biome.json` config, single dev dependency, updated scripts and lint-staged. New prompt in common questions: "Linter & formatter? ESLint + Prettier / Biome"
- [ ] **Database option (backend)** — Add database prompt to backend type. Drizzle (PostgreSQL/MySQL/SQLite), Prisma (PostgreSQL/MySQL/SQLite), MongoDB (Mongoose), Redis (ioredis). Scaffolds connection, schema/models, migrations, `.env.example`, Docker Compose services when Docker enabled.
- [ ] **CI/CD pipeline option** — Cross-cutting for all project types. GitHub Actions for PR checks, staging deploy on dev push, production deploy on main push. Mode-specific deploy targets: Railway/Fly.io (backend), Vercel/Netlify/GitHub Pages (frontend), EAS (app). Secrets documentation.

### Sequential (dependency chain)

- [ ] **Fullstack type** — pnpm monorepo: `apps/backend/` + `apps/frontend/` + `packages/shared/`. Reuses backend + frontend generators. Root configs, workspace scripts, Docker Compose for full dev env, changesets for versioning.
- [ ] **Fullstack + app type** — Extends fullstack with `apps/mobile/` workspace. Reuses app generator. Detox for mobile E2E, Playwright for web E2E, unified CI.

## Architecture notes

- Database module: backend-first design, extend to fullstack when that type ships.
- Biome: conditional generation in `common.js` generator — if Biome selected, skip all ESLint/Prettier config and deps.
- CI/CD: new `src/prompts/cicd.js` + `src/generators/cicd.js` + `src/templates/cicd/` directory.
- Fullstack depends on database module being done (database prompt reused inside fullstack flow).
- Fullstack + app depends on fullstack being done.
