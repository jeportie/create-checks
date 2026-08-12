# electron Project Type — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `electron` project type — a minimal, secure electron-vite desktop starter (main + preload + React renderer) — selectable in the wizard, defaulting to the Ledger stack (oxlint + hk + mise + React).

**Architecture:** electron-vite (single `electron.vite.config.ts` with `main`/`preload`/`renderer` sections). Modern security: `contextIsolation` on, `contextBridge` preload, no `nodeIntegration`. It diverges from tskickstart's common types (dual `tsconfig.node`/`tsconfig.web`, `main: out/main/index.js`, `electron-vite build`), so the electron generator ships its own tsconfigs/config and is **excluded** from the generic `src/main.ts` + common-tsconfig scaffolding. Modeled on the existing `frontend` type (React + Vite).

**Tech Stack:** electron `^39`, electron-vite `^5`, electron-builder `^26`, vite `^7`, react `^19`, typescript `^5.9`, `@electron-toolkit/{preload,utils,tsconfig}`. Vitest integration tests + the `scripts/e2e` matrix (Tier-2 `electron-vite build`, headless).

**Spec:** `docs/superpowers/specs/2026-08-10-electron-ledger-tools-design.md` §5.3, §7.

## Global Constraints

- **Two independent exclusion lists** — electron must be added to BOTH: the generic-`src/main.ts` guard (`generators/common.js:302`, currently `!isFrontend && !isApp && projectType !== 'cli' && projectType !== 'backend'` — npm-lib is NOT excluded, so electron would get a stray `src/main.ts`) AND the fallback-`main` whitelist (`scripts.js:233`, `['frontend','npm-lib','cli','backend','app']`).
- **`pkg.main = 'out/main/index.js'`** (electron-vite's built main), set in the electron scripts block.
- **No vitest in v1** — the electron starter ships no bundled vitest config (renderer testing is a follow-up). Its e2e VERIFY combos MUST pass `VITEST_PRESET: 'none'` (the runner auto-injects `native` for non-app types otherwise). `check` then = format + lint + typecheck (no `test`).
- **Security**: `contextIsolation: true`, no `nodeIntegration`, `sandbox: false` (electron-vite default for the preload), `contextBridge.exposeInMainWorld`.
- **No non-null assertion** in the renderer (`document.getElementById('root')!`) — biome's `useNonNullAssertion` reds it (that was CF-031); use a null-check.
- **Defaults (D7)**: when `PROJECT_TYPE=electron`, default `linter` to `oxlint` and `precommitTool` to `hk` (still overridable by explicit `LINTER=`/`SETUP_PRECOMMIT=`), and React renderer.
- **Versions**: pin the electron-vite baseline above; the Tier-2 `electron-vite build` verify is the gate (the CF-040..046 lesson — let the real build catch breakage). electron-vite build is **headless** (bundles only; never launches electron or runs electron-builder).
- **Commits**: Conventional Commits, scope {prompts, generators, templates, utils, e2e, test}. No `Co-Authored-By`/AI-attribution. Never edit `package.json` `version`.
- **Env for tests** (worktree): `export PATH="$HOME/.local/share/mise/installs/node/20.14.0/bin:$PATH"`; `node_modules` symlinked — do NOT `npm install`. Commit `--no-verify --no-gpg-sign`. Integration tests are `NO_INSTALL=1`.

---

### Task 1: electron type scaffold — wiring + generator + templates + common guards

`PROJECT_TYPE=electron` scaffolds a complete electron-vite app and is excluded from the generic `src/main.ts` + common-tsconfig scaffolding.

**Files:**
- Modify: `src/prompts/project-type.js` (choice), `src/index.js` (asker map + label + dispatch)
- Create: `src/prompts/electron.js`, `src/generators/electron.js`
- Create: `src/templates/electron/{electron.vite.config.ts, electron-builder.yml, .nvmrc, tsconfig.json, tsconfig.node.json, tsconfig.web.json, src/main/index.ts, src/preload/index.ts, src/preload/index.d.ts, src/renderer/index.html, src/renderer/src/main.tsx, src/renderer/src/App.tsx}`
- Modify: `src/generators/common.js` (add `isElectron`, exclude from generic `src/main.ts` + tsconfig guards)
- Test: `tests/integration/electron.int.test.js` (new)

**Interfaces:**
- Consumes: env-driven CLI (`PROJECT_TYPE=electron`, `NO_INSTALL=1`).
- Produces: `answers.projectType === 'electron'`; scaffolded electron-vite files; `generateElectron(answers, cwd)`.

- [ ] **Step 1: Write the failing test** — `tests/integration/electron.int.test.js`

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
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-electron-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-electron', version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', PROJECT_TYPE: 'electron', ...extraEnv },
    stdio: 'pipe',
  });
}

