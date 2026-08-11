# hk Pre-commit Option — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `hk` (jdx/hk, the Ledger-style Rust git-hook manager) as a second pre-commit option alongside husky, selectable for every project type.

**Architecture:** Keep the existing `setupPrecommit` boolean (is a hook set up at all → `none` = false) and add a `precommitTool: 'husky' | 'hk'` choice. When `hk` is chosen, the generator writes a `hk.pkl` (parity with the husky hook: format + lint + typecheck [+ secretlint/test] on pre-commit, commitlint on commit-msg) and ensures a `.mise.toml` that pins `hk` + `pkl` and installs them via a `postinstall` — because **hk is a binary, installed through mise, not npm**. No `.husky/`, no `husky`/`lint-staged` npm deps, no `prepare` script for hk.

**Tech Stack:** Node 22 (ESM), hk (jdx/hk, pkl-configured), mise (tool manager), Vitest integration tests, the `scripts/e2e` matrix runner.

**Spec:** `docs/superpowers/specs/2026-08-10-electron-ledger-tools-design.md` §5.2, §7.

## Global Constraints

- **hk ⇒ mise, never npm**: `hk` is NOT an npm dependency. Selecting hk must NOT push `husky`/`lint-staged` and must NOT set `prepare: "husky"`. hk + pkl are pinned in `.mise.toml` and installed via `[hooks] postinstall = "hk install --mise"`.
- **Parity with husky (D4)**: the hk pre-commit runs the same checks the husky hook runs — `npm run format`, `npm run lint`, `npm run typecheck`, plus `npm run secretlint` (if secretlint selected) and `npm run test` (if a vitest preset is set, and not frontend/app); commit-msg runs commitlint (if selected). Using the npm scripts keeps it **linter-agnostic** (works for eslint/biome/oxlint uniformly). Per-file `{{ files }}` globbing is a deliberate future refinement — out of scope here.
- **Secrets = secretlint** (D5), never gitleaks.
- **Back-compat**: `SETUP_PRECOMMIT=1` still means husky; `=0` still means none. Add `=husky` / `=hk` as explicit values.
- **Versions**: pin `hk = "1.40.0"`, `pkl = "0.31.1"` (ledger-live's proven baseline). The hk hook is not executed in e2e (files-only), so these aren't runtime-gated — keep them valid release tags.
- **Commits**: Conventional Commits, scope from {prompts, generators, templates, utils, e2e, test}. **Never** add `Co-Authored-By`/AI-attribution. Never edit `package.json` `version`.
- **Repo gates**: new vocabulary (`hk`, `pkl`, `jdx`, `mise`) must be in the repo's `cspell.json`. Reproduce with `npm run check` + `npm run e2e:gen` before the PR.
- **Branch/flow**: work on `feat/hk-precommit` off `dev`; open a PR to `dev` and STOP (a human merges).
- **Env for running tests** (worktree): `export PATH="$HOME/.local/share/mise/installs/node/20.14.0/bin:$PATH"`; `node_modules` is symlinked — do NOT `npm install`. Commit with `git commit --no-verify --no-gpg-sign`. Tests are `NO_INSTALL=1` (assert generated files) so Node 20.14 is fine.

---

### Task 1: hk option — prompt, generator branch, hk.pkl, install + scripts

Make `SETUP_PRECOMMIT=hk` generate a `hk.pkl` (not `.husky/`), with no husky/lint-staged deps and no `prepare` script — while `husky`/`1`/`0` behave exactly as before.

**Files:**
- Modify: `src/prompts/common.js:76-91` (tri-state parse + prompt) and the return object
- Modify: `src/generators/common.js:216-236` (husky-vs-hk branch + `renderHkPkl` helper)
- Modify: `src/utils/install.js:90-92` (husky deps only for the husky tool)
- Modify: `src/utils/scripts.js:107-109` (`prepare`) and `:222-227` (lint-staged) — husky-tool only
- Test: `tests/integration/hk.int.test.js` (new)

**Interfaces:**
- Consumes: the env-driven CLI (`PROJECT_TYPE`, `SETUP_PRECOMMIT`, `LINT_OPTIONS`, `VITEST_PRESET`, `NO_INSTALL=1`).
- Produces: `answers.precommitTool === 'hk' | 'husky'` (default `'husky'`), consumed by Task 2 (mise) and Task 3 (README); generated `hk.pkl`.

- [ ] **Step 1: Write the failing test** — `tests/integration/hk.int.test.js`

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
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-hk-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-hk', version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', PROJECT_TYPE: 'backend', BACKEND_FRAMEWORK: 'hono', ...extraEnv },
    stdio: 'pipe',
  });
}

