import fs from 'fs-extra';
import path from 'node:path';
import pc from 'picocolors';

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

function logGeneratedFile(cwd, absolutePath) {
  const relative = path.relative(cwd, absolutePath).split(path.sep).join('/');
  console.log(pc.green('✔') + `    ${relative}`);
}

function renderRawIndex(engine) {
  if (engine === 'postgresql') {
    return `import { Pool } from 'pg';

import { getDatabaseUrl } from './config';

export const db = new Pool({ connectionString: getDatabaseUrl() });
`;
  }

  if (engine === 'mysql' || engine === 'mariadb') {
    return `import mysql from 'mysql2/promise';

import { getDatabaseUrl } from './config';

export const db = mysql.createPool(getDatabaseUrl());
`;
  }

  return `import Database from 'better-sqlite3';

import { getSqliteFilePath } from './config';

export const db = new Database(getSqliteFilePath());
`;
}

function renderDrizzleIndex(engine) {
  if (engine === 'postgresql') {
    return `import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { getDatabaseUrl } from './config';

const pool = new Pool({ connectionString: getDatabaseUrl() });
export const db = drizzle({ client: pool });
`;
  }

  if (engine === 'mysql' || engine === 'mariadb') {
    return `import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

import { getDatabaseUrl } from './config';

const connection = mysql.createPool(getDatabaseUrl());
export const db = drizzle({ client: connection });
`;
  }

  return `import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

import { getSqliteFilePath } from './config';

const sqlite = new Database(getSqliteFilePath());
export const db = drizzle({ client: sqlite });
`;
}

function renderDrizzleSchema(engine) {
  if (engine === 'postgresql') {
    return `import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
`;
  }

  if (engine === 'mysql' || engine === 'mariadb') {
    return `import { int, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
`;
  }

  return `import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  createdAt: text('created_at').notNull(),
});
`;
}