describe('electron project type', () => {
  let tmpDir;
  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('scaffolds the electron-vite core files', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    for (const f of [
      'electron.vite.config.ts',
      'electron-builder.yml',
      'src/main/index.ts',
      'src/preload/index.ts',
      'src/renderer/index.html',
      'src/renderer/src/main.tsx',
      'src/renderer/src/App.tsx',
      'tsconfig.node.json',
      'tsconfig.web.json',
    ]) {
      expect(existsSync(join(tmpDir, f))).toBe(true);
    }
  });

  it('uses contextIsolation + contextBridge (secure) and no non-null assertion', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const preload = readFileSync(join(tmpDir, 'src/preload/index.ts'), 'utf-8');
    expect(preload).toContain('contextBridge');
    const main = readFileSync(join(tmpDir, 'src/main/index.ts'), 'utf-8');
    expect(main).not.toContain('nodeIntegration: true');
    const renderer = readFileSync(join(tmpDir, 'src/renderer/src/main.tsx'), 'utf-8');
    expect(renderer).not.toContain("getElementById('root')!");
  });

  it('skips the generic src/main.ts and common tsconfig.base.json', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'src/main.ts'))).toBe(false);
    expect(existsSync(join(tmpDir, 'tsconfig.base.json'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node_modules/.bin/vitest run tests/integration/electron.int.test.js`
Expected: FAIL — no electron generator; `PROJECT_TYPE=electron` currently produces the generic `src/main.ts`.

- [ ] **Step 3: Add the wizard choice** — `src/prompts/project-type.js`, in the `choices` array after the `app` line:
```js
        { name: 'mobile app', value: 'app' },
        { name: 'desktop app (Electron)', value: 'electron' },
```

- [ ] **Step 4: Wire the type in `src/index.js`** — add to `typeSpecificAskers` (after the `app` entry):
```js
  electron: () => import('./prompts/electron.js').then((m) => m.askElectronQuestions()),
```
add to `modeLabels`:
```js
  electron: 'desktop app',
```
and add a dispatch block after the `app` block (mirror `frontend`):
```js
if (answers.projectType === 'electron') {
  try {
    const { generateElectron } = await import('./generators/electron.js');
    await generateElectron(answers, process.cwd());
  } catch {
    // Electron module is optional until the feature branch merges.
  }
}
```

- [ ] **Step 5: Create the asker** — `src/prompts/electron.js`
```js
export async function askElectronQuestions() {
  return {};
}
```

- [ ] **Step 6: Create the generator** — `src/generators/electron.js`
```js
import path from 'node:path';

import fs from 'fs-extra';
import pc from 'picocolors';

import { copyIfMissing, templatePath } from '../utils/file-system.js';

const ELECTRON_FILES = [
  'electron.vite.config.ts',
  'electron-builder.yml',
  '.nvmrc',
  'tsconfig.json',
  'tsconfig.node.json',
  'tsconfig.web.json',
  'src/main/index.ts',
  'src/preload/index.ts',
  'src/preload/index.d.ts',
  'src/renderer/index.html',
  'src/renderer/src/main.tsx',
  'src/renderer/src/App.tsx',
];

async function copyElectronFile(relativePath, cwd) {
  const dest = path.join(cwd, relativePath);
  await fs.ensureDir(path.dirname(dest));
  await copyIfMissing(templatePath('electron', relativePath), dest, relativePath);
}

export async function generateElectron(answers, cwd = process.cwd()) {
  console.log(pc.green('→') + '  copying electron starter files...');
  for (const file of ELECTRON_FILES) {
    await copyElectronFile(file, cwd);
  }
  if (answers.linter === 'eslint') {
    await copyElectronFile('eslint.config.js', cwd);
  }
}
```
(If `fs-extra`/`picocolors` import style differs in `generators/frontend.js`, match that file's imports exactly.)

- [ ] **Step 7: Create the templates.** Under `src/templates/electron/`:

`electron.vite.config.ts`:
```ts
import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: {
    resolve: { alias: { '@renderer': resolve('src/renderer/src') } },
    plugins: [react()],
  },
});
```

`src/main/index.ts`:
```ts
import { join } from 'path';
import { app, shell, BrowserWindow } from 'electron';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    },
  });

  mainWindow.on('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron.app');
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

