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

  it('uses oxlint/oxfmt scripts and the format+lint lint-staged commands', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'oxlint', VITEST_PRESET: 'native' });

    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.lint).toBe('oxlint .');
    expect(pkg.scripts.format).toBe('oxfmt .');
    expect(pkg['lint-staged']['**/*']).toEqual(expect.arrayContaining(['npm run format', 'npm run lint']));
  });

  it('describes oxlint/oxfmt in the generated README', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'oxlint' });

    const readme = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(readme).toMatch(/oxlint/i);
    expect(readme).toMatch(/oxfmt/i);
    expect(readme).not.toMatch(/ESLint|Prettier/);
  });
});
