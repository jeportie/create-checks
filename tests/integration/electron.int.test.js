import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

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

// Returns the trimmed body of a `## <heading>` section (up to the next `---` rule).
function sectionBody(readme, heading) {
  const marker = `## ${heading}\n`;
  const start = readme.indexOf(marker);
  if (start === -1) return null;
  const rest = readme.slice(start + marker.length);
  const end = rest.indexOf('\n---\n');
  return (end === -1 ? rest : rest.slice(0, end)).trim();
}

// Returns just the `### TypeScript` playbook block (up to the next `###` subsection).
function typescriptPlaybook(readme) {
  const start = readme.indexOf('### TypeScript');
  if (start === -1) return '';
  const rest = readme.slice(start);
  const end = rest.indexOf('\n### ', 1);
  return end === -1 ? rest : rest.slice(0, end);
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

  it('copies eslint.config.js when LINTER=eslint is selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'eslint' });
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(true);
  });

  it('uses oxlint config with no eslint.config.js when LINTER=oxlint', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'oxlint' });
    expect(existsSync(join(tmpDir, '.oxlintrc.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(false);
  });

  it('keeps vitest out of the pre-commit hook even with a preset (mirrors frontend: test runs in check, not pre-commit)', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SETUP_PRECOMMIT: 'hk', VITEST_PRESET: 'native' });
    const pkl = readFileSync(join(tmpDir, 'hk.pkl'), 'utf-8');
    expect(pkl).toContain('"pre-commit"');
    expect(pkl).not.toContain('npm run test');
  });

  it('offers native Vitest: ships renderer test config/files and wires the test script into check', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    expect(existsSync(join(tmpDir, 'vitest.config.ts'))).toBe(true);
    expect(readFileSync(join(tmpDir, 'vitest.config.ts'), 'utf-8')).toContain('happy-dom');
    expect(existsSync(join(tmpDir, 'tests/setup.ts'))).toBe(true);
    expect(existsSync(join(tmpDir, 'tests/unit/App.unit.test.tsx'))).toBe(true);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.test).toBe('vitest --run');
    expect(pkg.scripts.check).toContain('npm run test');
  });

  it('adds the coverage script when VITEST_PRESET=coverage', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'coverage' });
    expect(existsSync(join(tmpDir, 'vitest.config.ts'))).toBe(true);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts['test:coverage']).toBe('vitest --coverage --run');
  });

  it('ships no Vitest by default (no preset): omits the config, test files, and test script', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'vitest.config.ts'))).toBe(false);
    expect(existsSync(join(tmpDir, 'tests/unit/App.unit.test.tsx'))).toBe(false);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.test).toBeUndefined();
    expect(pkg.scripts.check).not.toContain('npm run test');
  });

  it('offers Playwright (_electron flavor) with a build-first e2e script when PLAYWRIGHT=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { PLAYWRIGHT: '1' });
    expect(existsSync(join(tmpDir, 'playwright.config.ts'))).toBe(true);
    expect(existsSync(join(tmpDir, 'tests/e2e/app.e2e.ts'))).toBe(true);
    expect(readFileSync(join(tmpDir, 'tests/e2e/app.e2e.ts'), 'utf-8')).toContain('_electron');
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts['test:e2e']).toContain('electron-vite build');
  });

  it('ships no Playwright by default (PLAYWRIGHT=0): omits the config and e2e spec', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { PLAYWRIGHT: '0' });
    expect(existsSync(join(tmpDir, 'playwright.config.ts'))).toBe(false);
    expect(existsSync(join(tmpDir, 'tests/e2e/app.e2e.ts'))).toBe(false);
  });

  it('defaults electron to oxlint + hk', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir); // no LINTER / SETUP_PRECOMMIT overrides
    expect(existsSync(join(tmpDir, '.oxlintrc.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(false);
    expect(existsSync(join(tmpDir, 'hk.pkl'))).toBe(true);
    expect(existsSync(join(tmpDir, '.husky'))).toBe(false);
  });

  it('honors explicit overrides (eslint + husky) over the electron defaults', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'eslint', SETUP_PRECOMMIT: '1' });
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(true);
    expect(existsSync(join(tmpDir, '.husky', 'pre-commit'))).toBe(true);
  });
});

describe('electron README generation', () => {
  let dir;
  let readme;

  beforeAll(() => {
    dir = createTmpProject();
    runCli(dir);
    readme = readFileSync(join(dir, 'README.md'), 'utf-8');
  });

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('titles the project with the correct article ("An Electron desktop app")', () => {
    expect(readme).toContain('> An Electron desktop app');
    expect(readme).not.toContain('> A electron desktop app');
  });

  it('replaces the generic intro with an electron-specific paragraph', () => {
    expect(readme).not.toContain('A TypeScript project scaffolded with tskickstart.');
  });

  it('adds a run-the-app step to Getting Started', () => {
    const gettingStarted = sectionBody(readme, 'Getting Started');
    expect(gettingStarted).toContain('npm run dev');
    expect(gettingStarted).toContain('electron-vite');
  });

  it('describes the electron-vite dev server in Development', () => {
    expect(sectionBody(readme, 'Development')).toContain('electron-vite');
  });

  it('documents the three-process file tree in Project Structure', () => {
    const structure = sectionBody(readme, 'Project Structure');
    expect(structure).toContain('src/main');
    expect(structure).toContain('src/preload');
    expect(structure).toContain('src/renderer');
  });

  it('contextualizes the TypeScript playbook for electron, not backend', () => {
    const playbook = typescriptPlaybook(readme);
    expect(playbook).not.toContain('backend');
    expect(playbook).not.toContain('route handlers');
    expect(playbook).not.toContain('middleware');
  });

  it('leaves no narrative section empty', () => {
    expect(sectionBody(readme, 'Project Structure')).not.toBe('');
    expect(sectionBody(readme, 'Implementation Workflow')).not.toBe('');
    expect(sectionBody(readme, 'Common Tasks')).not.toBe('');
  });

  it('lists electron-specific Common Tasks (contextBridge, distributable)', () => {
    const tasks = sectionBody(readme, 'Common Tasks');
    expect(tasks).toContain('contextBridge');
    expect(tasks).toContain('npm run dist');
  });
});