describe('hk pre-commit option', () => {
  let tmpDir;
  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('SETUP_PRECOMMIT=hk generates hk.pkl and no .husky/', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SETUP_PRECOMMIT: 'hk', VITEST_PRESET: 'native' });

    expect(existsSync(join(tmpDir, 'hk.pkl'))).toBe(true);
    expect(existsSync(join(tmpDir, '.husky'))).toBe(false);
    const pkl = readFileSync(join(tmpDir, 'hk.pkl'), 'utf-8');
    expect(pkl).toContain('amends');
    expect(pkl).toContain('"pre-commit"');
    expect(pkl).toContain('npm run format');
    expect(pkl).toContain('npm run lint');
    expect(pkl).toContain('npm run typecheck');
  });

  it('hk mode sets no husky prepare script and no lint-staged', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SETUP_PRECOMMIT: 'hk' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.prepare).toBeUndefined();
    expect(pkg['lint-staged']).toBeUndefined();
  });

  it('hk commit-msg step is present only when commitlint is selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SETUP_PRECOMMIT: 'hk', LINT_OPTIONS: 'commitlint' });
    const pkl = readFileSync(join(tmpDir, 'hk.pkl'), 'utf-8');
    expect(pkl).toContain('"commit-msg"');
    expect(pkl).toContain('commitlint --edit');
  });

  it('SETUP_PRECOMMIT=1 (and default) still uses husky, not hk', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SETUP_PRECOMMIT: '1' });
    expect(existsSync(join(tmpDir, '.husky', 'pre-commit'))).toBe(true);
    expect(existsSync(join(tmpDir, 'hk.pkl'))).toBe(false);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.prepare).toBe('husky');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run tests/integration/hk.int.test.js`
Expected: FAIL — `SETUP_PRECOMMIT=hk` currently falls through to the TTY branch (non-TTY → stays `setupPrecommit=true`, husky), so `hk.pkl` isn't generated.

- [ ] **Step 3: Tri-state parse + prompt** — `src/prompts/common.js`

Replace the `setupPrecommit` block (lines 76-91) with:
```js
  let setupPrecommit = true;
  let precommitTool = 'husky';
  const sp = process.env.SETUP_PRECOMMIT;
  if (sp === '0') {
    setupPrecommit = false;
  } else if (sp === 'hk') {
    precommitTool = 'hk';
  } else if (sp === '1' || sp === 'husky') {
    precommitTool = 'husky';
  } else if (sp === undefined && process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'list',
        name: 'precommit',
        message: 'Pre-commit hooks?',
        choices: [
          { name: 'Husky + lint-staged', value: 'husky' },
          { name: 'hk (Ledger-style, needs mise)', value: 'hk' },
          { name: 'None', value: 'none' },
        ],
        default: 'husky',
      },
    ]);
    if (result.precommit === 'none') setupPrecommit = false;
    else precommitTool = result.precommit;
  }
