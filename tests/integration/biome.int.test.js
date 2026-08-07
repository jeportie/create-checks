import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject() {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-biome-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-biome', version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', PROJECT_TYPE: 'backend', BACKEND_FRAMEWORK: 'hono', ...extraEnv },
    stdio: 'pipe',
  });
}

describe('biome option', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates biome config and skips eslint/prettier config files', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'biome' });

    expect(existsSync(join(tmpDir, 'biome.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(false);
    expect(existsSync(join(tmpDir, 'prettier.config.js'))).toBe(false);
    expect(existsSync(join(tmpDir, '.prettierignore'))).toBe(false);
  });

  it('uses biome scripts and lint-staged command', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'biome', VITEST_PRESET: 'native' });

    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.lint).toBe('biome check .');
    expect(pkg.scripts.format).toBe('biome format --write .');
    expect(pkg['lint-staged']['**/*']).toContain('biome check --write .');
  });

  it('enforces node: protocol in biome config', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'biome' });

    const content = readFileSync(join(tmpDir, 'biome.json'), 'utf-8');
    expect(content).toContain('useNodejsImportProtocol');
  });

  it('uses Biome v2-compatible file exclusion patterns', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'biome' });

    const biomeConfig = JSON.parse(readFileSync(join(tmpDir, 'biome.json'), 'utf-8'));
    expect(biomeConfig.files).toBeDefined();
    expect(biomeConfig.files.includes).toEqual(
      expect.arrayContaining(['**', '!!**/dist', '!!**/coverage', '!package-lock.json']),
    );
    expect(biomeConfig.files.ignore).toBeUndefined();
  });

  it('keeps cspell standalone when biome is selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { LINTER: 'biome', LINT_OPTIONS: 'cspell' });

    expect(existsSync(join(tmpDir, 'cspell.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(false);
  });
});
