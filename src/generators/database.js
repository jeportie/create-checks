import fs from 'fs-extra';
import path from 'node:path';

const engineMeta = {
  postgresql: {
    label: 'PostgreSQL',
    url: 'postgresql://postgres:postgres@localhost:5432/app',
    dockerImage: 'postgres:16-alpine',
    dockerEnv: ['POSTGRES_USER=postgres', 'POSTGRES_PASSWORD=postgres', 'POSTGRES_DB=app'],
    dockerPort: '5432:5432',
    drizzleDialect: 'postgresql',
    prismaProvider: 'postgresql',
  },
  mysql: {
    label: 'MySQL',
    url: 'mysql://root:root@localhost:3306/app',
    dockerImage: 'mysql:8',
    dockerEnv: ['MYSQL_ROOT_PASSWORD=root', 'MYSQL_DATABASE=app'],
    dockerPort: '3306:3306',
    drizzleDialect: 'mysql',
    prismaProvider: 'mysql',
  },
  mariadb: {
    label: 'MariaDB',
    url: 'mysql://root:root@localhost:3306/app',
    dockerImage: 'mariadb:11',
    dockerEnv: ['MARIADB_ROOT_PASSWORD=root', 'MARIADB_DATABASE=app'],
    dockerPort: '3306:3306',
    drizzleDialect: 'mysql',
    prismaProvider: 'mysql',
  },
  sqlite: {
    label: 'SQLite',
    url: 'file:./dev.db',
    dockerImage: null,
    dockerEnv: [],
    dockerPort: null,
    drizzleDialect: 'sqlite',
    prismaProvider: 'sqlite',
  },
  mongodb: {
    label: 'MongoDB',
    url: 'mongodb://localhost:27017/app',
    dockerImage: 'mongo:7',
    dockerEnv: [],
    dockerPort: '27017:27017',
    drizzleDialect: null,
    prismaProvider: 'mongodb',
  },
};

function renderRawIndex(engine) {
  if (engine === 'postgresql') {
    return `import { Pool } from 'pg';

export const db = new Pool({ connectionString: process.env.DATABASE_URL });
`;
  }

  if (engine === 'mysql' || engine === 'mariadb') {
    return `import mysql from 'mysql2/promise';

export const db = mysql.createPool(process.env.DATABASE_URL ?? '');
`;
  }

  return `import Database from 'better-sqlite3';

export const db = new Database('dev.db');
`;
}

function renderDrizzleIndex(engine) {
  if (engine === 'postgresql') {
    return `import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool });
`;
  }

  if (engine === 'mysql' || engine === 'mariadb') {
    return `import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = mysql.createPool(process.env.DATABASE_URL ?? '');
export const db = drizzle({ client: connection });
`;
  }

  return `import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('dev.db');
export const db = drizzle({ client: sqlite });
`;
}