```
Add `precommitTool` to the returned answers object (next to `setupPrecommit`).

- [ ] **Step 4: Generator branch + `renderHkPkl`** — `src/generators/common.js`

Add this helper near the top of the file (module scope, after imports):
```js
function renderHkPkl({ lintOption, vitestPreset, isFrontend, isApp }) {
  const step = (id, cmd) => `      ["${id}"] {\n        check = "${cmd}"\n      }`;
  const pre = [step('format', 'npm run format'), step('lint', 'npm run lint'), step('typecheck', 'npm run typecheck')];
  if (lintOption.includes('secretlint')) pre.push(step('secretlint', 'npm run secretlint'));
  if (!isFrontend && !isApp && (vitestPreset === 'native' || vitestPreset === 'coverage')) {
    pre.push(step('test', 'npm run test'));
  }
  let pkl =
    'amends "package://github.com/jdx/hk/releases/download/v1.40.0/hk@1.40.0#/Config.pkl"\n\n' +
    'hooks {\n  ["pre-commit"] {\n    steps {\n' + pre.join('\n') + '\n    }\n  }';
  if (lintOption.includes('commitlint')) {
    pkl +=
      '\n  ["commit-msg"] {\n    steps {\n      ["commitlint"] {\n' +
      '        check = "npx commitlint --edit {{ commit_msg_file }}"\n      }\n    }\n  }';
  }
  return pkl + '\n}\n';
}
```
Then replace the `if (setupPrecommit) { ... }` block (currently lines 216-236) with a husky-vs-hk branch:
```js
  if (setupPrecommit) {
    if (answers.precommitTool === 'hk') {
      const hkDest = path.join(cwd, 'hk.pkl');
      if (!(await fs.pathExists(hkDest))) {
        await fs.writeFile(hkDest, renderHkPkl({ lintOption, vitestPreset, isFrontend, isApp }));
        console.log(pc.green('✔') + '    hk.pkl');
      }
      // .mise.toml (hk + pkl + postinstall) is ensured in Task 2's ensureHkInMise(cwd)
    } else {
      const huskyDir = path.join(cwd, '.husky');
      await fs.ensureDir(huskyDir);
      const preCommitDest = path.join(huskyDir, 'pre-commit');
      if (!(await fs.pathExists(preCommitDest))) {
        const lines = ['npx lint-staged', 'npm run typecheck'];
        if (!isFrontend && !isApp && (vitestPreset === 'native' || vitestPreset === 'coverage')) {
          lines.push('npm run test');
        }
        await fs.writeFile(preCommitDest, `${lines.join('\n')}\n`);
        console.log(pc.green('✔') + '    .husky/pre-commit');
      } else {
        console.log(pc.dim('–') + '    .husky/pre-commit (already exists, skipped)');
      }
      if (lintOption.includes('commitlint')) {
        const commitMsgDest = path.join(huskyDir, 'commit-msg');
        await copyIfMissing(templatePath('common', '.husky/commit-msg'), commitMsgDest, '.husky/commit-msg');
      }
    }
  }
```
(Note: `answers` is in scope in `generateCommon`. If `precommitTool` was destructured at the top of `generateCommon`, use the local; otherwise `answers.precommitTool`. Add `precommitTool = 'husky'` to the destructure at line 98 for clarity.)

- [ ] **Step 5: install deps — husky tool only** — `src/utils/install.js:90-92`

```js
  if (setupPrecommit && answers.precommitTool !== 'hk') {
    devDeps.push('husky', 'lint-staged');
  }
```
(`answers.precommitTool` — add `precommitTool` to the destructure at the top of `installDeps` if you prefer a local. hk installs via mise, not npm.)

- [ ] **Step 6: scripts — prepare + lint-staged husky-only** — `src/utils/scripts.js`

Line 107-109:
```js
  if (setupPrecommit && answers.precommitTool !== 'hk') {
    pkg.scripts.prepare = 'husky';
  }
