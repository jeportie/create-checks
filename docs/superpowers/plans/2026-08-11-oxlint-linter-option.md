# oxlint + oxfmt Linter Option — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `oxlint` + `oxfmt` as a third, standalone linter/formatter option in the tskickstart
wizard (alongside "ESLint + Prettier" and "Biome"), selectable for every project type.

**Architecture:** Refactor the currently *binary* linter choice (`eslint | biome`) into a true
three-way (`eslint | biome | oxlint`). `oxlint` is standalone — exactly parallel to the Biome branch:
it *replaces* eslint + prettier (no coexistence). Generation, deps, scripts, README, and the e2e
matrix each gain a third branch.

**Tech Stack:** Node 20 (ESM), oxlint (Rust linter, npm-distributed binary), oxfmt (Rust formatter),
Vitest integration tests, the `scripts/e2e` matrix runner.

**Spec:** `docs/superpowers/specs/2026-08-10-electron-ledger-tools-design.md` §5.1, §5.4.

## Global Constraints

- **Standalone**: when `linter === 'oxlint'`, generate `.oxlintrc.json` + `.oxfmtrc.json` and **skip**
  `eslint.config.js`, `prettier.config.js`, `.prettierignore` (mirror the Biome branch).
- **Parse**: `LINTER` env must resolve `eslint | biome | oxlint`; any other value → `eslint`. Never let
  `LINTER=oxlint` silently degrade to eslint (that would make the e2e "oxlint" runs test eslint).
- **Versions**: pin `oxlint@^1.51.0`, `oxfmt@^0.36.0` (ledger-live's proven baseline). The Tier-2 e2e
  verify combo is the gate; bump only if it stays green.
- **cspell + oxlint**: oxlint has no ESLint host, so do **not** add `@cspell/eslint-plugin`; cspell runs
  standalone (same as the Biome path).
- **Commits**: Conventional Commits, scope from {prompts, generators, templates, utils, e2e, test}.
  **Never** add `Co-Authored-By` or AI-attribution lines. Never edit `package.json` `version`.
- **Repo gates**: new vocabulary (`oxlint`, `oxfmt`, `oxc`, `oxlintrc`, `oxfmtrc`) must be added to the
  repo's own `cspell.json` (it also spell-checks commit messages). Reproduce with `npm run check` +
  `npm run e2e:gen` before the PR.
- **Branch/flow**: work on `feat/oxlint-linter` off `dev`; open a PR to `dev` and STOP (a human merges).

---

### Task 1: oxlint config generation (parse + choice + generation + templates)

Enable `LINTER=oxlint` end-to-end for config-file generation: the wizard accepts it, the generator
writes oxlint's config files and skips the eslint/prettier ones, and dev-deps include oxlint/oxfmt.

**Files:**
- Modify: `src/prompts/common.js:8-23` (parse + choice)
- Modify: `src/utils/install.js:55-79` (dep branch + cspell guard)
- Modify: `src/generators/common.js:123-135, 196-202` (config-copy branches)
- Modify: `src/generators/frontend.js:41`, `src/generators/app.js:57` (eslint-copy guard)
- Create: `src/templates/common/.oxlintrc.json`
- Create: `src/templates/common/.oxfmtrc.json`
- Test: `tests/integration/oxlint.int.test.js` (new)

**Interfaces:**
- Consumes: the env-var-driven CLI (`PROJECT_TYPE`, `LINTER`, `LINT_OPTIONS`, `NO_INSTALL=1`) exactly as
  `tests/integration/biome.int.test.js` drives it.
- Produces: `answers.linter === 'oxlint'` as a first-class value consumed by Tasks 2–4; generated
  files `.oxlintrc.json` + `.oxfmtrc.json`.

- [ ] **Step 1: Write the failing test** — `tests/integration/oxlint.int.test.js`

```js
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject() {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-oxlint-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-oxlint', version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', PROJECT_TYPE: 'backend', BACKEND_FRAMEWORK: 'hono', ...extraEnv },
    stdio: 'pipe',
  });
}

describe('oxlint option', () => {
  let tmpDir;
  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates oxlint + oxfmt config and skips eslint/prettier config files', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'oxlint' });

    expect(existsSync(join(tmpDir, '.oxlintrc.json'))).toBe(true);
    expect(existsSync(join(tmpDir, '.oxfmtrc.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(false);
    expect(existsSync(join(tmpDir, 'prettier.config.js'))).toBe(false);
    expect(existsSync(join(tmpDir, '.prettierignore'))).toBe(false);
  });

  it('writes a valid oxlint config with the expected categories', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'oxlint' });

    const cfg = JSON.parse(readFileSync(join(tmpDir, '.oxlintrc.json'), 'utf-8'));
    expect(cfg.categories.correctness).toBe('error');
    expect(Array.isArray(cfg.plugins)).toBe(true);
  });

  it('keeps cspell standalone when oxlint is selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'oxlint', LINT_OPTIONS: 'cspell' });

    expect(existsSync(join(tmpDir, 'cspell.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/oxlint.int.test.js`
Expected: FAIL — `.oxlintrc.json` not generated (LINTER=oxlint currently resolves to eslint, so
`eslint.config.js` is written instead).

- [ ] **Step 3: Fix the linter parse + add the wizard choice** — `src/prompts/common.js`

Replace line 8:
```js
let linter = process.env.LINTER === 'biome' ? 'biome' : 'eslint';
```
with:
```js
let linter = ['biome', 'oxlint'].includes(process.env.LINTER) ? process.env.LINTER : 'eslint';
```
And add the choice inside the `choices` array (after the Biome line, ~line 17):
```js
          { name: 'Biome', value: 'biome' },
          { name: 'oxlint + oxfmt (fast, Rust)', value: 'oxlint' },
```

- [ ] **Step 4: Add the oxlint dep branch + fix the cspell guard** — `src/utils/install.js`

Replace the linter block (lines 55-68) with a three-way:
```js
  if (linter === 'biome') {
    devDeps.push('@biomejs/biome');
  } else if (linter === 'oxlint') {
    devDeps.push('oxlint@^1.51.0', 'oxfmt@^0.36.0');
  } else {
    devDeps.push(
      'eslint@^9',
      '@eslint/js@^9',
      'prettier',
      'eslint-config-prettier@^9.1.0',
      'typescript-eslint',
      '@stylistic/eslint-plugin',
      'eslint-plugin-import',
      'eslint-import-resolver-typescript',
    );
  }
```
Change the cspell-plugin guard (line 75) from `if (linter !== 'biome')` to eslint-only:
```js
  if (lintOption.includes('cspell')) {
    if (linter === 'eslint') {
      devDeps.push('@cspell/eslint-plugin');
    }
    devDeps.push('cspell@^8');
  }
```

- [ ] **Step 5: Create the oxlint config template** — `src/templates/common/.oxlintrc.json`

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "env": { "node": true, "browser": true },
  "plugins": ["eslint", "typescript", "import", "unicorn", "oxc", "react", "jsx-a11y"],
  "categories": { "correctness": "error", "suspicious": "warn", "pedantic": "off" },
  "ignorePatterns": ["node_modules", "dist", "coverage"],
  "rules": {
    "eslint/no-unused-vars": "warn",
    "eslint/no-empty-pattern": "warn",
    "import/no-duplicates": "error",
    "typescript/no-explicit-any": "warn"
  }
}
```

- [ ] **Step 6: Create the oxfmt config template** — `src/templates/common/.oxfmtrc.json`

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 100,
  "trailingComma": "all",
  "arrowParens": "avoid",
  "sortPackageJson": false,
  "ignorePatterns": ["**/*.md", "**/*.json"]
}
```

