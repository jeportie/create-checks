import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject() {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-cicd-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-cicd', version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', PROJECT_TYPE: 'backend', BACKEND_FRAMEWORK: 'hono', ...extraEnv },
    stdio: 'pipe',
  });
}

describe('cicd option', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates ci.yml with PR trigger and npm run check', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SETUP_CICD: '1' });

    const ci = readFileSync(join(tmpDir, '.github/workflows/ci.yml'), 'utf-8');
    expect(ci).toContain('pull_request');
    expect(ci).toContain('npm run check');
    expect(ci).toContain('actions/checkout@v4');
    expect(ci).toContain('node-version: 22');
  });

  it('does NOT generate deploy workflows', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SETUP_CICD: '1' });

    expect(existsSync(join(tmpDir, '.github/workflows/deploy-staging.yml'))).toBe(false);
    expect(existsSync(join(tmpDir, '.github/workflows/deploy-production.yml'))).toBe(false);
  });

  it('does NOT generate SECRETS.md', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SETUP_CICD: '1' });

    expect(existsSync(join(tmpDir, '.github/SECRETS.md'))).toBe(false);
  });

  it('skips all workflow generation when SETUP_CICD=0', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SETUP_CICD: '0' });

    expect(existsSync(join(tmpDir, '.github/workflows/ci.yml'))).toBe(false);
  });

  it('generates ci.yml for frontend projects', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { PROJECT_TYPE: 'frontend', SETUP_CICD: '1' });

    expect(existsSync(join(tmpDir, '.github/workflows/ci.yml'))).toBe(true);
    const ci = readFileSync(join(tmpDir, '.github/workflows/ci.yml'), 'utf-8');
    expect(ci).toContain('npm run check');
  });

  it('does NOT generate ci.yml for npm-lib (has its own PR workflow)', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { PROJECT_TYPE: 'npm-lib', SETUP_CICD: '1', SEMANTIC_RELEASE: '0' });

    expect(existsSync(join(tmpDir, '.github/workflows/ci.yml'))).toBe(false);
    // npm-lib always gets its own pull-request-checks.yml
    expect(existsSync(join(tmpDir, '.github/workflows/pull-request-checks.yml'))).toBe(true);
  });

  it('ci.yml does not contain individual lint/typecheck/test steps', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { SETUP_CICD: '1' });

    const ci = readFileSync(join(tmpDir, '.github/workflows/ci.yml'), 'utf-8');
    expect(ci).not.toContain('npm run lint');
    expect(ci).not.toContain('npm run typecheck');
    expect(ci).not.toContain('npm test');
  });
});
