import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject() {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-secrets-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-secrets', version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', PROJECT_TYPE: 'backend', BACKEND_FRAMEWORK: 'hono', ...extraEnv },
    stdio: 'pipe',
  });
}

describe('secret capture env bootstrap', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes .env.example and .env.local with captured secret values', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      SETUP_DATABASE: '1',
      DB_ENGINE: 'postgresql',
      DB_ORM: 'none',
      SECRET_CAPTURE: '1',
      SECRET_DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/app',
      SECRET_APP_SECRET: 'local-dev-secret',
    });

    expect(existsSync(join(tmpDir, '.env.example'))).toBe(true);
    expect(existsSync(join(tmpDir, '.env.local'))).toBe(true);

    const envExample = readFileSync(join(tmpDir, '.env.example'), 'utf-8');
    expect(envExample).toContain('DATABASE_URL=');
    expect(envExample).toContain('APP_SECRET=');

    const envLocal = readFileSync(join(tmpDir, '.env.local'), 'utf-8');
    expect(envLocal).toContain('DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app');
    expect(envLocal).toContain('APP_SECRET=local-dev-secret');
  });
});
