import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject() {
  const dir = mkdtempSync(join(tmpdir(), 'create-checks-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', ...extraEnv },
    stdio: 'pipe',
  });
}

describe('create-checks CLI', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  /* ---------------- ESLint + Prettier files ---------------- */

  it('copies eslint.config.js to the target directory', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(true);
  });

  it('copies prettier.config.js to the target directory', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'prettier.config.js'))).toBe(true);
  });

  /* ---------------- EditorConfig ---------------- */

  it('copies .editorconfig when none exists', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, '.editorconfig'))).toBe(true);
  });

  it('does not overwrite an existing .editorconfig', () => {
    tmpDir = createTmpProject();
    writeFileSync(join(tmpDir, '.editorconfig'), 'root = false\n');
    runCli(tmpDir);
    expect(readFileSync(join(tmpDir, '.editorconfig'), 'utf-8')).toBe('root = false\n');
  });

  /* ---------------- Ignore files ---------------- */

  it('.eslintignore contains expected entries', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, '.eslintignore'), 'utf-8');
    expect(content).toContain('dist');
    expect(content).toContain('node_modules');
    expect(content).toContain('package-lock.json');
    expect(content).toContain('coverage');
  });

  it('.prettierignore contains expected entries', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, '.prettierignore'), 'utf-8');
    expect(content).toContain('dist');
    expect(content).toContain('node_modules');
    expect(content).toContain('package-lock.json');
    expect(content).toContain('coverage');
  });

  it('.gitignore contains expected entries', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules');
    expect(content).toContain('dist');
    expect(content).toContain('coverage');
  });

  it('does not overwrite an existing .gitignore', () => {
    tmpDir = createTmpProject();
    writeFileSync(join(tmpDir, '.gitignore'), 'custom-entry\n');
    runCli(tmpDir);
    expect(readFileSync(join(tmpDir, '.gitignore'), 'utf-8')).toBe('custom-entry\n');
  });

  /* ---------------- TypeScript config ---------------- */

  it('copies tsconfig.base.json to the target directory', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'tsconfig.base.json'))).toBe(true);
  });

  it('tsconfig.json includes both test and __tests__ directories', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const tsconfig = JSON.parse(readFileSync(join(tmpDir, 'tsconfig.json'), 'utf-8'));
    expect(tsconfig.include).toContain('test');
    expect(tsconfig.include).toContain('__tests__');
  });

  it('does not overwrite an existing tsconfig.json', () => {
    tmpDir = createTmpProject();
    writeFileSync(join(tmpDir, 'tsconfig.json'), '{ "extends": "./other.json" }\n');
    runCli(tmpDir);
    expect(readFileSync(join(tmpDir, 'tsconfig.json'), 'utf-8')).toBe('{ "extends": "./other.json" }\n');
  });

  /* ---------------- package.json scripts (base) ---------------- */

  it('injects lint, format, and typecheck scripts into package.json', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('lint', 'eslint .');
    expect(pkg.scripts).toHaveProperty('format', 'prettier . --write');
    expect(pkg.scripts).toHaveProperty('typecheck', 'tsc --noEmit');
  });

  /* ---------------- Vitest — not set up when no preset ---------------- */

  it('does not create vitest.config.ts when VITEST_PRESET is not set', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir); // no VITEST_PRESET, stdin is not a TTY in test
    expect(existsSync(join(tmpDir, 'vitest.config.ts'))).toBe(false);
  });

  /* ---------------- Vitest — native preset ---------------- */

  it('creates vitest.config.ts for native preset', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    expect(existsSync(join(tmpDir, 'vitest.config.ts'))).toBe(true);
  });

  it('native vitest.config.ts contains resolve alias for @→src', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    const content = readFileSync(join(tmpDir, 'vitest.config.ts'), 'utf-8');
    expect(content).toContain("resolve(__dirname, 'src')");
    expect(content).toContain("'@'");
  });

  it('native vitest.config.ts includes both test and __tests__ directories', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    const content = readFileSync(join(tmpDir, 'vitest.config.ts'), 'utf-8');
    expect(content).toContain('__tests__');
    expect(content).toContain('test/**');
  });

  it('native vitest.config.ts does not contain coverage block', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    const content = readFileSync(join(tmpDir, 'vitest.config.ts'), 'utf-8');
    expect(content).not.toContain('coverage');
  });

  it('injects test, test:unit, test:integration scripts for native preset', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('test', 'vitest --run');
    expect(pkg.scripts).toHaveProperty('test:unit', 'vitest unit --run');
    expect(pkg.scripts).toHaveProperty('test:integration', 'vitest int --run');
  });

  it('does not inject test:coverage script for native preset', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).not.toHaveProperty('test:coverage');
  });

  /* ---------------- Vitest — coverage preset ---------------- */

  it('coverage vitest.config.ts contains coverage block', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'coverage' });
    const content = readFileSync(join(tmpDir, 'vitest.config.ts'), 'utf-8');
    expect(content).toContain('coverage');
    expect(content).toContain('json-summary');
    expect(content).toContain('reportOnFailure');
  });

  it('injects test, test:unit, test:integration, test:coverage scripts for coverage preset', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'coverage' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('test', 'vitest --run');
    expect(pkg.scripts).toHaveProperty('test:unit', 'vitest unit --run');
    expect(pkg.scripts).toHaveProperty('test:integration', 'vitest int --run');
    expect(pkg.scripts).toHaveProperty('test:coverage', 'vitest --coverage --run');
  });
});
