import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject() {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-npm-lib-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-lib', version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', PROJECT_TYPE: 'npm-lib', ...extraEnv },
    stdio: 'pipe',
  });
}

describe('npm-lib project scaffold', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates tsup.config.ts', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '1' });
    expect(existsSync(join(tmpDir, 'tsup.config.ts'))).toBe(true);
  });

  it('tsup.config.ts has dual format (cjs, esm) and dts enabled', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '1' });
    const content = readFileSync(join(tmpDir, 'tsup.config.ts'), 'utf-8');
    expect(content).toContain("'cjs'");
    expect(content).toContain("'esm'");
    expect(content).toContain('dts: true');
  });

  it('adds build script with value "tsup"', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '1' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('build', 'tsup');
  });

  it('adds dev script with value "tsup --watch"', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '1' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('dev', 'tsup --watch');
  });

  it('sets package.json exports with types first, then CJS/ESM paths', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '1' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.exports).toEqual({
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        require: './dist/index.cjs',
      },
    });
  });

  it('sets package.json main to ./dist/index.cjs', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '1' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.main).toBe('./dist/index.cjs');
  });

  it('sets package.json module to ./dist/index.js', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '1' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.module).toBe('./dist/index.js');
  });

  it('sets package.json types to ./dist/index.d.ts', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '1' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.types).toBe('./dist/index.d.ts');
  });

  it('sets package.json files to ["dist"]', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '1' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.files).toEqual(['dist']);
  });

  it('creates .github/workflows/pull-request-checks.yml', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '0' });
    expect(existsSync(join(tmpDir, '.github', 'workflows', 'pull-request-checks.yml'))).toBe(true);
  });

  it('creates .github/workflows/semantic-release.yml when SEMANTIC_RELEASE=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '1' });
    expect(existsSync(join(tmpDir, '.github', 'workflows', 'semantic-release.yml'))).toBe(true);
  });

  it('creates release.config.mjs when SEMANTIC_RELEASE=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '1' });
    expect(existsSync(join(tmpDir, 'release.config.mjs'))).toBe(true);
  });

  it('does NOT create semantic-release files when SEMANTIC_RELEASE=0', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '0' });
    expect(existsSync(join(tmpDir, '.github', 'workflows', 'semantic-release.yml'))).toBe(false);
    expect(existsSync(join(tmpDir, 'release.config.mjs'))).toBe(false);
  });

  it('still gets common files (tsconfig.base.json, eslint.config.js, src/main.ts)', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '1' });
    expect(existsSync(join(tmpDir, 'tsconfig.base.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(true);
    expect(existsSync(join(tmpDir, 'src', 'main.ts'))).toBe(true);
  });

  it('creates README.md with npm-lib-specific content', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '1' });
    const content = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(content).toContain('npm library');
    expect(content).toContain('tsup');
    expect(content).toContain('semantic-release');
  });

  it('uses pnpm commands in README when PKG_MANAGER=pnpm', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SEMANTIC_RELEASE: '1', PKG_MANAGER: 'pnpm' });

    const content = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(content).toContain('pnpm install');
    expect(content).toContain('pnpm build');
    expect(content).toContain('pnpm check');
    expect(content).not.toContain('npm run build');
    expect(content).not.toContain('npm run check');
  });
});
