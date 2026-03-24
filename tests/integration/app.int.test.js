import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject() {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-app-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-app', version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', PROJECT_TYPE: 'app', ...extraEnv },
    stdio: 'pipe',
  });
}

describe('app project scaffold', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates app.json', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'app.json'))).toBe(true);
  });

  it('creates babel.config.js', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'babel.config.js'))).toBe(true);
  });

  it('creates metro.config.js', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'metro.config.js'))).toBe(true);
  });

  it('creates app-specific tsconfig.json', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, 'tsconfig.json'), 'utf-8');
    expect(content).toContain('expo');
  });

  it('creates app-specific eslint.config.js', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(true);
  });

  it('creates .mise.toml', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, '.mise.toml'))).toBe(true);
  });

  it('creates .detoxrc.js', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, '.detoxrc.js'))).toBe(true);
  });

  it('creates src/App.tsx', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'src/App.tsx'))).toBe(true);
  });

  it('creates src/screens/HomeScreen.tsx', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'src/screens/HomeScreen.tsx'))).toBe(true);
  });

  it('creates src/navigation/index.tsx', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'src/navigation/index.tsx'))).toBe(true);
  });

  it('creates tests/setup.ts', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'tests/setup.ts'))).toBe(true);
  });

  it('creates tests/unit/HomeScreen.unit.test.tsx', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'tests/unit/HomeScreen.unit.test.tsx'))).toBe(true);
  });

  it('creates tests/e2e/firstTest.e2e.ts', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'tests/e2e/firstTest.e2e.ts'))).toBe(true);
  });

  it('adds expo start script', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('start', 'expo start');
  });

  it('adds android and ios scripts', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('android', 'expo run:android');
    expect(pkg.scripts).toHaveProperty('ios', 'expo run:ios');
  });

  it('adds jest test script', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('test', 'jest');
  });

  it('adds detox e2e scripts', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('test:e2e', 'detox test --configuration ios.sim.debug');
    expect(pkg.scripts).toHaveProperty('test:e2e:build', 'detox build --configuration ios.sim.debug');
  });

  it('check script includes npm run test', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.check).toContain('npm run test');
  });

  it('does NOT create common tsconfig.base.json', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'tsconfig.base.json'))).toBe(false);
  });

  it('does NOT create common src/main.ts', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'src/main.ts'))).toBe(false);
  });

  it('does NOT create vitest.config.ts', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'vitest.config.ts'))).toBe(false);
  });

  it('does NOT set main field to src/main.ts', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.main).not.toBe('src/main.ts');
  });
});
