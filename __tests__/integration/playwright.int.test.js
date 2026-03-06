import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject() {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-playwright-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', PROJECT_TYPE: 'frontend', ...extraEnv },
    stdio: 'pipe',
  });
}

describe('playwright scaffold option', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates Playwright files when PLAYWRIGHT=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { PLAYWRIGHT: '1' });
    expect(existsSync(join(tmpDir, 'playwright.config.ts'))).toBe(true);
    expect(existsSync(join(tmpDir, 'e2e', 'example.spec.ts'))).toBe(true);
  });

  it('adds Playwright scripts when enabled', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { PLAYWRIGHT: '1' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('test:e2e', 'npx playwright test');
    expect(pkg.scripts).toHaveProperty('test:e2e:ui', 'npx playwright test --ui');
  });

  it('appends Playwright artifacts to .gitignore', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { PLAYWRIGHT: '1' });
    const content = readFileSync(join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('playwright-report/');
    expect(content).toContain('test-results/');
  });

  it('does not set up Playwright when PLAYWRIGHT=0', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { PLAYWRIGHT: '0' });
    expect(existsSync(join(tmpDir, 'playwright.config.ts'))).toBe(false);
    expect(existsSync(join(tmpDir, 'e2e', 'example.spec.ts'))).toBe(false);
  });

  it('does not set up Playwright by default in non-TTY mode', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'playwright.config.ts'))).toBe(false);
    expect(existsSync(join(tmpDir, 'e2e', 'example.spec.ts'))).toBe(false);
  });

  it('does not add Playwright scripts when disabled', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { PLAYWRIGHT: '0' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).not.toHaveProperty('test:e2e');
    expect(pkg.scripts).not.toHaveProperty('test:e2e:ui');
  });

  it('ignores PLAYWRIGHT flag for non-frontend project types', () => {
    tmpDir = createTmpProject();
    execSync(`node ${cliPath}`, {
      cwd: tmpDir,
      env: { ...process.env, NO_INSTALL: '1', PROJECT_TYPE: 'backend', PLAYWRIGHT: '1' },
      stdio: 'pipe',
    });
    expect(existsSync(join(tmpDir, 'playwright.config.ts'))).toBe(false);
  });

  it('does not duplicate gitignore entries on repeat runs', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { PLAYWRIGHT: '1' });
    runCli(tmpDir, { PLAYWRIGHT: '1' });
    const content = readFileSync(join(tmpDir, '.gitignore'), 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    expect(lines.filter((line) => line === 'playwright-report/')).toHaveLength(1);
    expect(lines.filter((line) => line === 'test-results/')).toHaveLength(1);
  });
});
