# NEXT: tskickstart Feature Development (Prompt System + Frontend + Playwright)

## Context

tskickstart is a CLI scaffolding tool (`@jeportie/create-tskickstart`) that generates TypeScript project boilerplate. Currently it's a monolithic 499-line `src/index.js` that is project-type agnostic. The TODO.md outlines a vision to make it type-aware with a two-level prompt system and modular architecture. We're implementing three features: the prompt system refactoring, frontend starter (React+Vite+Tailwind), and Playwright E2E testing option.

## Git Workflow

```
main (versioned, production)
  └── dev (integration branch, created from main)
        ├── feature/prompt-system    → PR to dev (merge first - foundational)
        ├── feature/frontend-starter → PR to dev (merge second - depends on prompt-system)
        └── feature/playwright       → PR to dev (merge third - depends on prompt-system)
```

- **Step 1:** Create `dev` branch from `main`
- **Step 2:** Create 3 feature branches from `dev`
- **Step 3:** Develop each feature in parallel using git worktrees
- **Step 4:** Merge to `dev` in order: prompt-system → frontend-starter → playwright (rebase before each merge)
- **Step 5:** User merges `dev` → `main` when satisfied

## Agent Workflow

Each feature branch gets a **coding agent** (worktree-isolated). After coding:

- **Test agent** runs tests on each branch
- **Review agent** checks code quality, resolves merge conflicts, manages PRs to dev

---

## Feature 1: Prompt System Refactoring (`feature/prompt-system`)

**Goal:** Split the monolithic `src/index.js` into a modular architecture. All 37 existing tests must pass unchanged.

### New Directory Structure

```
src/
  index.js                    # Thin orchestrator (~40 lines)
  prompts/
    project-type.js           # "What are you building?" prompt
    common.js                 # Lint, vitest, precommit, author prompts
  generators/
    common.js                 # File copying, scaffolding, scripts
  templates/
    common/                   # All current templates moved here
  utils/
    prompt.js                 # Ctrl+C-safe inquirer wrapper
    spinner.js                # ASCII spinner helper
    file-system.js            # copyIfMissing, templatePath helpers
    install.js                # Dependency installation with NO_INSTALL support
    scripts.js                # package.json script/key ordering
```

### Steps

1. **Create `src/utils/prompt.js`** — Extract the `prompt()` wrapper (lines 18-28 of current index.js)
2. **Create `src/utils/spinner.js`** — Extract `startSpinner()` (lines 156-167)
3. **Create `src/utils/file-system.js`** — Create `templatePath(category, filename)` and `copyIfMissing(src, dest, label)` helpers. Use `import.meta.url` relative resolution to find `src/templates/<category>/`
4. **Create `src/utils/install.js`** — Extract dependency installation logic (lines 171-213). Accept an `answers` object + optional extra deps array. Respect `NO_INSTALL` env var
5. **Create `src/utils/scripts.js`** — Extract script building, lint-staged config, and key ordering (lines 393-496) as pure functions
6. **Move `src/templates/*` → `src/templates/common/`** — All existing template files
7. **Create `src/prompts/project-type.js`** — New prompt: "What are you building?" with choices (npm-lib, cli, backend, frontend, fullstack). Env var bypass: `PROJECT_TYPE`. Non-TTY default: `undefined` (means generic/current behavior)
8. **Create `src/prompts/common.js`** — Extract all current prompts (lines 33-134) into `askCommonQuestions()`. Returns `{ lintOption, vitestPreset, setupPrecommit, authorName }`
9. **Create `src/generators/common.js`** — Extract all generation logic (lines 136-496). Accept `(answers, cwd)`. Add `projectType` awareness: when `projectType === 'frontend'`, skip creating `src/main.ts`, `test/main.test.ts`, common `tsconfig.json`, `tsconfig.base.json`, `vitest.config.ts`, and `eslint.config.js` (frontend provides its own)
10. **Rewrite `src/index.js`** as thin orchestrator:
    - Call `askProjectType()` → conditional type-specific prompts → `askCommonQuestions()`
    - Call `generateCommon(answers, cwd)` → conditional type-specific generators
    - Dynamic imports for type-specific modules

### Key Contract: Answers Object

```js
{
  projectType,      // string | undefined ('frontend', 'npm-lib', etc.)
  lintOption,       // string[] (['cspell', 'secretlint', 'commitlint'])
  vitestPreset,     // string | undefined ('native', 'coverage')
  setupPrecommit,   // boolean
  authorName,       // string
  setupPlaywright,  // boolean (added by playwright feature)
}
```

### Backward Compatibility

- Non-TTY + no `PROJECT_TYPE` env → `projectType` is `undefined` → only `generateCommon()` runs → identical to current behavior
- All env var bypasses preserved: `NO_INSTALL`, `VITEST_PRESET`, `AUTHOR_NAME`
- New env var: `PROJECT_TYPE` for test control

---

## Feature 2: Frontend Starter (`feature/frontend-starter`)

**Goal:** When user selects "frontend" project type, scaffold a React + Vite + Tailwind CSS v4 project. Hardcoded: React + Vite + Tailwind v4 (no framework choice prompts). Copy structure from reference project at `/Users/jeromevdb/src/tries/2026-02-12-jeportie-ts-fullstack-starter/frontend`.

### Template Files to Create: `src/templates/frontend/`

