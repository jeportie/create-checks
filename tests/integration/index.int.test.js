import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject() {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-'));
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

function runCliWithOutput(cwd, extraEnv = {}) {
  return execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', ...extraEnv },
    stdio: 'pipe',
    encoding: 'utf-8',
  });
}

describe('tskickstart CLI', () => {
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

  it('keeps non-interactive CLI output within 80 columns', () => {
    tmpDir = createTmpProject();
    const output = runCliWithOutput(tmpDir);
    // eslint-disable-next-line no-control-regex
    const clean = output.replace(/\x1B\[[0-9;]*m/g, '');
    const lines = clean
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0);

    expect(Math.max(...lines.map((line) => line.length))).toBeLessThanOrEqual(80);
  });

  it('eslint config enforces node: protocol for built-in imports', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, 'eslint.config.js'), 'utf-8');
    expect(content).toContain('import/enforce-node-protocol-usage');
    expect(content).toContain("'always'");
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

  it('does not create .eslintignore (flat config uses ignores array)', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, '.eslintignore'))).toBe(false);
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

  it('tsconfig.json includes both test and tests directories', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const tsconfig = JSON.parse(readFileSync(join(tmpDir, 'tsconfig.json'), 'utf-8'));
    expect(tsconfig.include).toContain('test');
    expect(tsconfig.include).toContain('tests');
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

  it('native vitest.config.ts uses node: import protocol for path', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    const content = readFileSync(join(tmpDir, 'vitest.config.ts'), 'utf-8');
    expect(content).toContain("from 'node:path'");
    expect(content).not.toContain("from 'path'");
  });

  it('native vitest.config.ts includes both test and tests directories', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    const content = readFileSync(join(tmpDir, 'vitest.config.ts'), 'utf-8');
    expect(content).toContain('**/tests/**');
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

  it('coverage vitest.config.ts uses node: import protocol for path', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'coverage' });
    const content = readFileSync(join(tmpDir, 'vitest.config.ts'), 'utf-8');
    expect(content).toContain("from 'node:path'");
    expect(content).not.toContain("from 'path'");
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

  /* ---------------- package.json — "type": "module" ---------------- */

  it('patches "type": "module" into an existing package.json that lacks it', () => {
    tmpDir = createTmpProject(); // createTmpProject writes pkg without type field
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.type).toBe('module');
  });

  it('preserves existing "type": "module" without duplicating it', () => {
    tmpDir = createTmpProject();
    writeFileSync(
      join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test-project', version: '1.0.0', type: 'module' }, null, 2),
    );
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.type).toBe('module');
  });

  /* ---------------- Optional lint tools — absent by default ---------------- */
  // In non-TTY mode the checkbox returns [] so none of the optional tools are selected.

  it('does not copy cspell.json when cspell is not selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'cspell.json'))).toBe(false);
  });

  it('uses base eslint.config.js (not cspell variant) when cspell is not selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, 'eslint.config.js'), 'utf-8');
    expect(content).not.toContain('@cspell');
  });

  it('does not copy .secretlintrc.json when secretlint is not selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, '.secretlintrc.json'))).toBe(false);
  });

  it('does not copy commitlint.config.js when commitlint is not selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'commitlint.config.js'))).toBe(false);
  });

  /* ---------------- check script — dynamic ---------------- */

  it('check script contains only base commands when no optional tools are selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.check).toBe('npm run format && npm run lint && npm run typecheck');
    expect(pkg.scripts).not.toHaveProperty('spellcheck');
    expect(pkg.scripts).not.toHaveProperty('secretlint');
  });

  it('check script includes test when vitest preset is set', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.check).toContain('npm run test');
  });

  /* ---------------- pre-commit hook (husky + lint-staged) ---------------- */
  // In non-TTY mode the confirm defaults to true so the hook is always set up here.

  it('creates .husky/pre-commit with lint-staged and typecheck commands', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, '.husky', 'pre-commit'), 'utf-8');
    expect(content).toContain('npx lint-staged');
    expect(content).toContain('npm run typecheck');
  });

  it('pre-commit hook does not include "npm run test" when vitest is not set up', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, '.husky', 'pre-commit'), 'utf-8');
    expect(content).not.toContain('npm run test');
  });

  it('pre-commit hook includes "npm run test" when a vitest preset is selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    const content = readFileSync(join(tmpDir, '.husky', 'pre-commit'), 'utf-8');
    expect(content).toContain('npm run test');
  });

  it('does not create .husky/commit-msg when commitlint is not selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, '.husky', 'commit-msg'))).toBe(false);
  });

  it('does not overwrite an existing .husky/pre-commit', () => {
    tmpDir = createTmpProject();
    const huskyDir = join(tmpDir, '.husky');
    mkdirSync(huskyDir, { recursive: true });
    writeFileSync(join(huskyDir, 'pre-commit'), '# custom hook\n');
    runCli(tmpDir);
    expect(readFileSync(join(huskyDir, 'pre-commit'), 'utf-8')).toBe('# custom hook\n');
  });

  /* ---------------- lint-staged config ---------------- */

  it('adds lint-staged config with format and lint commands to package.json', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg['lint-staged']).toBeDefined();
    expect(pkg['lint-staged']['**/*']).toContain('npm run format');
    expect(pkg['lint-staged']['**/*']).toContain('npm run lint');
  });

  it('lint-staged does not include spellcheck or secretlint when those tools are not selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg['lint-staged']['**/*']).not.toContain('npm run spellcheck');
    expect(pkg['lint-staged']['**/*']).not.toContain('npm run secretlint');
  });

  it('adds prepare: "husky" script to package.json', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('prepare', 'husky');
  });

  /* ---------------- src/main.ts and test/ scaffolding ---------------- */

  it('creates src/main.ts in the target directory', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'src', 'main.ts'))).toBe(true);
  });

  it('src/main.ts contains helloWorld function', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, 'src', 'main.ts'), 'utf-8');
    expect(content).toContain('helloWorld');
    expect(content).toContain("'Hello, World!'");
  });

  it('does not overwrite an existing src/main.ts', () => {
    tmpDir = createTmpProject();
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'main.ts'), '// existing\n');
    runCli(tmpDir);
    expect(readFileSync(join(tmpDir, 'src', 'main.ts'), 'utf-8')).toBe('// existing\n');
  });

  it('creates test/ directory when a vitest preset is selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    expect(existsSync(join(tmpDir, 'test'))).toBe(true);
  });

  it('creates test/main.test.ts when a vitest preset is selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    expect(existsSync(join(tmpDir, 'test', 'main.test.ts'))).toBe(true);
  });

  it('test/main.test.ts imports helloWorld and spies on console.log', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { VITEST_PRESET: 'native' });
    const content = readFileSync(join(tmpDir, 'test', 'main.test.ts'), 'utf-8');
    expect(content).toContain("from '@/main'");
    expect(content).toContain('vi.spyOn(console');
    expect(content).toContain("'Hello, World!'");
  });

  it('does not create test/main.test.ts when vitest is not selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'test', 'main.test.ts'))).toBe(false);
  });

  it('does not create test/ directory when vitest is not selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'test'))).toBe(false);
  });

  /* ---------------- author name (AUTHOR_NAME env var) ---------------- */

  it('sets author in package.json from AUTHOR_NAME env var', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { AUTHOR_NAME: 'alice' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.author).toBe('alice');
  });

  it('does not overwrite an existing author in package.json', () => {
    tmpDir = createTmpProject();
    writeFileSync(
      join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test-project', version: '1.0.0', author: 'jane' }, null, 2),
    );
    runCli(tmpDir, { AUTHOR_NAME: 'alice' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.author).toBe('jane');
  });

  /* ---------------- README.md generation ---------------- */

  it('creates README.md in the target directory', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'README.md'))).toBe(true);
  });

  it('does not overwrite an existing README.md', () => {
    tmpDir = createTmpProject();
    writeFileSync(join(tmpDir, 'README.md'), 'existing readme');
    runCli(tmpDir);
    expect(readFileSync(join(tmpDir, 'README.md'), 'utf-8')).toBe('existing readme');
  });

  it('README.md contains project name from package.json', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    const content = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(content).toContain('test-project');
  });
});