- [ ] **Step 7: Branch the config copies in the generator** — `src/generators/common.js`

Replace the biome/else block (lines 123-129) with a three-way:
```js
  if (linter === 'biome') {
    await fs.copyFile(templatePath('common', 'biome.json'), path.join(cwd, 'biome.json'));
    console.log(pc.green('✔') + '    biome.json');
  } else if (linter === 'oxlint') {
    await fs.copyFile(templatePath('common', '.oxlintrc.json'), path.join(cwd, '.oxlintrc.json'));
    await fs.copyFile(templatePath('common', '.oxfmtrc.json'), path.join(cwd, '.oxfmtrc.json'));
    console.log(pc.green('✔') + '    .oxlintrc.json + .oxfmtrc.json');
  } else {
    await fs.copyFile(templatePath('common', 'prettier.config.js'), path.join(cwd, 'prettier.config.js'));
    console.log(pc.green('✔') + '    prettier.config.js');
  }
```
Change the eslint-config guard (line 131) so only the eslint linter gets `eslint.config.js`:
```js
  if (!isFrontend && !isApp && linter === 'eslint') {
```
Change the `.prettierignore` guard (line 196) likewise:
```js
  if (linter === 'eslint') {
```

- [ ] **Step 8: Fix the frontend + app eslint-copy guards**

`src/generators/frontend.js:41` — change `if (answers.linter !== 'biome')` to:
```js
  if (answers.linter === 'eslint') {
    await copyFrontendFile('eslint.config.js', cwd);
  }
```
`src/generators/app.js:57` — change `if (answers.linter !== 'biome')` to:
```js
  if (answers.linter === 'eslint') {
    await copyAppFile('eslint.config.js', cwd, { overwrite: true });
  }
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run tests/integration/oxlint.int.test.js`
Expected: PASS (3 tests).