```
src/templates/frontend/
  index.html
  vite.config.ts
  vitest.config.ts              # happy-dom, react plugin, testing-library setup
  tsconfig.json                 # references architecture
  tsconfig.app.json             # ES2020, react-jsx
  tsconfig.node.json            # ES2022, for config files
  tsconfig.test.json            # extends app, adds vitest/globals
  eslint.config.js              # react-hooks, react-refresh plugins
  src/
    main.tsx
    App.tsx                     # React Router with routes
    Welcome.tsx                 # Landing page with Tailwind styling
    index.css                   # @import 'tailwindcss'
    vite-env.d.ts
    assets/
      react.svg
      tailwind.svg
      vite.svg
  __tests__/
    setup.ts                    # @testing-library/jest-dom/vitest
    unit/App.unit.test.tsx
    integration/App.int.test.tsx
```

All files copied exactly from the reference project.

### Steps

1. **Create all template files** in `src/templates/frontend/` — copy from reference project
2. **Create `src/prompts/frontend.js`** — Placeholder module (no additional prompts for now, React+Vite+Tailwind always included). Returns `{}`
3. **Create `src/generators/frontend.js`** — `generateFrontend(answers, cwd)`:
   - Copy all frontend template files to target project
   - Use `copyIfMissing` for config files, `ensureDir` + copy for src/ and **tests**/
   - Frontend overrides common files: eslint.config.js, vitest.config.ts, tsconfig.json (these are skipped by common generator when `projectType === 'frontend'`)
   - Common generator still handles: `.editorconfig`, `.gitignore`, `.prettierignore`, `.eslintignore`, `prettier.config.js`, `.secretlintrc.json`, `cspell.json`, `commitlint.config.js`, `.husky/*`
4. **Wire into `src/index.js`** orchestrator with dynamic import
5. **Update dependency installation** — frontend needs:
   - Production: `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `react-error-boundary`, `tailwindcss`, `@tailwindcss/vite`
   - Dev: `vite`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@testing-library/dom`, `happy-dom`, `vite-tsconfig-paths`, `@types/react`, `@types/react-dom`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`
6. **Update package.json scripts** for frontend: add `dev` (vite), `build` (tsc -b && vite build), `preview` (vite preview). Override `main` to not be `src/main.ts`

### Tests

Create `__tests__/integration/frontend.int.test.js` (~15 tests):

- Set `PROJECT_TYPE=frontend`, `NO_INSTALL=1`
- Verify all frontend files created (index.html, vite.config.ts, src/main.tsx, src/App.tsx, src/Welcome.tsx, etc.)
- Verify common-only files NOT created (src/main.ts, common tsconfig.json)
- Verify common shared files still present (.editorconfig, .gitignore, prettier.config.js)
- Verify frontend-specific eslint config
- Verify frontend scripts in package.json

---

## Feature 3: Playwright Option (`feature/playwright`)

**Goal:** Add Playwright E2E testing as an optional addon for frontend (and future fullstack) projects.

### Template Files: `src/templates/playwright/`

```
src/templates/playwright/
  playwright.config.ts          # Standard config with webServer, 3 browser projects
  e2e/
    example.spec.ts             # Basic smoke tests (has title, welcome page loads)
```

### Steps

1. **Create template files** in `src/templates/playwright/`
2. **Create `src/prompts/playwright.js`** — `askPlaywrightQuestion()`: confirm prompt "Set up Playwright for E2E testing?". Env var bypass: `PLAYWRIGHT=1|0`. Non-TTY default: false. Only shown when `projectType === 'frontend'` or `'fullstack'`
3. **Create `src/generators/playwright.js`** — `generatePlaywright(answers, cwd)`:
   - Copy `playwright.config.ts` to project root
   - Create `e2e/` directory with `example.spec.ts`
   - Install `@playwright/test` as dev dep
   - Add scripts: `test:e2e` (`npx playwright test`), `test:e2e:ui` (`npx playwright test --ui`)
   - Append `playwright-report/` and `test-results/` to `.gitignore`
4. **Wire into `src/index.js`** — conditional prompt + generator after frontend/fullstack

### Tests

Create `__tests__/integration/playwright.int.test.js` (~8 tests):

- Set `PROJECT_TYPE=frontend`, `PLAYWRIGHT=1`, `NO_INSTALL=1`
- Verify `playwright.config.ts` created
- Verify `e2e/example.spec.ts` created
- Verify scripts in package.json
- Verify NOT set up when `PLAYWRIGHT=0`
- Verify NOT set up by default (non-TTY)

---

## Merge Strategy

| Phase | Action | Prerequisite |
| --- | --- | --- |
| 1 | Merge `feature/prompt-system` → `dev` | All 37 original tests pass |
| 2 | Rebase `feature/frontend-starter` onto `dev`, resolve conflicts in `src/index.js`, merge → `dev` | Phase 1 complete, frontend tests pass |
| 3 | Rebase `feature/playwright` onto `dev`, resolve conflicts, merge → `dev` | Phase 2 complete, playwright tests pass |
| 4 | User merges `dev` → `main` | All tests pass on dev |

Conflict resolution: auto-resolve + confirm with user before committing.

---

## Critical Files

| File | Role |
| --- | --- |
| `src/index.js` | Current monolith (499 lines) → becomes thin orchestrator |
| `__tests__/integration/index.int.test.js` | 37 existing tests — must not break |
| `TODO.md` | Architecture vision reference |
| Reference: `/Users/jeromevdb/src/tries/2026-02-12-jeportie-ts-fullstack-starter/frontend/` | Full frontend project to replicate |

---

## Verification

1. **After prompt-system:** `npm test` — all 37 original integration tests pass
2. **After frontend-starter:** Run CLI with `PROJECT_TYPE=frontend NO_INSTALL=1 node src/index.js` in temp dir, verify file tree matches expected structure
3. **After playwright:** Run CLI with `PROJECT_TYPE=frontend PLAYWRIGHT=1 NO_INSTALL=1 node src/index.js`, verify Playwright files generated
4. **On dev branch:** Full test suite (original + frontend + playwright tests) all pass
