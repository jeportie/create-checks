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

  it('omits the "npm run test" pre-commit step from hk.pkl (electron ships no vitest config)', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SETUP_PRECOMMIT: 'hk', VITEST_PRESET: 'native' });
    const pkl = readFileSync(join(tmpDir, 'hk.pkl'), 'utf-8');
    expect(pkl).toContain('"pre-commit"');
    expect(pkl).not.toContain('npm run test');
  });

  it('ships no vitest, so package.json omits the test script and check does not chain it', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.test).toBeUndefined();
    expect(pkg.scripts.check).not.toContain('npm run test');
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
