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

  it('adds db-focused docker scripts when database + docker are enabled', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      SETUP_DATABASE: '1',
      DB_ENGINE: 'postgresql',
      DB_ORM: 'drizzle',
      DOCKER: '1',
    });

    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('docker:db:up');
    expect(pkg.scripts).toHaveProperty('docker:db:down');
    expect(pkg.scripts).toHaveProperty('docker:db:logs');
    expect(pkg.scripts).toHaveProperty('docker:db:shell');
    expect(pkg.scripts).toHaveProperty('docker:db:migrate');
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

  it('wires DATABASE_URL into src/env.ts validation when zod is enabled', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      SETUP_DATABASE: '1',
      DB_ENGINE: 'postgresql',
      DB_ORM: 'drizzle',
      DOCKER: '0',
      BACKEND_ZOD: '1',
    });

    const envFile = readFileSync(join(tmpDir, 'src/env.ts'), 'utf-8');
    expect(envFile).toContain('DATABASE_URL');
    expect(envFile).toContain('z.string().min(1)');
  });

  it('wires DATABASE_URL into src/env.ts when zod is disabled', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      SETUP_DATABASE: '1',
      DB_ENGINE: 'postgresql',
      DB_ORM: 'drizzle',
      DOCKER: '0',
      BACKEND_ZOD: '0',
    });

    const envFile = readFileSync(join(tmpDir, 'src/env.ts'), 'utf-8');
    expect(envFile).toContain('DATABASE_URL');
    expect(envFile).toContain('process.env.DATABASE_URL');
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

  it('creates a DB connectivity integration test starter', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      SETUP_DATABASE: '1',
      DB_ENGINE: 'postgresql',
      DB_ORM: 'drizzle',
      DOCKER: '0',
      VITEST_PRESET: 'native',
    });

    const testFile = join(tmpDir, 'tests/integration/db-connectivity.int.test.ts');
    expect(existsSync(testFile)).toBe(true);
    const content = readFileSync(testFile, 'utf-8');
    expect(content).toContain('database connectivity');
    expect(content).toContain('DATABASE_URL');
    expect(content).toContain('SELECT 1');
  });

  it('adds engine and ORM aware DB scripts for drizzle + postgresql', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      SETUP_DATABASE: '1',
      DB_ENGINE: 'postgresql',
      DB_ORM: 'drizzle',
      DOCKER: '0',
    });

    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('db:generate');
    expect(pkg.scripts).toHaveProperty('db:migrate');
    expect(pkg.scripts).toHaveProperty('db:studio');
    expect(pkg.scripts).toHaveProperty('db:shell');
    expect(pkg.scripts['db:migrate']).toContain('drizzle-kit');
    expect(pkg.scripts['db:shell']).toContain('psql');
  });

  it('adds engine and ORM aware DB scripts for prisma + mysql', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      SETUP_DATABASE: '1',
      DB_ENGINE: 'mysql',
      DB_ORM: 'prisma',
      DOCKER: '0',
    });

    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts['db:generate']).toContain('prisma generate');
    expect(pkg.scripts['db:migrate']).toContain('prisma migrate dev');
    expect(pkg.scripts['db:studio']).toContain('prisma studio');
    expect(pkg.scripts['db:shell']).toContain('mysql');
  });

  it('adds raw migration scripts for none ORM + sqlite', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      SETUP_DATABASE: '1',
      DB_ENGINE: 'sqlite',
      DB_ORM: 'none',
      DOCKER: '0',
    });

    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts['db:migrate']).toContain('src/db/migrate.ts');
    expect(pkg.scripts['db:shell']).toContain('sqlite3');
  });

  it('generates redis starter files, env, docker service and docs when redis is enabled', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      SETUP_DATABASE: '1',
      DB_ENGINE: 'postgresql',
      DB_ORM: 'none',
      SETUP_REDIS: '1',
      DOCKER: '1',
    });

    expect(existsSync(join(tmpDir, 'src/redis/index.ts'))).toBe(true);

    const envExample = readFileSync(join(tmpDir, '.env.example'), 'utf-8');
    expect(envExample).toContain('REDIS_URL=');

    const compose = readFileSync(join(tmpDir, 'docker-compose.yml'), 'utf-8');
    expect(compose).toContain('\n  redis:\n');
    expect(compose).toContain('redis:7-alpine');

    const readme = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(readme).toContain('## Redis');
    expect(readme).toContain('REDIS_URL');
  });
});