function renderRawMigrationRunner(engine) {
  if (engine === 'postgresql') {
    return `import fs from 'node:fs/promises';
import path from 'node:path';

import { db } from './index';

const migrationsDir = path.join(process.cwd(), 'src/db/migrations');

async function ensureMigrationsTable() {
  await db.query(
    'CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
  );
}

async function getAppliedMigrations() {
  const result = await db.query('SELECT name FROM _migrations');
  return new Set(result.rows.map((row) => String(row.name)));
}

async function applyMigration(name, sql) {
  await db.query('BEGIN');
  try {
    await db.query(sql);
    await db.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

export async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
    await applyMigration(file, sql);
    console.log('applied migration', file);
  }
}
`;
  }

  if (engine === 'mysql' || engine === 'mariadb') {
    return `import fs from 'node:fs/promises';
import path from 'node:path';

import { db } from './index';

const migrationsDir = path.join(process.cwd(), 'src/db/migrations');

async function ensureMigrationsTable() {
  await db.query(
    'CREATE TABLE IF NOT EXISTS _migrations (name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  );
}

async function getAppliedMigrations() {
  const [rows] = await db.query('SELECT name FROM _migrations');
  return new Set(rows.map((row) => String(row.name)));
}

async function applyMigration(name, sql) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(sql);
    await connection.query('INSERT INTO _migrations (name) VALUES (?)', [name]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
    await applyMigration(file, sql);
    console.log('applied migration', file);
  }
}
`;
  }

  return `import fs from 'node:fs/promises';
import path from 'node:path';

import { db } from './index';

const migrationsDir = path.join(process.cwd(), 'src/db/migrations');

function ensureMigrationsTable() {
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
}

function getAppliedMigrations() {
  const rows = db.prepare('SELECT name FROM _migrations').all();
  return new Set(rows.map((row) => String(row.name)));
}

function applyMigration(name, sql) {
  const run = db.transaction((migrationName, migrationSql) => {
    db.exec(migrationSql);
    db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(migrationName, new Date().toISOString());
  });

  run(name, sql);
}

export async function runMigrations() {
  ensureMigrationsTable();
  const applied = getAppliedMigrations();
  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
    applyMigration(file, sql);
    console.log('applied migration', file);
  }
}
`;
}

function renderDrizzleConfig(engine, url) {
  const dialect = engineMeta[engine].drizzleDialect;
  return `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: '${dialect}',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '${url}',
  },
});
`;
}

function renderDbConnectivityTest(engine, orm) {
  const importLine =
    orm === 'mongoose' ? "import { connectDb } from '../../src/db';" : "import { db } from '../../src/db';";

  let connectivityBody = '';
  if (orm === 'mongoose') {
    connectivityBody = `
    await connectDb();
    expect(true).toBe(true);
`;
  } else if (orm === 'prisma') {
    connectivityBody = `
    // Generic health check query through Prisma
    const result = await db.$queryRaw\`SELECT 1 as ok\`;
    expect(result).toBeDefined();
`;
  } else if (engine === 'sqlite') {
    connectivityBody = `
    const result = db.prepare('SELECT 1 as ok').get();
    expect(result.ok).toBe(1);
`;
  } else {
    connectivityBody = `
    const result = await db.query('SELECT 1 as ok');
    const row = Array.isArray(result?.rows) ? result.rows[0] : result?.[0]?.[0] ?? result?.[0];
    expect(row).toBeDefined();
`;
  }

  return `import { describe, expect, it } from 'vitest';

${importLine}

describe('database connectivity', () => {
  it('executes a basic query path when DATABASE_URL is configured', async () => {
    if (!process.env.DATABASE_URL && '${engine}' !== 'sqlite') {
      // Starter guard: provide env then remove this guard for strict CI usage.
      return;
    }
${connectivityBody}
  });
});
`;
}

function renderPrismaSchema(engine) {
  const provider = engineMeta[engine].prismaProvider;
  return `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

model Example {
  id Int @id @default(autoincrement())
}
`;
}

function renderDockerDbService(engine) {
  const meta = engineMeta[engine];
  if (!meta || !meta.dockerImage) return '';

  const envLines = meta.dockerEnv.map((value) => `      - ${value}`).join('\n');
  const envBlock = envLines ? `\n    environment:\n${envLines}` : '';
  const portBlock = meta.dockerPort ? `\n    ports:\n      - '${meta.dockerPort}'` : '';

  return `\n  db:\n    image: ${meta.dockerImage}${portBlock}${envBlock}\n`;
}

async function upsertEnvExample(cwd, url) {
  const envPath = path.join(cwd, '.env.example');
  let content = '';
  if (await fs.pathExists(envPath)) {
    content = await fs.readFile(envPath, 'utf-8');
  }

  const lines = content
    .split('\n')
    .filter(Boolean)
    .filter((line) => !line.startsWith('DATABASE_URL='));
  lines.push(`DATABASE_URL=${url}`);
  await fs.writeFile(envPath, `${lines.join('\n')}\n`);
}