```
Line 222 (the lint-staged block guard):
```js
  if (setupPrecommit && answers.precommitTool !== 'hk') {
    const lintStagedCmds = linter === 'biome' ? ['biome check --write .'] : ['npm run format', 'npm run lint'];
    if (lintOption.includes('cspell')) lintStagedCmds.push('npm run spellcheck');
    if (lintOption.includes('secretlint')) lintStagedCmds.push('npm run secretlint');
    pkg['lint-staged'] = { '**/*': lintStagedCmds };
  }
```
(`answers` is the second param of `buildScripts(pkg, answers)`, in scope.)

- [ ] **Step 7: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run tests/integration/hk.int.test.js`
Expected: PASS (4 tests). Also run the existing husky tests to confirm no regression: `node_modules/.bin/vitest run tests/integration/index.int.test.js -t "pre-commit"` and `-t "SETUP_PRECOMMIT"` → still green.

- [ ] **Step 8: Commit**

```bash
git add src/prompts/common.js src/generators/common.js src/utils/install.js src/utils/scripts.js tests/integration/hk.int.test.js
git commit -m "feat(prompts): add hk as a second pre-commit option (tri-state husky|hk|none)"
```

---

### Task 2: hk ⇒ mise coupling

When hk is chosen, ensure a `.mise.toml` that pins `hk` + `pkl` and installs them via a `postinstall` hook — creating it for types that have none (`npm-lib`/`frontend`) and extending the node-only one for types that do (`cli`/`backend`/`app`).

**Files:**
- Modify: `src/generators/common.js` (add `ensureHkInMise` + call it in the hk branch)
- Test: `tests/integration/hk.int.test.js`

**Interfaces:**
- Consumes: `answers.precommitTool === 'hk'` (Task 1).
- Produces: a `.mise.toml` in the generated project containing `hk = "1.40.0"` and `[hooks] postinstall`.

- [ ] **Step 1: Add the failing test** (append inside the describe block)

```js
  it('hk ensures a .mise.toml pinning hk with a postinstall hook (type without mise)', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SETUP_PRECOMMIT: 'hk', PROJECT_TYPE: 'npm-lib' });
    expect(existsSync(join(tmpDir, '.mise.toml'))).toBe(true);
    const mise = readFileSync(join(tmpDir, '.mise.toml'), 'utf-8');
    expect(mise).toContain('hk = "1.40.0"');
    expect(mise).toContain('pkl = "0.31.1"');
    expect(mise).toContain('[hooks]');
    expect(mise).toContain('hk install');
  });

  it('hk extends an existing .mise.toml (backend/cli) without dropping node', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SETUP_PRECOMMIT: 'hk', PROJECT_TYPE: 'cli', CLI_FRAMEWORK: 'commander' });
    const mise = readFileSync(join(tmpDir, '.mise.toml'), 'utf-8');
    expect(mise).toContain('node =');
    expect(mise).toContain('hk = "1.40.0"');
    expect(mise).toContain('[hooks]');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `node_modules/.bin/vitest run tests/integration/hk.int.test.js -t "mise"`
Expected: FAIL — npm-lib produces no `.mise.toml`; cli's `.mise.toml` has no `hk`.

- [ ] **Step 3: Add `ensureHkInMise`** — `src/generators/common.js` (module scope)

```js
async function ensureHkInMise(cwd, nodeVersion = '22') {
  const misePath = path.join(cwd, '.mise.toml');
  const hkTools = 'hk = "1.40.0"\npkl = "0.31.1"\n';
  const hooks = '\n[hooks]\npostinstall = "hk install --mise"\n';
  if (await fs.pathExists(misePath)) {
    const content = (await fs.readFile(misePath, 'utf-8')).trimEnd();
    if (!content.includes('hk =')) {
      // existing templates are a single [tools] section, so appending the two
      // tool pins keeps them under [tools], then [hooks] follows.
      await fs.writeFile(misePath, `${content}\n${hkTools}${hooks}`);
      console.log(pc.green('✔') + '    .mise.toml (+ hk)');
    }
  } else {
    await fs.writeFile(misePath, `[tools]\nnode = "${nodeVersion}"\n${hkTools}${hooks}`);
    console.log(pc.green('✔') + '    .mise.toml');
  }
}
```

- [ ] **Step 4: Call it in the hk branch** — `src/generators/common.js`

In the `if (answers.precommitTool === 'hk') { ... }` block from Task 1, after writing `hk.pkl`, add:
```js
      await ensureHkInMise(cwd);