- [ ] **Step 10: Commit**

```bash
git add src/prompts/common.js src/utils/install.js src/generators/common.js \
  src/generators/frontend.js src/generators/app.js \
  src/templates/common/.oxlintrc.json src/templates/common/.oxfmtrc.json \
  tests/integration/oxlint.int.test.js
git commit -m "feat(prompts): add oxlint + oxfmt as a third standalone linter option"
```

---

### Task 2: oxlint scripts

Generated `package.json` gets oxlint/oxfmt `lint` + `format` scripts (and the lint-staged else-branch
already covers oxlint via `npm run format`/`npm run lint`).

**Files:**
- Modify: `src/utils/scripts.js:94-95`
- Test: `tests/integration/oxlint.int.test.js`

**Interfaces:**
- Consumes: `answers.linter === 'oxlint'` (Task 1).
- Produces: `pkg.scripts.lint === 'oxlint .'`, `pkg.scripts.format === 'oxfmt .'`.

- [ ] **Step 1: Add the failing test** (append inside the describe block)

```js
  it('uses oxlint/oxfmt scripts and the format+lint lint-staged commands', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'oxlint', VITEST_PRESET: 'native' });

    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.lint).toBe('oxlint .');
    expect(pkg.scripts.format).toBe('oxfmt .');
    expect(pkg['lint-staged']['**/*']).toEqual(expect.arrayContaining(['npm run format', 'npm run lint']));
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/integration/oxlint.int.test.js -t "uses oxlint"`
Expected: FAIL — `pkg.scripts.lint` is `eslint .` (the else branch).

- [ ] **Step 3: Add oxlint to the format/lint scripts** — `src/utils/scripts.js:94-95`

```js
    format:
      linter === 'biome' ? 'biome format --write .' : linter === 'oxlint' ? 'oxfmt .' : 'prettier . --write',
    lint: linter === 'biome' ? 'biome check .' : linter === 'oxlint' ? 'oxlint .' : 'eslint .',
```
(No change needed to the lint-staged block at line 223: its `else` branch —
`['npm run format', 'npm run lint']` — already applies to oxlint.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/integration/oxlint.int.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/scripts.js tests/integration/oxlint.int.test.js
git commit -m "feat(utils): generate oxlint/oxfmt lint and format scripts"
```

---

### Task 3: README oxlint branches

The generated README describes the chosen linter in ~10 places, each a
`linter === 'biome' ? … : …` ternary/if that currently falls back to ESLint/Prettier. Extend each to a
three-way including oxlint.

**Files:**
- Modify: `src/utils/readme.js` — sites at lines ~197, 654-655, 762, 786-787, 868-872, 1232, 1614,
  2258-2262, 4202-4203 (tool labels, script tables, project-structure config filenames, tools list).
- Test: `tests/integration/oxlint.int.test.js`

**Interfaces:**
- Consumes: `answers.linter === 'oxlint'`.
- Produces: README text naming oxlint/oxfmt (never eslint/prettier) for an oxlint project.

- [ ] **Step 1: Add the failing test**

```js
  it('describes oxlint/oxfmt in the generated README', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'oxlint' });

    const readme = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(readme).toMatch(/oxlint/i);
    expect(readme).toMatch(/oxfmt/i);
    expect(readme).not.toMatch(/ESLint|Prettier/);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/integration/oxlint.int.test.js -t "README"`
Expected: FAIL — README still says "ESLint v9 + Prettier".

- [ ] **Step 3: Extend each linter ternary to a three-way.** The transformation is identical at every
site — add an `oxlint` arm. Two concrete examples:

Tools list (lines 2258-2262):
```js
  if (answers.linter === 'biome') {
    tools.push('- **Biome** — linting and formatting');
  } else if (answers.linter === 'oxlint') {
    tools.push('- **oxlint + oxfmt** — fast Rust-based linting and formatting');
  } else {
    tools.push('- **ESLint** v9 + **Prettier** — code quality and formatting');
  }
```
Scripts table (lines 4202-4203):
```js
  const fmtTool = linter === 'biome' ? 'Biome' : linter === 'oxlint' ? 'oxfmt' : 'Prettier';
  const lintTool = linter === 'biome' ? 'Biome' : linter === 'oxlint' ? 'oxlint' : 'ESLint';
  rows.push(`| \`npm run format\` | Format code with ${fmtTool} |`);
  rows.push(`| \`npm run lint\` | Lint with ${lintTool} |`);
```
Apply the same `linter === 'oxlint'` arm at every remaining site listed in **Files** (each is a
`biome ? … : …` for a tool name, a config filename like `.oxlintrc.json`/`.oxfmtrc.json` in the
project-structure tree, or a scripts label). Grep to confirm none are missed:
`grep -n "linter === 'biome'\|=== 'biome'" src/utils/readme.js`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/integration/oxlint.int.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/readme.js tests/integration/oxlint.int.test.js
git commit -m "feat(utils): describe oxlint/oxfmt in generated README"
```