function renderDbConfig(engine) {
  const defaultUrl = engineMeta[engine].url;

  if (engine === 'sqlite') {
    return `export const defaultDatabaseUrl = '${defaultUrl}';

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? defaultDatabaseUrl;
}

export function getSqliteFilePath() {
  const url = getDatabaseUrl();
  if (url.startsWith('file:')) {
    return url.slice('file:'.length);
  }

  return url;
}
`;
  }

  return `export const defaultDatabaseUrl = '${defaultUrl}';

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? defaultDatabaseUrl;
}
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
  const imports = ["import { describe, expect, it } from 'vitest';", importLine];

  if (orm === 'drizzle') {
    imports.unshift("import { sql } from 'drizzle-orm';");
  }

  let connectivityBody = '';
  if (orm === 'mongoose') {
    connectivityBody = `
    await connectDb();
    expect(true).toBe(true);
`;
  } else if (orm === 'drizzle') {
    connectivityBody =
      engine === 'sqlite'
        ? `
    const result = await db.run(sql\`SELECT 1 as ok\`);
    expect(result).toBeDefined();
`
        : `
    const result = await db.execute(sql\`SELECT 1 as ok\`);
    expect(result).toBeDefined();
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

  return `${imports.join('\n')}

describe('database connectivity', () => {
  it('executes a basic query path when DATABASE_URL is configured', async () => {
    if (!process.env.DATABASE_URL && process.env.CI !== 'true') {
      // Starter guard: provide env then remove this guard for strict CI usage.
      return;
    }
${connectivityBody}
  });
});
`;
}

function renderDbConfigUnitTest(engine) {
  if (engine === 'sqlite') {
    return `import { describe, expect, it } from 'vitest';

import { getDatabaseUrl, getSqliteFilePath } from '../../src/db/config';

describe('db config starter', () => {
  it('exposes sqlite url and file path', () => {
    expect(getDatabaseUrl()).toContain('file:');
    expect(getSqliteFilePath().length).toBeGreaterThan(0);
  });
});
`;
  }

  return `import { describe, expect, it } from 'vitest';

import { getDatabaseUrl } from '../../src/db/config';

describe('db config starter', () => {
  it('exposes database url', () => {
    expect(getDatabaseUrl().length).toBeGreaterThan(0);
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

async function patchBackendEnvForDatabase(cwd, defaultUrl) {
  const envPath = path.join(cwd, 'src/env.ts');
  if (!(await fs.pathExists(envPath))) return;

  const content = await fs.readFile(envPath, 'utf-8');
  if (content.includes('DATABASE_URL')) return;

  const serializedDefaultUrl = JSON.stringify(defaultUrl);

  if (content.includes('const envSchema = z.object({')) {
    const next = content.replace(
      'const envSchema = z.object({',
      `const envSchema = z.object({\n  DATABASE_URL: z.string().min(1).default(${serializedDefaultUrl}),`,
    );
    await fs.writeFile(envPath, next);
    return;
  }

  if (content.includes('export const env = {')) {
    const next = content.replace(
      'export const env = {',
      `export const env = {\n  DATABASE_URL: process.env.DATABASE_URL ?? ${serializedDefaultUrl},`,
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

async function patchDockerCompose(cwd, engine) {
  const composePath = path.join(cwd, 'docker-compose.yml');
  if (!(await fs.pathExists(composePath))) return false;
  if (engine === 'sqlite') return false;

  const content = await fs.readFile(composePath, 'utf-8');
  if (content.includes('\n  db:\n')) return false;

  const service = renderDockerDbService(engine);
  await fs.writeFile(composePath, `${content}${service}`);
  return true;
}

async function patchDockerComposeRedis(cwd) {
  const composePath = path.join(cwd, 'docker-compose.yml');
  if (!(await fs.pathExists(composePath))) return false;

  const content = await fs.readFile(composePath, 'utf-8');
  if (content.includes('\n  redis:\n')) return false;

  const redisService = `
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
`;

  await fs.writeFile(composePath, `${content}${redisService}`);
  return true;
}

export async function generateDatabase(answers, cwd) {
  if (!answers.setupDatabase) return;

  const engine = answers.databaseEngine ?? 'postgresql';
  const orm = answers.databaseOrm ?? (engine === 'mongodb' ? 'mongoose' : 'none');
  const meta = engineMeta[engine];

  if (!meta) return;

  console.log(pc.green('→') + '  generating database starter files...');

  const dbDir = path.join(cwd, 'src/db');
  await fs.ensureDir(dbDir);
  const dbConfigPath = path.join(dbDir, 'config.ts');
  await fs.writeFile(dbConfigPath, renderDbConfig(engine));
  logGeneratedFile(cwd, dbConfigPath);

  const testDir = path.join(cwd, 'tests/integration');
  await fs.ensureDir(testDir);

  const unitTestDir = path.join(cwd, 'tests/unit');
  await fs.ensureDir(unitTestDir);

  if (orm === 'none') {
    const dbIndexPath = path.join(dbDir, 'index.ts');
    await fs.writeFile(dbIndexPath, renderRawIndex(engine));
    logGeneratedFile(cwd, dbIndexPath);

    const migratePath = path.join(dbDir, 'migrate.ts');
    await fs.writeFile(migratePath, renderRawMigrationRunner(engine));
    logGeneratedFile(cwd, migratePath);

    await fs.ensureDir(path.join(dbDir, 'migrations'));
    const initialMigrationPath = path.join(dbDir, 'migrations/001_initial.sql');
    await fs.writeFile(
      initialMigrationPath,
      'CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);\n',
    );
    logGeneratedFile(cwd, initialMigrationPath);
  }

  if (orm === 'drizzle') {
    const dbIndexPath = path.join(dbDir, 'index.ts');
    await fs.writeFile(dbIndexPath, renderDrizzleIndex(engine));
    logGeneratedFile(cwd, dbIndexPath);

    const schemaPath = path.join(dbDir, 'schema.ts');
    await fs.writeFile(schemaPath, renderDrizzleSchema(engine));
    logGeneratedFile(cwd, schemaPath);

    const drizzleConfigPath = path.join(cwd, 'drizzle.config.ts');
    await fs.writeFile(drizzleConfigPath, renderDrizzleConfig(engine, meta.url));
    logGeneratedFile(cwd, drizzleConfigPath);
  }

  if (orm === 'prisma') {
    await fs.ensureDir(path.join(cwd, 'prisma'));
    const dbIndexPath = path.join(dbDir, 'index.ts');
    await fs.writeFile(
      dbIndexPath,
      `import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();
`,
    );
    logGeneratedFile(cwd, dbIndexPath);

    const prismaSchemaPath = path.join(cwd, 'prisma/schema.prisma');
    await fs.writeFile(prismaSchemaPath, renderPrismaSchema(engine));
    logGeneratedFile(cwd, prismaSchemaPath);
  }

  if (orm === 'mongoose') {
    await fs.ensureDir(path.join(dbDir, 'models'));
    const dbIndexPath = path.join(dbDir, 'index.ts');
    await fs.writeFile(
      dbIndexPath,
      `import mongoose from 'mongoose';

import { getDatabaseUrl } from './config';

export async function connectDb() {
  await mongoose.connect(getDatabaseUrl());
}
`,
    );
    logGeneratedFile(cwd, dbIndexPath);

    const exampleModelPath = path.join(dbDir, 'models/example.ts');
    await fs.writeFile(
      exampleModelPath,
      `import { Schema, model } from 'mongoose';

const exampleSchema = new Schema({ name: { type: String, required: true } });
export const Example = model('Example', exampleSchema);
`,
    );
    logGeneratedFile(cwd, exampleModelPath);
  }

  const dbConnectivityPath = path.join(testDir, 'db-connectivity.int.test.ts');
  await fs.writeFile(dbConnectivityPath, renderDbConnectivityTest(engine, orm));
  logGeneratedFile(cwd, dbConnectivityPath);

  const dbConfigUnitTestPath = path.join(unitTestDir, 'db-config.unit.test.ts');
  await fs.writeFile(dbConfigUnitTestPath, renderDbConfigUnitTest(engine));
  logGeneratedFile(cwd, dbConfigUnitTestPath);

  await upsertEnvExample(cwd, meta.url);
  await patchBackendEnvForDatabase(cwd, meta.url);
  logGeneratedFile(cwd, path.join(cwd, '.env.example'));
  logGeneratedFile(cwd, path.join(cwd, 'src/env.ts'));

  if (answers.setupRedis) {
    const redisDir = path.join(cwd, 'src/redis');
    await fs.ensureDir(redisDir);
    const redisIndexPath = path.join(redisDir, 'index.ts');
    await fs.writeFile(
      redisIndexPath,
      `import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

export async function checkRedisConnection() {
  return await redis.ping();
}
`,
    );
    logGeneratedFile(cwd, redisIndexPath);

    await upsertRedisEnvExample(cwd);
    logGeneratedFile(cwd, path.join(cwd, '.env.example'));

    if (answers.setupDocker) {
      const patchedRedisService = await patchDockerComposeRedis(cwd);
      if (patchedRedisService) {
        logGeneratedFile(cwd, path.join(cwd, 'docker-compose.yml'));
      }
    }
  }

  if (answers.setupDocker) {
    const patchedDbService = await patchDockerCompose(cwd, engine);
    if (patchedDbService) {
      logGeneratedFile(cwd, path.join(cwd, 'docker-compose.yml'));
    }
  }
}
