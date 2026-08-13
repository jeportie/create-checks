import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

  // --- Core files (always created) ---

  it('creates app.json', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'app.json'))).toBe(true);
  });

  it('creates babel.config.cjs', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'babel.config.cjs'))).toBe(true);
  });

  it('creates metro.config.cjs', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'metro.config.cjs'))).toBe(true);
  });

  it('creates app-specific tsconfig.json', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, 'tsconfig.json'), 'utf-8');
    expect(content).toContain('expo');
  });

  it('creates app-specific eslint.config.js with CJS support', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, 'eslint.config.js'), 'utf-8');
    expect(content).toContain('*.cjs');
    expect(content).toContain('commonjs');
    expect(content).toContain('no-require-imports');
  });

  it('creates .mise.toml', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, '.mise.toml'))).toBe(true);
  });

  it('creates src/App.tsx', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'src/App.tsx'))).toBe(true);
  });

  it('creates src/screens/HomeScreen.tsx with welcome content', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, 'src/screens/HomeScreen.tsx'), 'utf-8');
    expect(content).toContain('Welcome to Your App');
    expect(content).toContain('useState');
    expect(content).toContain('count is');
  });

  it('creates src/navigation/index.tsx', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'src/navigation/index.tsx'))).toBe(true);
  });

  it('creates index.ts entry point with registerRootComponent', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'index.ts'))).toBe(true);
    const content = readFileSync(join(tmpDir, 'index.ts'), 'utf-8');
    expect(content).toContain('registerRootComponent');
    expect(content).toContain('./src/App');
  });

  it('sets main field to index.ts', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.main).toBe('index.ts');
  });

  it('creates .npmrc with legacy-peer-deps', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, '.npmrc'))).toBe(true);
    const content = readFileSync(join(tmpDir, '.npmrc'), 'utf-8');
    expect(content).toContain('legacy-peer-deps=true');
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

  // --- Jest (default: enabled) ---

  it('creates jest test files when APP_JEST=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { APP_JEST: '1' });
    expect(existsSync(join(tmpDir, 'tests/setup.ts'))).toBe(true);
    expect(existsSync(join(tmpDir, 'tests/unit/HomeScreen.unit.test.tsx'))).toBe(true);
  });

  it('creates jest.config.cjs when APP_JEST=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { APP_JEST: '1' });
    expect(existsSync(join(tmpDir, 'jest.config.cjs'))).toBe(true);
    const content = readFileSync(join(tmpDir, 'jest.config.cjs'), 'utf-8');
    expect(content).toContain('jest-expo');
    expect(content).toContain('setupFilesAfterEnv');
  });

  it('adds jest test script when APP_JEST=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { APP_JEST: '1' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('test', 'jest');
  });

  it('check script includes npm run test when APP_JEST=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { APP_JEST: '1' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.check).toContain('npm run test');
  });

  it('does NOT create jest files when APP_JEST=0', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { APP_JEST: '0' });
    expect(existsSync(join(tmpDir, 'tests/setup.ts'))).toBe(false);
    expect(existsSync(join(tmpDir, 'tests/unit/HomeScreen.unit.test.tsx'))).toBe(false);
    expect(existsSync(join(tmpDir, 'jest.config.cjs'))).toBe(false);
  });

  it('does NOT add test script when APP_JEST=0', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { APP_JEST: '0' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.test).toBeUndefined();
  });

  it('check script does NOT include npm run test when APP_JEST=0', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { APP_JEST: '0', APP_DETOX: '0' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.check).not.toContain('npm run test');
  });

  // --- Detox (default: enabled) ---

  it('creates detox files when APP_DETOX=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { APP_DETOX: '1' });
    expect(existsSync(join(tmpDir, '.detoxrc.cjs'))).toBe(true);
    expect(existsSync(join(tmpDir, 'tests/e2e/firstTest.e2e.ts'))).toBe(true);
    expect(existsSync(join(tmpDir, 'tests/e2e/jest.config.cjs'))).toBe(true);
  });

  it('adds detox e2e scripts when APP_DETOX=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { APP_DETOX: '1' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('test:e2e', 'detox test --configuration ios.sim.debug');
    expect(pkg.scripts).toHaveProperty('test:e2e:build', 'detox build --configuration ios.sim.debug');
  });

  it('does NOT create detox files when APP_DETOX=0', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { APP_DETOX: '0' });
    expect(existsSync(join(tmpDir, '.detoxrc.cjs'))).toBe(false);
    expect(existsSync(join(tmpDir, 'tests/e2e/firstTest.e2e.ts'))).toBe(false);
    expect(existsSync(join(tmpDir, 'tests/e2e/jest.config.cjs'))).toBe(false);
  });

  it('does NOT add detox scripts when APP_DETOX=0', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { APP_DETOX: '0' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts['test:e2e']).toBeUndefined();
    expect(pkg.scripts['test:e2e:build']).toBeUndefined();
  });

  // --- Default behavior (both enabled) ---

  it('creates both jest and detox files by default', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'tests/setup.ts'))).toBe(true);
    expect(existsSync(join(tmpDir, 'tests/unit/HomeScreen.unit.test.tsx'))).toBe(true);
    expect(existsSync(join(tmpDir, '.detoxrc.cjs'))).toBe(true);
    expect(existsSync(join(tmpDir, 'tests/e2e/firstTest.e2e.ts'))).toBe(true);
  });

  it('overwrites stale app template files from previous scaffolds', () => {
    tmpDir = createTmpProject();

    writeFileSync(join(tmpDir, 'eslint.config.js'), 'export default [];\n');

    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src/App.tsx'), "import { BrowserRouter } from 'react-router';\n");

    mkdirSync(join(tmpDir, 'tests'), { recursive: true });
    writeFileSync(join(tmpDir, 'tests/setup.ts'), "import '@testing-library/jest-dom/vitest';\n");

    runCli(tmpDir, { APP_JEST: '1', APP_DETOX: '0' });

    const eslintContent = readFileSync(join(tmpDir, 'eslint.config.js'), 'utf-8');
    expect(eslintContent).toContain("sourceType: 'commonjs'");

    const appContent = readFileSync(join(tmpDir, 'src/App.tsx'), 'utf-8');
    expect(appContent).toContain('NavigationContainer');
    expect(appContent).not.toContain('react-router');

    const setupContent = readFileSync(join(tmpDir, 'tests/setup.ts'), 'utf-8');
    expect(setupContent).toContain('Jest setup file');
    expect(setupContent).not.toContain('jest-dom/vitest');
  });

  // --- Negation tests ---

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

  it('does NOT create old .js config files', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'babel.config.js'))).toBe(false);
    expect(existsSync(join(tmpDir, 'metro.config.js'))).toBe(false);
    expect(existsSync(join(tmpDir, '.detoxrc.js'))).toBe(false);
  });

  it('creates README.md with app-specific content', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { APP_JEST: '1', APP_DETOX: '1' });
    const content = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(content).toContain('mobile application');
    expect(content).toContain('Expo');
    expect(content).toContain('React Native');
  });
});
