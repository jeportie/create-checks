# Design Spec — `electron` project type + global `hk` & `oxlint`/`oxfmt` tool-options

- **Date**: 2026-08-10
- **Status**: Approved design → ready for implementation plan
- **Package**: `@jeportie/create-tskickstart`
- **Epic**: Phase F (Ledger tools) of the release-gating roadmap; follows v1.9.1
- **Branch**: `feat/electron-ledger-tools` (this spec); implementation via stacked branches (see §10)

## 1. Summary

Add three capabilities to the scaffolding CLI, grounded in a discovery pass over the local
`ledger-live` monorepo (`/Users/jerome.portier/src/tries/2026-04-08-LedgerHQ-ledger-live`):

1. **`oxlint` + `oxfmt`** as a third global **linter/formatter** option (alongside "ESLint + Prettier"
   and "Biome").
2. **`hk`** as a second global **pre-commit** option (alongside husky).
3. **`electron`** as a new **project type** (a minimal desktop starter on **electron-vite**).

The "Ledger tools" the user asked for are primarily the *tooling conventions* (`hk`, `oxlint`,
`oxfmt`, `mise`, commitlint) — not ledger-live-desktop's bespoke build internals. The electron type
therefore uses a modern, maintained foundation (electron-vite) and **layers the Ledger tooling on
top**, defaulting to it.

## 2. Grounding (discovery findings)

**From the `ledger-live` clone (ground truth):**
- `hk.pkl` is minimal: `pre-commit` runs `oxfmt` + `gitleaks`; `commit-msg` runs `commitlint`. No
  oxlint in the hook; no husky/lint-staged/lefthook anywhere. hk is pinned in `mise.toml`
  (`hk`, `pkl`, `gitleaks`) and installed via a `mise` `postinstall` hook (`hk install --mise`,
  CI-guarded).
- `oxlint@1.51` + `oxfmt@0.36` via the pnpm `catalog:`; per-package `.oxlintrc.json`
  (`categories: {correctness:error, suspicious:warn, pedantic:off}`, plugins
  `[eslint, import, oxc, unicorn, typescript]`) and root `.oxfmtrc.json`
  (`printWidth:100, trailingComma:"all", arrowParens:"avoid", sortPackageJson:false`).
- `commitlint`: `@commitlint/config-conventional` + `header-max-length:72`, `scope-empty:never`.
- `mise.toml`: node/pnpm/hk/pkl/gitleaks pinned; git hooks come only from hk (no husky).
- `ledger-live-desktop` is a hand-rolled **rspack** multi-compiler + `electron-builder`, electron 43 /
  React 19 / TS 6, with `nodeIntegration:true` + no `contextBridge` (flagged `FIXME` in their code).

**From current docs (Context7 MCP was unavailable this session; verified via web):**
- **electron-vite** — one `electron.vite.config.ts` with `main`/`preload`/`renderer` sections; default
  entries `src/main/index.ts`, `src/preload/index.ts`, renderer with `index.html`; preload exposes
  `window.api` via `contextBridge.exposeInMainWorld`. (electron-vite.org, npmjs.com/package/electron-vite)
- **hk** — a **Rust binary**, installed via **mise / Homebrew / Cargo / Aqua — not npm**.
  `hk generate --mise` writes a `mise.toml` that installs hk and defines the pre-commit task.
  (hk.jdx.dev)

**From the tskickstart codebase (extension points):**
- The linter choice is **binary** today: `src/prompts/common.js:8` collapses any non-`biome` `LINTER`
  to `eslint`. Adding oxlint requires a true 3-way parse and 3rd branches at ~15 consumption sites.
- Pre-commit is a **boolean** (`setupPrecommit`); adding hk requires a tri-state.
- Adding a project type touches ~10 files with established patterns (see §12).

## 3. Scope

