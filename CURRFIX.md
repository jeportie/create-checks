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
- [x] CF-018 | DX/DOCKER | Remove Makefile from generated backend projects and simplify docker npm scripts by dropping the docker-compose v1 fallback — use `docker compose` (v2) directly | STATUS=DONE | reported_by=user
- [x] CF-019 | DOCS | README.md still references Makefile in backend service description and project structure trees | STATUS=DONE | reported_by=assistant
- [x] CF-020 | DOCS | TODO.md still lists Makefile in backend containerization checkbox | STATUS=DONE | reported_by=assistant
- [x] CF-021 | DOCS | CONTRIBUTING.md is stale — rewrote to match current modular prompts/generators/templates structure | STATUS=DONE | reported_by=assistant
- [x] CF-022 | DOCS | NEXT.md acceptance criteria checkboxes for DB-01, BIOME-01, CICD-01, HOUSE-01 ticked | STATUS=DONE | reported_by=assistant
- [x] CF-023 | CICD | Deploy workflows were placeholder stubs — removed entirely (Option A: ship working CI only, defer deploy automation) | STATUS=DONE | reported_by=assistant
- [x] CF-024 | CICD | SECRETS.md was generic — removed entirely along with deploy stubs | STATUS=DONE | reported_by=assistant
- [x] CF-025 | CICD | Dead template files under src/templates/cicd/ deleted — workflows are generated inline | STATUS=DONE | reported_by=assistant
- [x] CF-026 | CICD | Version inconsistency fixed — all generated workflows now use actions/checkout@v4 + node 22 | STATUS=DONE | reported_by=assistant
- [x] CF-027 | CICD | npm-lib collision resolved — cicd.js skips ci.yml for npm-lib type (has its own PR workflow) | STATUS=DONE | reported_by=assistant
- [x] CF-028 | CICD | CI workflow now uses single `npm run check` step instead of individual lint/typecheck/test | STATUS=DONE | reported_by=assistant
- [x] CF-029 | DX/CICD | CI/CD test coverage expanded — 7 tests covering skip, frontend, npm-lib collision, versions, no deploy stubs | STATUS=DONE | reported_by=assistant
- [x] CF-030 | DX | Make sure all the CLI output stays in a width of size 80 | STATUS=DONE | reported_by=user | GH=#39 | PR=#46 merged to dev
- [x] CF-031 | LINT/FRONTEND | Biome errors in generated frontend templates: `src/main.tsx` uses non-null assertion (`document.getElementById('root')!`), `src/Welcome.tsx` button missing explicit `type` attribute | STATUS=DONE | reported_by=user | GH=#40 | PR=#50 merged to dev
- [x] CF-032 | DOCS/README | (For more details, check in TODO.md -> CF-032) Implementation Workflow and Tutorial sections are generic stubs — replace with rich, type-specific workflow steps and progressive tutorials for all 5 project types (frontend, backend, cli, npm-lib, app) | STATUS=DONE | reported_by=user | GH=#38 | PR=#38 merged to dev

- [x] CF-033 | LINT/BIOME | Add explicit ignore patterns (dist, node_modules, package-lock.json, coverage) to generated biome.json | STATUS=DONE | reported_by=user | GH=#41 | PR=#48 merged to dev
- [x] CF-034 | PROMPTS/SECRETS | Skip "Capture secrets?" prompt for project types that don't generate env vars (frontend, npm-lib) | STATUS=DONE | reported_by=user | GH=#42 | PR=#45 merged to dev
- [x] CF-035 | DOCS/RELEASE | Add NPM token and GitHub secret setup instructions in generated README for semantic-release projects | STATUS=DONE | reported_by=user | GH=#43 | PR=#47 merged to dev
- [x] CF-036 | DOCS/PACKAGE-MANAGER | Adapt generated README commands to match chosen package manager (pnpm vs npm) | STATUS=DONE | reported_by=user | GH=#44 | PR=#49 merged to dev
- [x] CF-037 | DX/CLI | Restore full branded `tskickstart` banner; keep 80-column rule for regular CLI output only | STATUS=DONE | reported_by=user | GH=#52 | PR=#54 merged to dev

## Issue Entry Template

Use this line format for each new issue:

`- [ ] CF-00X | AREA | short description | STATUS=OPEN | reported_by=user | notes`

Example:

`- [ ] CF-001 | CICD | deploy workflow misses required secret docs | STATUS=OPEN | reported_by=user | discovered during staging run`
