import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject() {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-database-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-database', version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', PROJECT_TYPE: 'backend', BACKEND_FRAMEWORK: 'hono', ...extraEnv },
    stdio: 'pipe',
  });
}

const combinations = [
  ['postgresql', 'none'],
  ['postgresql', 'drizzle'],
  ['postgresql', 'prisma'],
  ['mysql', 'none'],
  ['mysql', 'drizzle'],
  ['mysql', 'prisma'],
  ['mariadb', 'none'],
  ['mariadb', 'drizzle'],
  ['mariadb', 'prisma'],
  ['sqlite', 'none'],
  ['sqlite', 'drizzle'],
  ['sqlite', 'prisma'],
  ['mongodb', 'mongoose'],
];

describe('database scaffold', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it.each(combinations)('scaffolds backend database for %s + %s', (engine, orm) => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      SETUP_DATABASE: '1',
      DB_ENGINE: engine,
      DB_ORM: orm,
      DOCKER: '0',
      VITEST_PRESET: 'native',
    });

    expect(existsSync(join(tmpDir, 'src/db/index.ts'))).toBe(true);
    expect(existsSync(join(tmpDir, '.env.example'))).toBe(true);

    if (orm === 'none') {
      expect(existsSync(join(tmpDir, 'src/db/migrate.ts'))).toBe(true);
      expect(existsSync(join(tmpDir, 'src/db/migrations/001_initial.sql'))).toBe(true);
    }

    if (orm === 'drizzle') {
      expect(existsSync(join(tmpDir, 'drizzle.config.ts'))).toBe(true);
      expect(existsSync(join(tmpDir, 'src/db/schema.ts'))).toBe(true);
    }

    if (orm === 'prisma') {
      expect(existsSync(join(tmpDir, 'prisma/schema.prisma'))).toBe(true);
    }

    if (orm === 'mongoose') {
      expect(existsSync(join(tmpDir, 'src/db/models/example.ts'))).toBe(true);
    }
  });

  it('adds a database docker service when docker is enabled', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      SETUP_DATABASE: '1',
      DB_ENGINE: 'postgresql',
      DB_ORM: 'drizzle',
      DOCKER: '1',
    });

    const compose = readFileSync(join(tmpDir, 'docker-compose.yml'), 'utf-8');
    expect(compose).toContain('db:');
    expect(compose).toContain('postgres');
  });

  it('writes a connection string template in .env.example', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      SETUP_DATABASE: '1',
      DB_ENGINE: 'mysql',
      DB_ORM: 'none',
      DOCKER: '0',
    });

    const envExample = readFileSync(join(tmpDir, '.env.example'), 'utf-8');
    expect(envExample).toContain('DATABASE_URL=');
    expect(envExample).toContain('mysql://');
  });

  it('adds a README database section', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      SETUP_DATABASE: '1',
      DB_ENGINE: 'sqlite',
      DB_ORM: 'none',
      DOCKER: '0',
    });

    const readme = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(readme).toContain('## Database');
    expect(readme).toContain('SQLite');
    expect(readme).toContain('### Quick start');
    expect(readme).toContain('DATABASE_URL');
    expect(readme).toContain('### Daily workflow');
    expect(readme).toContain('### Basic query smoke test');
  });

  it('creates a raw migration runner that executes sql files in sorted order', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      SETUP_DATABASE: '1',
      DB_ENGINE: 'postgresql',
      DB_ORM: 'none',
      DOCKER: '0',
    });

    const migrate = readFileSync(join(tmpDir, 'src/db/migrate.ts'), 'utf-8');
    expect(migrate).toContain('.sort(');
    expect(migrate).toContain('_migrations');
    expect(migrate).toContain('readFile');
  });
});