async function patchBackendEnvForDatabase(cwd) {
  const envPath = path.join(cwd, 'src/env.ts');
  if (!(await fs.pathExists(envPath))) return;

  const content = await fs.readFile(envPath, 'utf-8');
  if (content.includes('DATABASE_URL')) return;

  if (content.includes('const envSchema = z.object({')) {
    const next = content.replace(
      'const envSchema = z.object({',
      'const envSchema = z.object({\n  DATABASE_URL: z.string().min(1),',
    );
    await fs.writeFile(envPath, next);
    return;
  }

  if (content.includes('export const env = {')) {
    const next = content.replace(
      'export const env = {',
      "export const env = {\n  DATABASE_URL: process.env.DATABASE_URL ?? '',",
    );
    await fs.writeFile(envPath, next);
  }
}

async function upsertRedisEnvExample(cwd) {
  const envPath = path.join(cwd, '.env.example');
  let content = '';
  if (await fs.pathExists(envPath)) {
    content = await fs.readFile(envPath, 'utf-8');
  }

  const lines = content
    .split('\n')
    .filter(Boolean)
    .filter((line) => !line.startsWith('REDIS_URL='));
  lines.push('REDIS_URL=redis://localhost:6379');
  await fs.writeFile(envPath, `${lines.join('\n')}\n`);
}

async function appendReadmeSection(cwd, engine, orm) {
  const readmePath = path.join(cwd, 'README.md');
  if (!(await fs.pathExists(readmePath))) return;

  const content = await fs.readFile(readmePath, 'utf-8');
  if (content.includes('## Database')) return;

  const ormLabel = orm === 'none' ? 'Raw driver + SQL migrations' : orm;
  const migrationCommand =
    orm === 'none'
      ? 'node --import tsx src/db/migrate.ts'
      : orm === 'drizzle'
        ? 'npx drizzle-kit generate && npx drizzle-kit migrate'
        : orm === 'prisma'
          ? 'npx prisma migrate dev'
          : 'npx prisma db push';

  const smokeExample =
    engine === 'mongodb'
      ? 'await connectDb();\nconst count = await Example.countDocuments();\nconsole.log({ count });'
      : orm === 'prisma'
        ? 'const rows = await db.example.findMany({ take: 1 });\nconsole.log({ rows });'
        : "const rows = await db.query?.('SELECT 1 as ok') ?? [{ ok: 1 }];\nconsole.log({ rows });";

  const section = `

## Database

- Engine: ${engineMeta[engine].label}
- Data access: ${ormLabel}

### Quick start

1. Copy env values and set your connection string:

\`\`\`bash
cp .env.example .env
# set DATABASE_URL in .env
\`\`\`

2. Apply schema/migrations:

\`\`\`bash
${migrationCommand}
\`\`\`

### Daily workflow

- Update models/schema in \`src/db/\` (or \`prisma/schema.prisma\`)
- Re-run migrations after schema changes
- Keep \`DATABASE_URL\` aligned with your local/staging environment

### Basic query smoke test

\`\`\`ts
${smokeExample}
\`\`\`
`;
  await fs.writeFile(readmePath, `${content}${section}`);
}

async function appendRedisReadmeSection(cwd) {
  const readmePath = path.join(cwd, 'README.md');
  if (!(await fs.pathExists(readmePath))) return;

  const content = await fs.readFile(readmePath, 'utf-8');
  if (content.includes('## Redis')) return;

  const section = `

## Redis

- Client: ioredis
- Connection: \`REDIS_URL\`

### Quick start

\`\`\`bash
cp .env.example .env
# set REDIS_URL in .env
\`\`\`

### Starter usage

\`\`\`ts
import { redis } from './src/redis';

await redis.ping();
\`\`\`
`;

  await fs.writeFile(readmePath, `${content}${section}`);
}

