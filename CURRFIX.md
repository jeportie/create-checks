# CURRFIX - Current Sprint Fix List

## Purpose

Track every issue you report from the current sprint before we mark Sprint 2 Phase 1 tasks as done.

## Status Rules

- `OPEN`: Reported, not started
- `IN_PROGRESS`: Currently being fixed
- `DONE`: Fixed and verified

All reported issues are now `DONE` and merged into `dev`.

## Reported Issues

- [x] CF-001 | PROMPTS | Enter/default behavior is inconsistent on confirm prompts; Enter should always resolve to Yes | STATUS=DONE | reported_by=user | GH=#8 | PR=#23 merged to dev
- [x] CF-002 | LINT | Generated `vitest.config.ts` uses `import { resolve } from 'path'`, causing Biome `useNodejsImportProtocol` noise in `npm run check` | STATUS=DONE | reported_by=user | GH=#9 | PR=#24 merged to dev
- [x] CF-003 | LINT | Define and enforce one shared Node built-in import convention across ESLint and Biome (including templates) | STATUS=DONE | reported_by=user | GH=#10 | PR=#25 merged to dev
- [x] CF-004 | DOCS/DB | README database section lacks actionable usage guidance (setup/connect/migrate/query workflow) | STATUS=DONE | reported_by=user | GH=#11 | PR=#26 merged to dev
- [x] CF-005 | DX/DB | Missing DB-focused Docker/Makefile workflows for daily usage (db-only up/down/logs/shell/migrate helpers) | STATUS=DONE | reported_by=user | GH=#12 | PR=#32 merged to dev
- [x] CF-006 | DB/STARTER | No end-to-end DB proof-of-work starter (model/schema + query path + route + test) for generated DB setups | STATUS=DONE | reported_by=user | GH=#13 | PR=#37 merged to dev
- [x] CF-007 | DX/DB | Missing engine/ORM-specific DB scripts for run/migrate/monitor/edit flows from the backend project | STATUS=DONE | reported_by=user | GH=#14 | PR=#31 merged to dev
- [x] CF-008 | PRODUCT/ARCH | Decision: DB is a backend capability (not a standalone project type); future fullstack must reuse the backend DB module | STATUS=DONE | reported_by=user | GH=#15 | PR=#34 merged to dev
- [x] CF-009 | PROMPTS/SECRETS | Add optional prompt-based secret capture and initial `.env*` file/bootstrap management generation | STATUS=DONE | reported_by=user | GH=#16 | PR=#35 merged to dev
- [x] CF-010 | PROMPTS/INTEGRATIONS | Add optional third-party service presets in wizard (example: Better Auth) with starter wiring | STATUS=DONE | reported_by=user | GH=#17 | PR=#36 merged to dev
- [x] CF-013 | DOCS/LINT | Scripts Reference docs are not linter-aware (`format`/`lint` descriptions always mention Prettier/ESLint even on Biome) | STATUS=DONE | reported_by=assistant | GH=#18 | PR=#28 merged to dev
- [x] CF-014 | DB/ENV | Selecting a database does not wire DB env vars into generated env config/validation (`DATABASE_URL`, etc.) | STATUS=DONE | reported_by=assistant | GH=#19 | PR=#29 merged to dev
- [x] CF-015 | REDIS/STARTER | `Set up Redis` only installs dependency; no redis bootstrap code, docker service, env contract, or docs | STATUS=DONE | reported_by=assistant | GH=#20 | PR=#30 merged to dev
- [x] CF-016 | DOCS/DOCKER | Backend README claims docker-compose hot-reload mount, but generated compose has no volume/hot-reload setup | STATUS=DONE | reported_by=assistant | GH=#21 | PR=#27 merged to dev
- [x] CF-017 | DB/TESTING | Generated project lacks DB-focused unit/integration test starter to prove DB connectivity and runtime readiness | STATUS=DONE | reported_by=user | GH=#22 | PR=#33 merged to dev

## Issue Entry Template

Use this line format for each new issue:

`- [ ] CF-00X | AREA | short description | STATUS=OPEN | reported_by=user | notes`

Example:

`- [ ] CF-001 | CICD | deploy workflow misses required secret docs | STATUS=OPEN | reported_by=user | discovered during staging run`
