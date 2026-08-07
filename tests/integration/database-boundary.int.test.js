import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject(name = 'test-boundary') {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-db-boundary-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', ...extraEnv },
    stdio: 'pipe',
  });
}

describe('database capability boundary', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('enables database scaffolding for backend projects', () => {
    tmpDir = createTmpProject('test-backend-boundary');
    runCli(tmpDir, {
      PROJECT_TYPE: 'backend',
      BACKEND_FRAMEWORK: 'hono',
      SETUP_DATABASE: '1',
      DB_ENGINE: 'postgresql',
      DB_ORM: 'none',
      DOCKER: '0',
    });

    expect(existsSync(join(tmpDir, 'src/db/index.ts'))).toBe(true);
  });

  it('does not scaffold database for non-backend project types', () => {
    tmpDir = createTmpProject('test-frontend-boundary');
    runCli(tmpDir, {
      PROJECT_TYPE: 'frontend',
      SETUP_DATABASE: '1',
      DB_ENGINE: 'postgresql',
      DB_ORM: 'none',
    });

    expect(existsSync(join(tmpDir, 'src/db'))).toBe(false);
    const readme = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(readme).not.toContain('## Database');
  });
});