async function patchDockerCompose(cwd, engine) {
  const composePath = path.join(cwd, 'docker-compose.yml');
  if (!(await fs.pathExists(composePath))) return;
  if (engine === 'sqlite') return;

  const content = await fs.readFile(composePath, 'utf-8');
  if (content.includes('\n  db:\n')) return;

  const service = renderDockerDbService(engine);
  await fs.writeFile(composePath, `${content}${service}`);
}

async function patchDockerComposeRedis(cwd) {
  const composePath = path.join(cwd, 'docker-compose.yml');
  if (!(await fs.pathExists(composePath))) return;

  const content = await fs.readFile(composePath, 'utf-8');
  if (content.includes('\n  redis:\n')) return;

  const redisService = `
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
`;

  await fs.writeFile(composePath, `${content}${redisService}`);
}

export async function generateDatabase(answers, cwd) {
  if (!answers.setupDatabase) return;

  const engine = answers.databaseEngine ?? 'postgresql';
  const orm = answers.databaseOrm ?? (engine === 'mongodb' ? 'mongoose' : 'none');
  const meta = engineMeta[engine];

  if (!meta) return;

  const dbDir = path.join(cwd, 'src/db');
  await fs.ensureDir(dbDir);
  const testDir = path.join(cwd, 'tests/integration');
  await fs.ensureDir(testDir);

  if (orm === 'none') {
    await fs.writeFile(path.join(dbDir, 'index.ts'), renderRawIndex(engine));
    await fs.writeFile(path.join(dbDir, 'migrate.ts'), renderRawMigrationRunner(engine));
    await fs.ensureDir(path.join(dbDir, 'migrations'));
    await fs.writeFile(
      path.join(dbDir, 'migrations/001_initial.sql'),
      'CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);\n',
    );
  }

  if (orm === 'drizzle') {
    await fs.writeFile(path.join(dbDir, 'index.ts'), renderDrizzleIndex(engine));
    await fs.writeFile(
      path.join(dbDir, 'schema.ts'),
      `// Add your Drizzle schema here.\nexport const schemaVersion = 1;\n`,
    );
    await fs.writeFile(path.join(cwd, 'drizzle.config.ts'), renderDrizzleConfig(engine, meta.url));
  }

  if (orm === 'prisma') {
    await fs.ensureDir(path.join(cwd, 'prisma'));
    await fs.writeFile(
      path.join(dbDir, 'index.ts'),
      `import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();
`,
    );
    await fs.writeFile(path.join(cwd, 'prisma/schema.prisma'), renderPrismaSchema(engine));
  }

  if (orm === 'mongoose') {
    await fs.ensureDir(path.join(dbDir, 'models'));
    await fs.writeFile(
      path.join(dbDir, 'index.ts'),
      `import mongoose from 'mongoose';

export async function connectDb() {
  await mongoose.connect(process.env.DATABASE_URL ?? '${meta.url}');
}
`,
    );
    await fs.writeFile(
      path.join(dbDir, 'models/example.ts'),
      `import { Schema, model } from 'mongoose';

const exampleSchema = new Schema({ name: { type: String, required: true } });
export const Example = model('Example', exampleSchema);
`,
    );
  }

  await fs.writeFile(path.join(testDir, 'db-connectivity.int.test.ts'), renderDbConnectivityTest(engine, orm));

  await upsertEnvExample(cwd, meta.url);
  await patchBackendEnvForDatabase(cwd);
  await appendReadmeSection(cwd, engine, orm);

  if (answers.setupRedis) {
    const redisDir = path.join(cwd, 'src/redis');
    await fs.ensureDir(redisDir);
    await fs.writeFile(
      path.join(redisDir, 'index.ts'),
      `import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

export async function checkRedisConnection() {
  return await redis.ping();
}
`,
    );
    await upsertRedisEnvExample(cwd);
    await appendRedisReadmeSection(cwd);

    if (answers.setupDocker) {
      await patchDockerComposeRedis(cwd);
    }
  }

  if (answers.setupDocker) {
    await patchDockerCompose(cwd, engine);
  }
}
