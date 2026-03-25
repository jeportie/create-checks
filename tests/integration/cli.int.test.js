import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject() {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-cli-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-cli', version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', PROJECT_TYPE: 'cli', ...extraEnv },
    stdio: 'pipe',
  });
}

describe('cli project scaffold', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates tsup.config.ts with CJS format and shims', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool' });
    const content = readFileSync(join(tmpDir, 'tsup.config.ts'), 'utf-8');
    expect(content).toContain("'cjs'");
    expect(content).toContain('shims: true');
    expect(content).toContain('#!/usr/bin/env node');
  });

  it('creates .mise.toml', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool' });
    expect(existsSync(join(tmpDir, '.mise.toml'))).toBe(true);
  });

  it('creates src/index.ts with commander setup', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool' });
    const content = readFileSync(join(tmpDir, 'src/index.ts'), 'utf-8');
    expect(content).toContain('commander');
    expect(content).toContain('Command');
  });

  it('creates src/index.ts with inquirer setup', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'inquirer', CLI_NAME: 'my-tool' });
    const content = readFileSync(join(tmpDir, 'src/index.ts'), 'utf-8');
    expect(content).toContain('inquirer');
    expect(content).toContain('void main();');
    expect(content).not.toMatch(/^\s*main\(\);\s*$/m);
  });

  it('creates src/index.ts with clack setup', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'clack', CLI_NAME: 'my-tool' });
    const content = readFileSync(join(tmpDir, 'src/index.ts'), 'utf-8');
    expect(content).toContain('@clack/prompts');
    expect(content).toContain('void main();');
    expect(content).not.toMatch(/^\s*main\(\);\s*$/m);
  });

  it('creates src/commands/hello.ts', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool' });
    expect(existsSync(join(tmpDir, 'src/commands/hello.ts'))).toBe(true);
    const content = readFileSync(join(tmpDir, 'src/commands/hello.ts'), 'utf-8');
    expect(content).toContain('hello');
  });

  it('adds build script with value "tsup"', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('build', 'tsup');
  });

  it('adds dev script with value "tsx src/index.ts"', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('dev', 'tsx src/index.ts');
  });

  it('adds start script', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('start', 'node dist/index.cjs');
  });

  it('sets package.json bin field with CLI_NAME', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.bin).toEqual({ 'my-tool': './dist/index.cjs' });
  });

  it('sets package.json files to ["dist"]', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.files).toEqual(['dist']);
  });

  it('does NOT create src/main.ts (skips common starter)', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool' });
    expect(existsSync(join(tmpDir, 'src/main.ts'))).toBe(false);
  });

  it('still gets common config files', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool' });
    expect(existsSync(join(tmpDir, 'tsconfig.base.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'tsconfig.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(true);
  });

  it('defaults to commander when CLI_FRAMEWORK not set', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_NAME: 'my-tool' });
    const content = readFileSync(join(tmpDir, 'src/index.ts'), 'utf-8');
    expect(content).toContain('commander');
  });

  it('creates tests/unit/hello.unit.test.ts for commander', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool' });
    expect(existsSync(join(tmpDir, 'tests/unit/hello.unit.test.ts'))).toBe(true);
    const content = readFileSync(join(tmpDir, 'tests/unit/hello.unit.test.ts'), 'utf-8');
    expect(content).toContain('hello');
    expect(content).toContain('vitest');
  });

  it('creates tests/unit/hello.unit.test.ts for inquirer', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'inquirer', CLI_NAME: 'my-tool' });
    expect(existsSync(join(tmpDir, 'tests/unit/hello.unit.test.ts'))).toBe(true);
  });

  it('creates tests/unit/hello.unit.test.ts for clack', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'clack', CLI_NAME: 'my-tool' });
    expect(existsSync(join(tmpDir, 'tests/unit/hello.unit.test.ts'))).toBe(true);
  });

  it('does not overwrite existing test file', () => {
    tmpDir = createTmpProject();
    mkdirSync(join(tmpDir, 'tests/unit'), { recursive: true });
    writeFileSync(join(tmpDir, 'tests/unit/hello.unit.test.ts'), 'existing');
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool' });
    const content = readFileSync(join(tmpDir, 'tests/unit/hello.unit.test.ts'), 'utf-8');
    expect(content).toBe('existing');
  });

  it('creates README.md with CLI-specific content', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool' });
    const content = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(content).toContain('cli tool');
    expect(content).toContain('Commander');
    expect(content).toContain('tsup');
  });

  it('creates release.config.mjs when SEMANTIC_RELEASE=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool', SEMANTIC_RELEASE: '1' });
    expect(existsSync(join(tmpDir, 'release.config.mjs'))).toBe(true);
    const content = readFileSync(join(tmpDir, 'release.config.mjs'), 'utf-8');
    expect(content).toContain('conventionalcommits');
    expect(content).toContain('@semantic-release/npm');
  });

  it('creates semantic-release workflow when SEMANTIC_RELEASE=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool', SEMANTIC_RELEASE: '1' });
    expect(existsSync(join(tmpDir, '.github/workflows/semantic-release.yml'))).toBe(true);
    const content = readFileSync(join(tmpDir, '.github/workflows/semantic-release.yml'), 'utf-8');
    expect(content).toContain('semantic-release');
    expect(content).toContain('NPM_TOKEN');
  });

  it('does not create release files when SEMANTIC_RELEASE=0', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool', SEMANTIC_RELEASE: '0' });
    expect(existsSync(join(tmpDir, 'release.config.mjs'))).toBe(false);
    expect(existsSync(join(tmpDir, '.github/workflows/semantic-release.yml'))).toBe(false);
  });

  it('README includes semantic-release section when enabled', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { CLI_FRAMEWORK: 'commander', CLI_NAME: 'my-tool', SEMANTIC_RELEASE: '1' });
    const content = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(content).toContain('semantic-release');
  });
});
