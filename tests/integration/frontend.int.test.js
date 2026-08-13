import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject() {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-frontend-'));
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

describe('frontend starter scaffold', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates core frontend files', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'index.html'))).toBe(true);
    expect(existsSync(join(tmpDir, 'vite.config.ts'))).toBe(true);
    expect(existsSync(join(tmpDir, 'vitest.config.ts'))).toBe(true);
  });

  it('creates frontend TypeScript configs', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'tsconfig.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'tsconfig.app.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'tsconfig.node.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'tsconfig.test.json'))).toBe(true);
  });

  it('creates frontend source files and assets', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'src', 'main.tsx'))).toBe(true);
    expect(existsSync(join(tmpDir, 'src', 'App.tsx'))).toBe(true);
    expect(existsSync(join(tmpDir, 'src', 'Welcome.tsx'))).toBe(true);
    expect(existsSync(join(tmpDir, 'src', 'index.css'))).toBe(true);
    expect(existsSync(join(tmpDir, 'src', 'assets', 'react.svg'))).toBe(true);
    expect(existsSync(join(tmpDir, 'src', 'assets', 'tailwind.svg'))).toBe(true);
    expect(existsSync(join(tmpDir, 'src', 'assets', 'vite.svg'))).toBe(true);
  });

  it('uses a root null guard and explicit button type in starter templates', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);

    const mainContent = readFileSync(join(tmpDir, 'src', 'main.tsx'), 'utf-8');
    expect(mainContent).toContain("const root = document.getElementById('root');");
    expect(mainContent).toContain("if (!root) throw new Error('Root element not found');");
    expect(mainContent).not.toContain("getElementById('root')!");

    const welcomeContent = readFileSync(join(tmpDir, 'src', 'Welcome.tsx'), 'utf-8');
    expect(welcomeContent).toContain('type="button"');
  });

  it('creates frontend test files', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'tests', 'setup.ts'))).toBe(true);
    expect(existsSync(join(tmpDir, 'tests', 'unit', 'App.unit.test.tsx'))).toBe(true);
    expect(existsSync(join(tmpDir, 'tests', 'integration', 'App.int.test.tsx'))).toBe(true);
  });

  it('skips common starter source files for frontend', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'src', 'main.ts'))).toBe(false);
    expect(existsSync(join(tmpDir, 'test', 'main.test.ts'))).toBe(false);
  });

  it('skips common tsconfig.base.json for frontend', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'tsconfig.base.json'))).toBe(false);
  });

  it('keeps shared common files for frontend', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, '.editorconfig'))).toBe(true);
    expect(existsSync(join(tmpDir, '.gitignore'))).toBe(true);
    expect(existsSync(join(tmpDir, '.prettierignore'))).toBe(true);
    expect(existsSync(join(tmpDir, 'prettier.config.js'))).toBe(true);
  });

  it('uses frontend eslint config', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, 'eslint.config.js'), 'utf-8');
    expect(content).toContain('react-hooks');
    expect(content).toContain('react-refresh');
  });

  it('uses frontend vitest config', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, 'vitest.config.ts'), 'utf-8');
    expect(content).toContain('happy-dom');
    expect(content).toContain('setupFiles');
  });

  it('uses frontend tsconfig references', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, 'tsconfig.json'), 'utf-8');
    expect(content).toContain('tsconfig.app.json');
    expect(content).toContain('tsconfig.node.json');
  });

  it('adds frontend scripts to package.json', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('dev', 'vite');
    expect(pkg.scripts).toHaveProperty('build', 'tsc -b && vite build');
    expect(pkg.scripts).toHaveProperty('preview', 'vite preview');
  });

  it('does not set main to src/main.ts for frontend', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.main).not.toBe('src/main.ts');
  });

  it('keeps check script without test when VITEST_PRESET is not set', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.check).toBe('npm run format && npm run lint && npm run typecheck');
  });

  it('creates README.md with frontend-specific content', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(content).toContain('frontend application');
    expect(content).toContain('React');
    expect(content).toContain('Vite');
    expect(content).toContain('Tailwind');
  });

  it('does not overwrite existing README.md', () => {
    tmpDir = createTmpProject();
    writeFileSync(join(tmpDir, 'README.md'), 'existing');
    runCli(tmpDir);
    expect(readFileSync(join(tmpDir, 'README.md'), 'utf-8')).toBe('existing');
  });
});
