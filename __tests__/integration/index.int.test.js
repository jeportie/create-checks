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

function runCli(cwd) {
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1' },
    stdio: 'pipe',
  });
}

describe('create-checks CLI', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('copies eslint.config.js to the target directory', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(true);
  });

  it('copies prettier.config.mjs to the target directory', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'prettier.config.mjs'))).toBe(true);
  });

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

  it('injects lint, format, and typecheck scripts into package.json', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('lint', 'eslint .');
    expect(pkg.scripts).toHaveProperty('format', 'prettier . --write');
    expect(pkg.scripts).toHaveProperty('typecheck', 'tsc --noEmit');
  });
});