**In scope**
- 3-way linter refactor + `oxlint`/`oxfmt` option (all types).
- Tri-state pre-commit refactor + `hk` option (all types), incl. the hk⇒mise coupling.
- `electron` project type on electron-vite (minimal, secure, React renderer).
- The `LINTER` binary-parse bug fix.
- Integration tests + e2e-matrix coverage for all three, with environmental guards.

**Out of scope (non-goals)**
- Reproducing ledger-live-desktop's rspack pipeline or its legacy security patterns.
- `gitleaks` (we keep tskickstart's existing `secretlint`).
- `fullstack` / `fullstack+app` types (separate roadmap item).
- Other tool-options (bun-runtime, storybook, etc.).
- Playwright/Detox for electron, and electron auto-update/native-module packaging.

## 4. Decisions (approved)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | Electron foundation | **electron-vite** + contextIsolation/contextBridge | Modern, maintained, secure; ledger-live's rspack build is bespoke + flagged-insecure |
| D2 | Tool-option scope | **Both global** (any type can pick oxlint or hk) | Matches the "hk vs husky / oxfmt vs oxlint" framing + ledger-live's repo-wide use |
| D3 | oxlint/oxfmt coexistence | **Standalone** (replace eslint+prettier), parallel to Biome | Clean scaffold; ledger-live keeps eslint 8 only transitionally |
| D4 | hk hook contents | **Parity with husky** (format + lint + typecheck; commit-msg: commitlint) | husky↔hk is a clean tool swap, not a behavior change |
| D5 | Secrets in hk hook | **secretlint** (existing option), not gitleaks | Reuse tskickstart's existing secret-scan option |
| D6 | hk install | **hk ⇒ mise** (mise.toml postinstall `hk install`, CI-guarded); hk is *not* an npm dep | hk is a binary, not on npm; mirrors ledger-live; avoids `npm install` failures |
| D7 | electron defaults | oxlint + hk + mise + React; `PKG_MANAGER` stays a wizard choice (npm default) | Mirror the Ledger stack while respecting the wizard |
| D8 | Versions | Pin to versions verified at implementation via the Tier-2 e2e gate; ledger-live's are the reference baseline | Avoid the CF-040..046 volatile-version breakage class |

## 5. Design

### 5.1 Linter: binary → three-way + `oxlint`/`oxfmt`

- **Parse fix** (`src/prompts/common.js:8`): `const v = process.env.LINTER; linter = ['biome','oxlint'].includes(v) ? v : 'eslint';`
- **Prompt** (`common.js` choices): add `{ name: 'oxlint + oxfmt (fast, Rust)', value: 'oxlint' }`.
- **Deps** (`install.js`): `else if (linter === 'oxlint') devDeps.push('oxlint', 'oxfmt')`. The cspell
  guard at line 75 becomes `linter === 'eslint'` only (oxlint has no ESLint host → standalone cspell,
  same as the biome path).
- **Scripts** (`scripts.js`): `lint: "oxlint ."`, `lint:fix: "oxlint . --fix"`, `format: "oxfmt ."`,
  `format:check: "oxfmt . --check"`. lint-staged (when husky+oxlint): `["oxfmt", "oxlint --fix"]`.
- **Generation** (`generators/common.js`, `frontend.js:41`, `app.js:57`): when `linter === 'oxlint'`,
  copy `.oxlintrc.json` + `.oxfmtrc.json`; skip `eslint.config.js`, `prettier.config.js`,
  `.prettierignore`.
- **Templates** (new): `src/templates/common/.oxlintrc.json` (modeled on ledger-live's `apps/cli`
  shape — `env:{node:true}`, `categories`, `plugins:[eslint,import,oxc,unicorn,typescript]`,
  `ignorePatterns:[node_modules,dist]`, a small `rules` set; a React-plugin variant for
  frontend/electron) and `src/templates/common/.oxfmtrc.json` (printWidth 100, trailingComma all,
  arrowParens avoid, sortPackageJson false).
- **README** (`readme.js` ~10 sites): oxlint/oxfmt tool labels, script tables, project-structure
  config filenames, tools list.

### 5.2 Pre-commit: boolean → tri-state + `hk`

- **State**: `setupPrecommit: boolean` → `precommit: 'husky' | 'hk' | 'none'`.
  `SETUP_PRECOMMIT` parsing: `husky` / `hk` / `0`→none; back-compat `1`→husky.
- **Prompt**: list — `Husky + lint-staged` (default) / `hk (Ledger-style, needs mise)` / `None`.
- **hk ⇒ mise (D6)**: selecting hk ensures a `mise.toml` exists pinning `hk` + `pkl` under `[tools]`
  and a `[hooks] postinstall` running `hk install` (guarded to skip when `CI` is set, like
  ledger-live). **No npm `prepare: hk install`** (would fail `npm install` where the hk binary is
  absent). hk is **not** pushed to npm devDeps.
- **Generator** (`generators/common.js:212-232`): branch — husky writes `.husky/` (current behavior)
  and `.husky/commit-msg` (template) + `prepare: "husky"`; hk writes `hk.pkl` and ensures `mise.toml`.
- **`hk.pkl` template** (new, `src/templates/common/hk.pkl`): `amends` the pinned hk release
  `Config.pkl`; `hooks { ["pre-commit"] { steps { format + lint (per chosen linter) + (secretlint if
  selected) } } ["commit-msg"] { steps { commitlint } } }`. Uses hk's `{{ files }}` / `check` / `fix`
  / `glob` / `stage` grammar. Parity with the husky hook (D4).
- **mise.toml template/generator** (new or extended): a base `mise.toml` pinning node (the `.nvmrc`
  version) + `hk` + `pkl`, `[hooks] postinstall`. Types that already emit mise (cli, backend) extend
  it; types that don't (frontend, npm-lib, app, electron) get it created when hk is chosen.
- **Scripts** (`scripts.js`): `prepare` set to `husky` only for husky; omitted for hk. lint-staged
  block skipped for hk (hk.pkl owns globbing).
- **README** (`readme.js` husky sites): hk wording, setup via `mise install`, structure tree
  (`hk.pkl` not `.husky/`), tools list.

### 5.3 `electron` project type (electron-vite)

- **Foundation**: electron-vite; **contextIsolation:true, nodeIntegration:false**;
  `contextBridge.exposeInMainWorld("api", …)` exposing a tiny demo (e.g. `versions`/`ping`).
- **Structure** (generated):
  ```
  src/main/index.ts        # app lifecycle + BrowserWindow (loads dev URL / built index.html)
  src/preload/index.ts     # contextBridge → window.api
  src/renderer/
    index.html
    src/main.tsx           # React 19 createRoot
    src/App.tsx
  electron.vite.config.ts  # main / preload / renderer sections
  electron-builder.yml      # appId + per-OS targets (dmg/AppImage/nsis)
  tsconfig.json (+ node/renderer split as electron-vite expects)
  ```
- **Scripts**: `dev: "electron-vite dev"`, `build: "electron-vite build"`,
  `preview: "electron-vite preview"`, `dist: "electron-builder"`, plus `typecheck`, `test` (vitest).
  `package.json` `main` → electron-vite's built main (`out/main/index.js`); add `electron` to the
  fallback-`main` whitelist in `scripts.js` so it does not inherit the generic `src/main.ts`.
- **Deps**: dev — `electron`, `electron-vite`, `electron-builder`, `vite`, `typescript`,
  `@types/react`, `@types/react-dom`; prod — `react`, `react-dom`.
- **Defaults (D7)**: the electron asker/generator sets `linter` default `oxlint`, `precommit` default
  `hk`, mise on, React renderer — while still honoring explicit env/prompt overrides.
- **Prompts** (`prompts/electron.js`, new): minimal (no required sub-choices in v1; return `{}` or a
  single confirm). Keep lean.
- **Common-generator guards** (`generators/common.js`): exclude `electron` from the generic
  `src/main.ts` + `test/main.test.ts` scaffolding and from any tsconfig that conflicts with
  electron-vite's.
- **README** (`readme.js`): electron branches — title, getting-started (`npm run dev`), build/dist,
  project structure, an electron implementation-workflow entry (replace the switch `default: ''`).

### 5.4 Bug fix

`src/prompts/common.js:8` — the binary `LINTER` parse (fixed in §5.1). Without it, `LINTER=oxlint`
silently degrades to eslint and the e2e "oxlint" runs would test the wrong linter.

## 6. Generated project shapes

**Electron (defaults: oxlint + hk + mise + React):**
```
my-app/
├─ electron.vite.config.ts · electron-builder.yml
├─ src/{main,preload,renderer}/…
├─ .oxlintrc.json · .oxfmtrc.json · hk.pkl · mise.toml
├─ commitlint.config.js · cspell.json · tsconfig*.json
└─ package.json
```
**Any existing type with oxlint chosen:** `.oxlintrc.json` + `.oxfmtrc.json` replace
`eslint.config.js`/`prettier.config.js`/`.prettierignore`.
**Any existing type with hk chosen:** `hk.pkl` + `mise.toml` (postinstall `hk install`) replace
`.husky/` + `prepare: husky`.

## 7. Testing strategy

- **Integration** (`tests/integration/`, `NO_INSTALL=1`):
  - `electron.int.test.js` — asserts `electron.vite.config.ts`, `src/main/index.ts`,
    `src/preload/index.ts` (contextBridge), `electron-builder.yml`, package scripts/deps.
  - `oxlint.int.test.js` (model `biome.int.test.js`) — `.oxlintrc.json` + `.oxfmtrc.json` exist, no
    `eslint.config.js`, scripts are oxlint/oxfmt.
  - hk assertions in `index.int.test.js` — `SETUP_PRECOMMIT=hk` → `hk.pkl` + `mise.toml` (pins hk),
    no `.husky/`, no `prepare: husky`; `=0` → none; `=1`/husky → husky.
- **e2e matrix** (`scripts/e2e/matrix.mjs`):
  - `linter` dim `+ oxlint`; `common-toggles.precommit` dim `+ hk`; new `electron` GROUP;
    `MANIFESTS.electron` (e.g. `electron.vite.config.ts`, `src/main/index.ts`); `VERIFY` combos
    (an electron+oxlint+hk combo, and oxlint on a non-electron type).
  - Fix `scripts/e2e/lib/steps.mjs:43` — the "a linter config exists" check hard-codes
    `eslint.config.js || biome.json`; add `.oxlintrc.json`.
- **Environmental guards** (Tier-2 verify, mirroring the elysia/prisma guards in `steps.mjs`):
  - **hk**: `npm install` must not fail — guaranteed because hk is not an npm dep and there is no
    `prepare: hk install`. Verify **asserts files only**; the hk hook install (mise) is not exercised.
  - **electron**: verify does install + `electron-vite build` (headless-safe bundling) + `typecheck`.
    Do **not** launch electron (needs a display) and **do not** run `electron-builder` (needs platform
    packaging/signing tooling). Add a guard so the electron combo runs build-not-dist.
  - **oxlint/oxfmt**: run as npm-distributed binaries; the Tier-2 gate catches any Node-20 breakage.

## 8. Risks & mitigations

- **Version volatility** (the CF-040..046 class): pin electron / electron-vite / react / oxlint /
  oxfmt conservatively and let the **Tier-2 verify gate** catch install/build breakage before release
  (D8). Do not chase latest majors blindly.
- **hk unavailable in CI/e2e**: by design, hk is installed only via `mise install` in the generated
  project (documented in its README); e2e asserts config files, never runs `hk install`.
- **electron in headless CI**: build-only in verify; never launch the app.
- **electron download weight**: keep a single curated electron verify combo; rely on the CI npm/electron cache.
- **Node 20 compatibility**: confirm oxlint/oxfmt/electron run on the scaffold's Node 20 target at
  implementation time (the verify gate is the proof).

## 9. Rollout / phasing

TDD (pair-programmer or the crew), each branch one concern, off `dev`, PR → **human merge** (agents
never merge `dev`/`main`). Suggested **three stacked PRs**, merged in dependency order:

1. `feat/oxlint-linter` — 3-way linter refactor + oxlint/oxfmt option + `LINTER` parse fix + tests +
   e2e (`linter` dim, `steps.mjs:43`).
2. `feat/hk-precommit` — tri-state pre-commit + hk option + hk⇒mise coupling + tests + e2e
   (`precommit` dim).
3. `feat/electron-type` — electron-vite type + Ledger-stack defaults + tests + e2e (electron GROUP).

Merge order matters: electron's defaults (D7) reference the oxlint + hk options, so it lands last.
After all three merge to `dev`, the `dev → main` release publishes a **minor** bump (`feat:`).
(This spec + the implementation plan live on `feat/electron-ledger-tools`; the plan step decides
whether to execute as one branch or the three above.)

## 10. Acceptance criteria

- `LINTER=oxlint PROJECT_TYPE=<t> NO_INSTALL=1` scaffolds `.oxlintrc.json` + `.oxfmtrc.json`, oxlint/
  oxfmt scripts, and no eslint/prettier files — for every type; `LINTER=oxlint` never degrades to
  eslint.
- `SETUP_PRECOMMIT=hk` scaffolds `hk.pkl` + a `mise.toml` that pins hk and installs it via
  postinstall, with no `.husky/` and no npm `prepare: hk install`; `husky`/`0` unchanged.
- `PROJECT_TYPE=electron` scaffolds a buildable electron-vite app (main/preload/renderer,
  contextIsolation on) defaulting to oxlint + hk + mise + React; `electron-vite build` succeeds in CI.
- All existing tests stay green; new integration tests + e2e dims/group pass; Tier-2 verify green for
  the new combos (with the documented guards).
- `npm run check` + `npm run e2e:gen` pass locally before each PR.

## 11. Edit map (key files)

- **oxlint/oxfmt**: `prompts/common.js` (parse+choices), `utils/install.js` (deps + cspell guard),
  `utils/scripts.js` (lint/format + lint-staged), `generators/common.js` + `generators/frontend.js` +
  `generators/app.js` (config copies), `utils/readme.js` (~10 sites), new
  `templates/common/.oxlintrc.json` + `.oxfmtrc.json`, `tests/integration/oxlint.int.test.js`,
  `scripts/e2e/matrix.mjs` + `scripts/e2e/lib/steps.mjs:43`.
- **hk**: `prompts/common.js` (tri-state), `generators/common.js:212-232` (branch + mise ensure),
  `utils/install.js` (no-npm-dep; mise pin), `utils/scripts.js` (prepare/lint-staged),
  `utils/readme.js` (husky sites), new `templates/common/hk.pkl` + mise template,
  `tests/integration/index.int.test.js`, `scripts/e2e/matrix.mjs` (precommit dim).
- **electron**: `prompts/project-type.js`, `index.js` (askers/labels/dispatch), new
  `prompts/electron.js` + `generators/electron.js` + `templates/electron/*`, `utils/install.js`,
  `utils/scripts.js` (+ fallback-main whitelist), `generators/common.js` (guards), `utils/readme.js`,
  `tests/integration/electron.int.test.js`, `scripts/e2e/matrix.mjs` (GROUP + MANIFEST + VERIFY).

## 12. Notes & deferred items

- Renderer uses **React 19** (current, matches ledger-live-desktop). tskickstart's `frontend` type is
  on React 18; aligning it is a separate, optional follow-up — **not** part of this epic.
- The hk pre-commit's `typecheck` step is a **project-level** step (a plain command, not file-globbed),
  since `tsc` is whole-project; hk supports non-glob steps for this.
- Offering `hk` without mise (brew/cargo/aqua) is **deferred** — mise is the one consistent install
  path and tskickstart already uses it for `cli`/`backend`.
