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