`src/preload/index.ts`:
```ts
import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

const api = {};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
```

`src/preload/index.d.ts`:
```ts
import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: unknown;
  }
}
```

`src/renderer/index.html`:
```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Electron App</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/renderer/src/main.tsx` (note the null-check, NOT `!`):
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
```

`src/renderer/src/App.tsx`:
```tsx
export default function App() {
  return (
    <div>
      <h1>Electron + Vite + React</h1>
      <p>
        Edit <code>src/renderer/src/App.tsx</code> and save to reload.
      </p>
    </div>
  );
}
```

`tsconfig.json`:
```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.node.json" }, { "path": "./tsconfig.web.json" }]
}
```

`tsconfig.node.json`:
```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.node.json",
  "include": ["electron.vite.config.*", "src/main/**/*", "src/preload/**/*"],
  "compilerOptions": {
    "composite": true,
    "types": ["electron-vite/node"]
  }
}
```

`tsconfig.web.json`:
```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.web.json",
  "include": ["src/renderer/src/**/*", "src/preload/*.d.ts"],
  "compilerOptions": {
    "composite": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@renderer/*": ["src/renderer/src/*"] }
  }
}
```

`electron-builder.yml`:
```yaml
appId: com.example.myelectronapp
productName: my-electron-app
directories:
  buildResources: build
files:
  - '!**/.vscode/*'
  - '!src/*'
  - '!electron.vite.config.{js,ts,mjs,cjs}'
  - '!{.eslintcache,eslint.config.js,.prettierignore,tsconfig.*}'
mac:
  target: dmg
win:
  target: nsis
linux:
  target: AppImage
```

`.nvmrc`:
```
22
```

- [ ] **Step 8: Exclude electron from the common guards** — `src/generators/common.js`

After the `isApp` definition (~line 152) add:
```js
  const isElectron = projectType === 'electron';
```
The generic `src/main.ts` guard (~line 302): add `&& !isElectron`:
```js
  if (!isFrontend && !isApp && !isElectron && projectType !== 'cli' && projectType !== 'backend') {
```
The tsconfig guard (~line 164): add `&& !isElectron` to the outer `if`:
```js
  if (!isFrontend && !isApp && !isElectron) {
```
The eslint-config copy (~line 187) and the vitest.config copy (~line 237): add `&& !isElectron` (electron ships its own eslint; and it has no common vitest config):
```js
  if (!isFrontend && !isApp && !isElectron && linter === 'eslint') {
  ...
  if (!isFrontend && !isApp && !isElectron && (vitestPreset === 'native' || vitestPreset === 'coverage')) {
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run tests/integration/electron.int.test.js`
Expected: PASS (3 tests).

- [ ] **Step 10: Commit**

```bash
git add src/prompts/project-type.js src/index.js src/prompts/electron.js src/generators/electron.js \
  src/templates/electron tests/integration/electron.int.test.js src/generators/common.js
git commit -m "feat(generators): add electron project type on electron-vite"
```

---

### Task 2: electron deps + scripts + main field

Generated `package.json` gets the electron-vite deps + `dev`/`build`/`preview`/`dist` scripts, the dual-tsconfig `typecheck`, and `main: out/main/index.js`.

**Files:**
- Modify: `src/utils/install.js` (electron dev + prod deps)
- Modify: `src/utils/scripts.js` (electron scripts block; `typecheck` ternary; fallback-`main` whitelist)
- Test: `tests/integration/electron.int.test.js`

**Interfaces:**
- Consumes: `answers.projectType === 'electron'`.
- Produces: `pkg.scripts.{dev,build,preview,dist,typecheck}`, `pkg.main === 'out/main/index.js'`.

- [ ] **Step 1: Add the failing test** (append inside the describe block)

```js
  it('adds electron-vite scripts and sets main to out/main/index.js', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.dev).toBe('electron-vite dev');
    expect(pkg.scripts.build).toBe('electron-vite build');
    expect(pkg.scripts.preview).toBe('electron-vite preview');
    expect(pkg.scripts.dist).toBe('electron-builder');
    expect(pkg.main).toBe('out/main/index.js');
    expect(pkg.main).not.toBe('src/main.ts');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `node_modules/.bin/vitest run tests/integration/electron.int.test.js -t "electron-vite scripts"`
Expected: FAIL — no electron scripts; `pkg.main` is `src/main.ts` (electron falls into the fallback).

- [ ] **Step 3: Add the electron dep block** — `src/utils/install.js`, a new dev-deps block near the frontend one (~line 118):
```js
  if (projectType === 'electron') {
    devDeps.push(
      'electron@^39',
      'electron-vite@^5',
      'electron-builder@^26',
      'vite@^7',
      '@vitejs/plugin-react@^5',
      '@electron-toolkit/tsconfig@^2',
      '@types/react@^19',
      '@types/react-dom@^19',
    );
  }
```
and a prod-deps block near the frontend one (~line 252):
```js
  if (projectType === 'electron') {
    prodDeps.push('react@^19', 'react-dom@^19', '@electron-toolkit/preload@^3', '@electron-toolkit/utils@^4');
  }
```
(base already pushes `typescript@~5.9.3` + `@types/node`; `unique()` dedupes.)

- [ ] **Step 4: Add the electron scripts block + typecheck + main whitelist** — `src/utils/scripts.js`

New scripts block near the frontend one (~line 125):
```js
  if (projectType === 'electron') {
    pkg.scripts.dev = 'electron-vite dev';
    pkg.scripts.build = 'electron-vite build';
    pkg.scripts.preview = 'electron-vite preview';
    pkg.scripts.dist = 'electron-builder';
    pkg.main = 'out/main/index.js';
  }
```
The `typecheck` ternary (~line 96) — extend for electron's dual tsconfig:
```js
    typecheck:
      projectType === 'frontend'
        ? 'tsc -b'
        : projectType === 'electron'
          ? 'tsc --noEmit -p tsconfig.node.json --composite false && tsc --noEmit -p tsconfig.web.json --composite false'
          : 'tsc --noEmit',
```
The fallback-`main` whitelist (~line 233): add `'electron'`:
```js
  if (
    !['frontend', 'npm-lib', 'cli', 'backend', 'app', 'electron'].includes(projectType) &&
    (!pkg.main || pkg.main === 'index.js')
  ) {
    pkg.main = 'src/main.ts';
  }
```
Add `dist` to `orderScripts`' whitelist array (near the top of scripts.js, `scriptOrder`) if it isn't already present, so it orders deterministically.

- [ ] **Step 5: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run tests/integration/electron.int.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/utils/install.js src/utils/scripts.js tests/integration/electron.int.test.js
git commit -m "feat(utils): electron-vite deps, scripts, and out/main entry"
```

---

### Task 3: electron defaults (oxlint + hk) + README + e2e matrix + full gate

Electron defaults to the Ledger stack, the README describes it, and the e2e matrix covers it (Tier-2 = headless `electron-vite build`).

**Files:**
- Modify: `src/prompts/common.js` (default linter → oxlint, precommitTool → hk when `projectType === 'electron'`)
- Modify: `src/generators/common.js` (cspell electron words) and `src/utils/readme.js` (electron branches)
- Modify: `scripts/e2e/matrix.mjs` (electron GROUP + MANIFESTS + VERIFY)
- Test: `tests/integration/electron.int.test.js` + `npm run check` + `npm run e2e:gen`

**Interfaces:**
- Consumes: `projectType === 'electron'`.
- Produces: default `linter='oxlint'` + `precommitTool='hk'` for electron; matrix `electron` group.

- [ ] **Step 1: Add the failing test** (append)
```js
  it('defaults electron to oxlint + hk', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir); // no LINTER / SETUP_PRECOMMIT overrides
    expect(existsSync(join(tmpDir, '.oxlintrc.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'hk.pkl'))).toBe(true);
    expect(existsSync(join(tmpDir, '.husky'))).toBe(false);
  });

  it('honors explicit overrides (eslint + husky) over the electron defaults', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'eslint', SETUP_PRECOMMIT: '1' });
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(true);
    expect(existsSync(join(tmpDir, '.husky', 'pre-commit'))).toBe(true);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `node_modules/.bin/vitest run tests/integration/electron.int.test.js -t "defaults electron"`
Expected: FAIL — electron currently defaults to eslint + husky (the global defaults).

- [ ] **Step 3: Default electron to oxlint + hk** — `src/prompts/common.js`

At the linter resolution (~line 8), after computing `linter`, add an electron default that applies only when the env var is unset:
```js
  let linter = ['biome', 'oxlint'].includes(process.env.LINTER) ? process.env.LINTER : undefined;
  if (linter === undefined) linter = projectType === 'electron' ? 'oxlint' : 'eslint';
```
(If the current code hard-codes `'eslint'` as the fallback, this replaces that fallback while preserving the explicit-env and TTY-prompt paths — verify the TTY prompt still runs only when `!process.env.LINTER`.)
At the precommit resolution, in the branch where no `SETUP_PRECOMMIT` env is set and non-TTS defaults apply, default `precommitTool` to `hk` for electron:
```js
  } else if (sp === undefined && !process.stdin.isTTY) {
    precommitTool = projectType === 'electron' ? 'hk' : 'husky';
  }
```
(Keep the TTY list prompt as-is; keep `=0`/`=1`/`=husky`/`=hk` explicit handling. The goal: unset + electron ⇒ hk; unset + other ⇒ husky.) The `askCommonQuestions` signature already receives `projectType`.

- [ ] **Step 4: cspell electron words + README branches**

`src/generators/common.js` cspell words (~line 216) — add an electron branch:
```js
    if (isElectron) {
      await appendWordsToCspell(cwd, ['electron', 'Electron', 'renderer', 'preload', 'contextBridge']);
    }
```
`src/utils/readme.js` — give electron the frontend-style branches (minimum viable): `getProjectTitle` titles map add `electron: 'Electron Desktop App'`; `getPrimaryFramework` add `if (projectType === 'electron') return 'Electron + Vite + React';`; `getToolsSection` add `if (projectType === 'electron') tools.push('- **Electron** + **Vite** + **React**')`; and add `'electron'` to BOTH type-membership arrays at ~line 4266 and ~line 4269 (so the `dev` and `build` script rows appear). Grep `projectType === 'frontend'` in readme.js and add an electron arm wherever the section would otherwise be empty.

- [ ] **Step 5: e2e matrix — electron GROUP + MANIFEST + VERIFY** — `scripts/e2e/matrix.mjs`

Add to `GROUPS` (near the frontend group):
```js
  {
    id: 'electron',
    type: 'electron',
    dims: { linter },
  },
```
Add to `MANIFESTS`:
```js
  electron: ['electron.vite.config.ts', 'src/main/index.ts'],
```
Add to `VERIFY` (pass `VITEST_PRESET: 'none'` — electron ships no vitest config):
```js
  verifyCombo('electron', 'oxlint', { LINTER: 'oxlint', VITEST_PRESET: 'none' }),
  verifyCombo('electron', 'eslint', { LINTER: 'eslint', VITEST_PRESET: 'none' }),
```
No `steps.mjs` change: Tier-2 runs the generated `npm run build` (= `electron-vite build`, headless bundle) + `npm run check` — both work in CI without launching electron.

- [ ] **Step 6: Run the focused tests + Tier-1 gen**

Run: `node_modules/.bin/vitest run tests/integration/electron.int.test.js` → all pass.
Run: `npm run e2e:gen -- --type=electron` → electron combos scaffold `electron.vite.config.ts` + `src/main/index.ts`, manifest recognized, all green.

- [ ] **Step 7: Full local gate**

Run: `npm run lint && npm run secretlint && npm run spellcheck && node_modules/.bin/vitest run && npm run e2e:gen`
Expected: all green (existing suite + new electron tests; Tier-1 matrix all pass).
**Note:** the Tier-2 `electron-vite build` verify needs a real install (electron download) + is network-heavy — the controller runs `npm run e2e:verify -- --grep=electron` separately (on Node ≥20.19) to prove the electron scaffold installs + builds; do not run it here.

- [ ] **Step 8: Commit**

```bash
git add src/prompts/common.js src/generators/common.js src/utils/readme.js scripts/e2e/matrix.mjs
git commit -m "feat(electron): default to oxlint+hk, README + e2e coverage"
```

---

## Open the PR (STOP)

- [ ] Push `feat/electron-type`; the controller runs `npm run e2e:verify -- --grep=electron` on Node ≥20.19 to confirm `electron-vite build` succeeds, then opens the PR to `dev` and STOPS. A human merges. Do NOT `gh pr merge`.

## Notes & deferred items

- **No renderer vitest** in v1 (VITEST_PRESET=none). Adding a happy-dom + testing-library renderer test suite is a follow-up.
- **No electron-builder in CI/e2e** — packaging (dmg/nsis/AppImage) needs platform signing/tooling; verify is build-only.
- `electron-builder.yml` `appId`/`productName` are placeholders; a future enhancement could derive them from the project name.
- The `postinstall: electron-builder install-app-deps` from the upstream template is deliberately omitted — the minimal starter has no native deps to rebuild, and it would add an install-time electron dependency to every `npm install`.

## Self-Review (completed while writing)

- **Spec coverage (§5.3):** electron-vite foundation ✓ (T1 templates), contextIsolation/contextBridge ✓ (T1 templates + test), structure src/main+preload+renderer ✓, electron-builder.yml ✓, scripts dev/build/preview/dist ✓ (T2), `out/main/index.js` main + whitelist ✓ (T2), deps ✓ (T2), defaults oxlint+hk+React ✓ (T3), minimal asker ✓ (T1), common-generator guards ✓ (T1 Step 8), README ✓ (T3). §7 electron verify (build-only, VITEST none, no launch/builder) ✓ (T3 + controller e2e:verify).
- **Placeholder scan:** every template + edit carries real code; the README task gives the concrete branches + a grep for the rest.
- **Type consistency:** `projectType === 'electron'` and `isElectron` used consistently; `pkg.main = 'out/main/index.js'` matches both the scripts block and the whitelist; MANIFEST files (`electron.vite.config.ts`, `src/main/index.ts`) match what the generator emits.