```

- [ ] **Step 5: Run to verify it passes**

Run: `node_modules/.bin/vitest run tests/integration/hk.int.test.js`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/generators/common.js tests/integration/hk.int.test.js
git commit -m "feat(generators): pin hk via .mise.toml with a postinstall install hook"
```

---

### Task 3: README hk branches

The generated README describes the pre-commit tooling (husky) in a few places. Add an hk branch: the tools list, the quality/setup section (hk installs via `mise install`), and the project-structure tree (`hk.pkl` + `.mise.toml` instead of `.husky/`).

**Files:**
- Modify: `src/utils/readme.js` — the husky/pre-commit sites. Find them with `grep -n "husky\|Husky\|\.husky\|lint-staged\|pre-commit" src/utils/readme.js`.
- Test: `tests/integration/hk.int.test.js`

**Interfaces:**
- Consumes: `answers.precommitTool === 'hk'`.
- Produces: README text naming hk + mise for an hk project (not husky).

- [ ] **Step 1: Add the failing test**

```js
  it('describes hk + mise in the generated README (not husky) for hk projects', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SETUP_PRECOMMIT: 'hk' });
    const readme = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(readme).toMatch(/hk/);
    expect(readme).toMatch(/mise install/);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `node_modules/.bin/vitest run tests/integration/hk.int.test.js -t "README"`
Expected: FAIL — README describes husky, not hk / `mise install`.

- [ ] **Step 3: Add the hk arm at each pre-commit site.** For each `husky`/`Husky`/`.husky` mention that is gated on `setupPrecommit`, branch on `precommitTool`. Two representative transforms:

Tools-list entry (wherever the tools array pushes `- **Husky** …` under `if (setupPrecommit)`):
```js
    if (answers.precommitTool === 'hk') {
      tools.push('- **hk** — Ledger-style git hooks (installed via mise)');
    } else {
      tools.push('- **Husky** + **lint-staged** — pre-commit hooks');
    }
```
Project-structure tree (wherever it lists `.husky/` under `if (setupPrecommit)`):
```js
    if (answers.precommitTool === 'hk') {
      lines.push('├── hk.pkl              # hk git-hook config');
      lines.push('├── .mise.toml          # tool versions + hk install');
    } else {
      lines.push('├── .husky/             # git hooks');
    }
```
Setup/quality prose that says "run `npm install` to set up husky" → for hk say "run `mise install` to install hk and set up git hooks". Grep to confirm every `husky` mention in a `setupPrecommit` context has an hk arm.

- [ ] **Step 4: Run to verify it passes**

Run: `node_modules/.bin/vitest run tests/integration/hk.int.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/readme.js tests/integration/hk.int.test.js
git commit -m "feat(utils): describe hk + mise in generated README"
```

---

### Task 4: e2e matrix coverage + repo cspell + full gate

Add `hk` to the Tier-1 pre-commit dimension and a Tier-2 verify combo, add the hk vocabulary to the repo's cspell, then run the full local gate.

**Files:**
- Modify: `scripts/e2e/matrix.mjs` — the `common-toggles` `precommit` dim + a `VERIFY` combo
- Modify: repo `cspell.json` (add `hk`, `pkl`, `jdx`)
- Test: `npm run e2e:gen` (Tier-1)

**Interfaces:**
- Consumes: `SETUP_PRECOMMIT=hk` generates `hk.pkl` + `.mise.toml` (Tasks 1-2).
- Produces: matrix `precommit.hk` label.

- [ ] **Step 1: Add hk to the precommit dimension** — `scripts/e2e/matrix.mjs`

Find the `common-toggles` group's `precommit` dim (currently `{ husky: { SETUP_PRECOMMIT: '1' }, nohusky: { SETUP_PRECOMMIT: '0' } }`) and add:
```js
        precommit: {
          husky: { SETUP_PRECOMMIT: '1' },
          hk: { SETUP_PRECOMMIT: 'hk' },
          nohusky: { SETUP_PRECOMMIT: '0' },
        },