---

### Task 4: e2e matrix coverage (oxlint dimension + linter-exists fix + verify combo)

Add oxlint to the Tier-1 linter dimension and the Tier-2 curated verify set, and teach the manifest
check that `.oxlintrc.json` counts as a linter config. This task also validates the Task-1 dep pins
via a real install.

**Files:**
- Modify: `scripts/e2e/matrix.mjs:13` (linter dim), `:183` (LINTER_FILES), `:208+` (a VERIFY combo)
- Modify: `scripts/e2e/lib/steps.mjs:43` (checkManifest linter-exists check)
- Modify: repo `cspell.json` (add oxlint/oxfmt/oxc vocabulary)
- Test: `npm run e2e:gen -- --linter=oxlint` (Tier-1 across the tree)

**Interfaces:**
- Consumes: `LINTER=oxlint` produces `.oxlintrc.json` (Tasks 1–3).
- Produces: matrix `linter.oxlint` label; `LINTER_FILES.oxlint === '.oxlintrc.json'`.

- [ ] **Step 1: Add oxlint to the linter dimension** — `scripts/e2e/matrix.mjs:13`

```js
const linter = { eslint: { LINTER: 'eslint' }, biome: { LINTER: 'biome' }, oxlint: { LINTER: 'oxlint' } };
```

- [ ] **Step 2: Register the oxlint linter config file** — `scripts/e2e/matrix.mjs:183`

```js
export const LINTER_FILES = { eslint: 'eslint.config.js', biome: 'biome.json', oxlint: '.oxlintrc.json' };
```

- [ ] **Step 3: Make the manifest linter-exists check oxlint-aware** — `scripts/e2e/lib/steps.mjs:43`

```js
  const hasLinter = Object.values(LINTER_FILES).some((f) => existsSync(join(dir, f)));
  if (!hasLinter) missing.push(Object.values(LINTER_FILES).join('|'));
```

- [ ] **Step 4: Add a Tier-2 verify combo** — `scripts/e2e/matrix.mjs`, inside the `VERIFY` array

```js
  verifyCombo('npm-lib', 'oxlint-npm', { LINTER: 'oxlint', PKG_MANAGER: 'npm', SEMANTIC_RELEASE: '0' }),
```

- [ ] **Step 5: Add oxlint vocabulary to the repo's cspell** — `cspell.json`

Add `"oxlint"`, `"oxfmt"`, `"oxc"`, `"oxlintrc"`, `"oxfmtrc"` to the `words` array (so the repo's own
`npm run spellcheck` and commit-msg gate pass).

- [ ] **Step 6: Run the Tier-1 gen slice**

Run: `npm run e2e:gen -- --linter=oxlint`
Expected: all oxlint combos PASS (each scaffolds `.oxlintrc.json`; the manifest check recognizes it).

- [ ] **Step 7: Run the full local gate**

Run: `npm run check && npm run e2e:gen`
Expected: all green (343+ existing tests + the 5 new oxlint tests; Tier-1 matrix all pass).

- [ ] **Step 8: Commit**

```bash
git add scripts/e2e/matrix.mjs scripts/e2e/lib/steps.mjs cspell.json
git commit -m "test(e2e): cover the oxlint linter option in the matrix"
```

---

## Open the PR (STOP)

- [ ] Push `feat/oxlint-linter` and open a PR to `dev` with `gh pr create` using the repo's PR template.
- [ ] **STOP** — a human reviews and merges (agents never merge `dev`/`main`). The AI review + `checks`
      + `e2e-gen` gates run automatically. Do **not** run `gh pr merge`.

## Self-Review (completed while writing)

- **Spec coverage (§5.1/§5.4):** parse fix ✓ (T1 S3), choice ✓ (T1 S3), standalone deps ✓ (T1 S4),
  cspell guard ✓ (T1 S4), config templates ✓ (T1 S5-6), generation branch + eslint/prettier skip ✓
  (T1 S7-8), scripts ✓ (T2), README ✓ (T3), e2e dim + LINTER_FILES + steps.mjs:43 + verify combo ✓ (T4).
- **Placeholder scan:** every code step carries real code; the README task shows the exact
  transformation + two concrete sites + a grep to catch the rest (same edit repeated — not a placeholder).
- **Type consistency:** the value `'oxlint'` for `answers.linter` / `LINTER` is used identically across
  common.js, install.js, scripts.js, generators, readme.js, and the matrix; `LINTER_FILES.oxlint`
  matches the generated `.oxlintrc.json`.
