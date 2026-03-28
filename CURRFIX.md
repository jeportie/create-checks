# CURRFIX - Current Sprint Fix List

## Purpose

Track every issue you report from the current sprint before we mark Sprint 2 Phase 1 tasks as done.

## Status Rules

- `OPEN`: Reported, not started
- `IN_PROGRESS`: Currently being fixed
- `DONE`: Fixed and verified

When all reported issues are `DONE`, we will mark DB-01, BIOME-01, CICD-01, and HOUSE-01 as done in `TODO.md` and `NEXT.md`.

## Reported Issues

- [ ] CF-001 | PROMPTS | Enter/default behavior is inconsistent on confirm prompts; Enter should always resolve to No | STATUS=OPEN | reported_by=user | verified via prompt defaults: some confirms are `default: true` (e.g. backend/common/readme) while others are `default: false`
- [ ] CF-002 | LINT | Generated `vitest.config.ts` uses `import { resolve } from 'path'`, causing Biome `useNodejsImportProtocol` noise in `npm run check` | STATUS=OPEN | reported_by=user | reproduced in generated backend project; similar fix needed in both vitest templates (`native` and `coverage`)
- [ ] CF-003 | LINT | Define and enforce one shared Node built-in import convention across ESLint and Biome (including templates) | STATUS=OPEN | reported_by=user | currently Biome enforces `node:` protocol while ESLint path does not mirror that norm
- [ ] CF-004 | DOCS/DB | README database section lacks actionable usage guidance (setup/connect/migrate/query workflow) | STATUS=OPEN | reported_by=user | generated README currently only states engine + ORM with no practical DB commands
- [ ] CF-005 | DX/DB | Missing DB-focused Docker/Makefile workflows for daily usage (db-only up/down/logs/shell/migrate helpers) | STATUS=OPEN | reported_by=user | docker-compose includes a `db` service but generated scripts/Make targets expose only generic stack commands
- [ ] CF-006 | DB/STARTER | No end-to-end DB proof-of-work starter (model/schema + query path + route + test) for generated DB setups | STATUS=OPEN | reported_by=user | verified on generated backend+postgres+drizzle: `src/db/schema.ts` is placeholder and backend routes do not consume DB
- [ ] CF-007 | DX/DB | Missing engine/ORM-specific DB scripts for run/migrate/monitor/edit flows from the backend project | STATUS=OPEN | reported_by=user | `package.json` lacks scripts like `db:migrate`/`db:studio`/`db:shell`; only generic Docker scripts are generated
- [ ] CF-008 | PRODUCT/ARCH | Clarify DB product boundary: standalone DB scaffold vs DB coupled to backend only vs backend+fullstack modes | STATUS=OPEN | reported_by=user | needs explicit decision and prompt flow to avoid ambiguous DB onboarding strategy
- [ ] CF-009 | PROMPTS/SECRETS | Add optional prompt-based secret capture and initial `.env*` file/bootstrap management generation | STATUS=OPEN | reported_by=user | current prompts support feature toggles but not interactive secret entry or env-file policy setup
- [ ] CF-010 | PROMPTS/INTEGRATIONS | Add optional third-party service presets in wizard (example: Better Auth) with starter wiring | STATUS=OPEN | reported_by=user | currently no prompt path exists for auth/service integrations pre-install
- [ ] CF-013 | DOCS/LINT | Scripts Reference docs are not linter-aware (`format`/`lint` descriptions always mention Prettier/ESLint even on Biome) | STATUS=OPEN | reported_by=assistant | reproduced in generated backend+Biome README
- [ ] CF-014 | DB/ENV | Selecting a database does not wire DB env vars into generated env config/validation (`DATABASE_URL`, etc.) | STATUS=OPEN | reported_by=assistant | reproduced in backend+postgres+zod scaffold: `src/env.ts` validates only `NODE_ENV` and `PORT`
- [ ] CF-015 | REDIS/STARTER | `Set up Redis` only installs dependency; no redis bootstrap code, docker service, env contract, or docs | STATUS=OPEN | reported_by=assistant | reproduced in backend+redis scaffold: no redis references in generated `src/`
- [ ] CF-016 | DOCS/DOCKER | Backend README claims docker-compose hot-reload mount, but generated compose has no volume/hot-reload setup | STATUS=OPEN | reported_by=assistant | mismatch between README structure notes and `docker-compose.yml`
- [ ] CF-017 | DB/TESTING | Generated project lacks DB-focused unit/integration test starter to prove DB connectivity and runtime readiness | STATUS=OPEN | reported_by=user | add a baseline test that validates DB is reachable and basic query path works

## Issue Entry Template

Use this line format for each new issue:

`- [ ] CF-00X | AREA | short description | STATUS=OPEN | reported_by=user | notes`

Example:

`- [ ] CF-001 | CICD | deploy workflow misses required secret docs | STATUS=OPEN | reported_by=user | discovered during staging run`