```

- [ ] **Step 2: Add a Tier-2 verify combo** — `scripts/e2e/matrix.mjs`, in the `VERIFY` array

```js
  verifyCombo('backend', 'hono-hk', { LINTER: 'eslint', BACKEND_FRAMEWORK: 'hono', SETUP_PRECOMMIT: 'hk', VITEST_PRESET: 'native' }),
```
(hk.pkl + .mise.toml don't affect `npm install` or `npm run check` — the hook is never executed in verify — so this confirms the hk scaffold installs + checks clean.)

- [ ] **Step 3: Add hk vocabulary to repo cspell** — `cspell.json`

Add `"hk"`, `"pkl"`, `"jdx"` to the `words` array (the `hk.pkl` amends URL contains `jdx`; the generated files + tests reference `hk`/`pkl`).

- [ ] **Step 4: Run the Tier-1 gen slice**

Run: `npm run e2e:gen -- --grep=hk` (and `npm run e2e:gen -- --type=cli` to exercise the precommit dim)
Expected: all combos PASS; hk combos scaffold `hk.pkl` + `.mise.toml`.

- [ ] **Step 5: Run the full local gate**

Run: `npm run lint && npm run secretlint && npm run spellcheck && node_modules/.bin/vitest run && npm run e2e:gen`
Expected: all green (existing suite + new hk tests; Tier-1 matrix all pass).

- [ ] **Step 6: Commit**

```bash
git add scripts/e2e/matrix.mjs cspell.json
git commit -m "test(e2e): cover the hk pre-commit option in the matrix"
```

---

## Open the PR (STOP)

- [ ] Push `feat/hk-precommit` and open a PR to `dev` with `gh pr create`.
- [ ] **STOP** — a human reviews + merges. Do **not** run `gh pr merge`.

## Notes & deferred items

- The hk pre-commit uses whole-project npm scripts (`npm run format`/`lint`/`typecheck`) rather than hk's per-file `{{ files }}` globbing. This is linter-agnostic and simple; per-file globbing (ledger-live's style) is a deferred refinement.
- `postinstall = "hk install --mise"` is unguarded; ledger-live guards it to skip on CI. A CI guard is a deferred nicety — the hook install only runs on `mise install`, which the e2e never invokes.
- `ensureHkInMise` assumes the existing `.mise.toml` templates are a single `[tools]` section (true today: `[tools]\nnode = "22"`). If a future template adds more sections, revisit the append logic.

## Self-Review (completed while writing)

- **Spec coverage (§5.2):** tri-state parse ✓ (T1 S3), husky/hk/none prompt ✓ (T1 S3), hk.pkl generation ✓ (T1 S4), hk⇒mise coupling ✓ (T2), no npm dep / no prepare ✓ (T1 S5-6), README ✓ (T3), e2e precommit dim ✓ (T4). §7 hk verify (files-only, install must not fail) ✓ (T4 S2, guaranteed since hk isn't an npm dep + no prepare).
- **Placeholder scan:** every step carries real code; the README task shows the transform + two concrete sites + a grep for the rest.
- **Type consistency:** `answers.precommitTool` (`'husky'|'hk'`, default `'husky'`) is used identically across common.js, generators/common.js, install.js, scripts.js, readme.js; `SETUP_PRECOMMIT=hk` maps to it; `hk.pkl` + `.mise.toml` are the generated artifacts asserted in the tests.
