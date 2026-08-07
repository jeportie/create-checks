import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject() {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-backend-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-backend', version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  return execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', PROJECT_TYPE: 'backend', ...extraEnv },
    stdio: 'pipe',
    encoding: 'utf-8',
  });
}

function stripAnsi(value) {
  let sanitized = '';

  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];

    if (current === '\u001b' && value[index + 1] === '[') {
      index += 2;

      while (index < value.length) {
        const code = value.charCodeAt(index);
        const isFinalByte = code >= 0x40 && code <= 0x7e;
        if (isFinalByte) break;
        index += 1;
      }

      continue;
    }

    sanitized += current;
  }

  return sanitized;
}

describe('backend project scaffold', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates backend-specific tsconfig.json with outDir', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    const content = readFileSync(join(tmpDir, 'tsconfig.json'), 'utf-8');
    expect(content).toContain('"outDir"');
    expect(content).toContain('"dist"');
  });

  it('tsconfig.json extends tsconfig.base.json', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    const content = readFileSync(join(tmpDir, 'tsconfig.json'), 'utf-8');
    expect(content).toContain('tsconfig.base.json');
  });

  it('creates tsconfig.base.json (common)', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    expect(existsSync(join(tmpDir, 'tsconfig.base.json'))).toBe(true);
  });

  it('creates src/index.ts for hono', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    const content = readFileSync(join(tmpDir, 'src/index.ts'), 'utf-8');
    expect(content).toContain('Hono');
    expect(content).toContain('@hono/node-server');
  });

  it('creates src/index.ts for fastify', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'fastify', DOCKER: '0' });
    const content = readFileSync(join(tmpDir, 'src/index.ts'), 'utf-8');
    expect(content).toContain('Fastify');
    expect(content).not.toContain("async () => ({ message: 'Hello, World!' })");
    expect(content).not.toContain("async () => ({ status: 'ok' })");
  });

  it('creates src/index.ts for express', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'express', DOCKER: '0' });
    const content = readFileSync(join(tmpDir, 'src/index.ts'), 'utf-8');
    expect(content).toContain('express');
  });

  it('creates src/env.ts with zod schema', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    const content = readFileSync(join(tmpDir, 'src/env.ts'), 'utf-8');
    expect(content).toContain('zod');
    expect(content).toContain('PORT');
  });

  it('creates src/env.ts without zod when BACKEND_ZOD=0', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', BACKEND_ZOD: '0', DOCKER: '0' });
    const content = readFileSync(join(tmpDir, 'src/env.ts'), 'utf-8');
    expect(content).toContain('process.env.PORT');
    expect(content).not.toContain("from 'zod'");
  });

  it('creates .mise.toml', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    expect(existsSync(join(tmpDir, '.mise.toml'))).toBe(true);
  });

  it('adds dev script (tsx watch)', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('dev', 'tsx watch src/index.ts');
  });

  it('adds build script (tsc)', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('build', 'tsc');
  });

  it('adds start script', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('start', 'node dist/src/index.js');
  });

  it('creates Dockerfile when DOCKER=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '1' });
    expect(existsSync(join(tmpDir, 'Dockerfile'))).toBe(true);
  });

  it('Dockerfile skips lifecycle scripts in deps stage', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '1' });
    const content = readFileSync(join(tmpDir, 'Dockerfile'), 'utf-8');
    expect(content).toContain('npm ci --omit=dev --ignore-scripts');
    expect(content).toContain('npm install --omit=dev --ignore-scripts');
  });

  it('Dockerfile builds with TypeScript compiler directly', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '1' });
    const content = readFileSync(join(tmpDir, 'Dockerfile'), 'utf-8');
    expect(content).toContain('RUN npx tsc');
    expect(content).toContain('npm ci --ignore-scripts');
    expect(content).not.toContain('RUN npm run build');
    expect(content).toContain('CMD ["node", "dist/src/index.js"]');
  });

  it('creates docker-compose.yml when DOCKER=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '1' });
    expect(existsSync(join(tmpDir, 'docker-compose.yml'))).toBe(true);
  });

  it('docker-compose.yml runs production container without dev command overrides', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '1' });
    const content = readFileSync(join(tmpDir, 'docker-compose.yml'), 'utf-8');
    expect(content).toContain('NODE_ENV=production');
    expect(content).not.toContain('command: npm run dev');
    expect(content).not.toContain('volumes:');
  });

  it('does NOT create Makefile when DOCKER=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '1' });
    expect(existsSync(join(tmpDir, 'Makefile'))).toBe(false);
  });

  it('creates .dockerignore when DOCKER=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '1' });
    expect(existsSync(join(tmpDir, '.dockerignore'))).toBe(true);
  });

  it('does NOT create Docker files when DOCKER=0', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    expect(existsSync(join(tmpDir, 'Dockerfile'))).toBe(false);
    expect(existsSync(join(tmpDir, 'docker-compose.yml'))).toBe(false);
    expect(existsSync(join(tmpDir, 'Makefile'))).toBe(false);
  });

  it('adds docker npm scripts when DOCKER=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '1' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('docker:up');
    expect(pkg.scripts).toHaveProperty('docker:down');
    expect(pkg.scripts).toHaveProperty('docker:logs');
    expect(pkg.scripts['docker:up']).toBe('docker compose up --build');
    expect(pkg.scripts['docker:down']).toBe('docker compose down');
  });

  it('does not add docker npm scripts when DOCKER=0', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).not.toHaveProperty('docker:up');
    expect(pkg.scripts).not.toHaveProperty('docker:down');
    expect(pkg.scripts).not.toHaveProperty('docker:logs');
  });

  it('does NOT create src/main.ts (skips common starter)', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    expect(existsSync(join(tmpDir, 'src/main.ts'))).toBe(false);
  });

  it('defaults to hono when BACKEND_FRAMEWORK not set', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { DOCKER: '0' });
    const content = readFileSync(join(tmpDir, 'src/index.ts'), 'utf-8');
    expect(content).toContain('Hono');
  });

  it('still gets common eslint.config.js', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    expect(existsSync(join(tmpDir, 'eslint.config.js'))).toBe(true);
  });

  // Elysia framework tests
  it('creates src/index.ts for elysia', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'elysia', DOCKER: '0' });
    const content = readFileSync(join(tmpDir, 'src/index.ts'), 'utf-8');
    expect(content).toContain('Elysia');
    expect(content).toContain('if (!isTestEnv())');
    expect(content).toContain('app.listen(env.PORT)');
  });

  it('uses Bun-based Dockerfile for elysia', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'elysia', DOCKER: '1' });
    const content = readFileSync(join(tmpDir, 'Dockerfile'), 'utf-8');
    expect(content).toContain('FROM oven/bun:1 AS base');
    expect(content).toContain('COPY package.json ./');
    expect(content).not.toContain('COPY package*.json ./');
    expect(content).toContain('RUN bun run build');
    expect(content).toContain('CMD ["bun", "dist/index.js"]');
    expect(content).not.toContain('FROM node:22-slim AS base');
  });

  it('creates .mise.toml with bun for elysia', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'elysia', DOCKER: '0' });
    const content = readFileSync(join(tmpDir, '.mise.toml'), 'utf-8');
    expect(content).toContain('bun');
  });

  it('adds bun-based scripts for elysia', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'elysia', DOCKER: '0' });
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.dev).toContain('bun');
    expect(pkg.scripts.build).toContain('bun');
    expect(pkg.scripts.start).toContain('bun');
  });

  // Test file assertions for all frameworks
  it('creates tests/unit/server.unit.test.ts for hono', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    expect(existsSync(join(tmpDir, 'tests/unit/server.unit.test.ts'))).toBe(true);
    const content = readFileSync(join(tmpDir, 'tests/unit/server.unit.test.ts'), 'utf-8');
    expect(content).toContain('app.request');
  });

  it('creates tests/unit/server.unit.test.ts for fastify', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'fastify', DOCKER: '0' });
    expect(existsSync(join(tmpDir, 'tests/unit/server.unit.test.ts'))).toBe(true);
    const content = readFileSync(join(tmpDir, 'tests/unit/server.unit.test.ts'), 'utf-8');
    expect(content).toContain('app.inject');
  });

  it('creates tests/unit/server.unit.test.ts for express', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'express', DOCKER: '0' });
    expect(existsSync(join(tmpDir, 'tests/unit/server.unit.test.ts'))).toBe(true);
    const content = readFileSync(join(tmpDir, 'tests/unit/server.unit.test.ts'), 'utf-8');
    expect(content).toContain('supertest');
    expect(content.indexOf("import request from 'supertest';")).toBeLessThan(
      content.indexOf("import { describe, expect, it } from 'vitest';"),
    );
  });

  it('creates tests/unit/server.unit.test.ts for elysia', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'elysia', DOCKER: '0' });
    expect(existsSync(join(tmpDir, 'tests/unit/server.unit.test.ts'))).toBe(true);
    const content = readFileSync(join(tmpDir, 'tests/unit/server.unit.test.ts'), 'utf-8');
    expect(content).toContain('app.handle');
  });

  it('creates README.md with backend-specific content', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '0' });
    const content = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(content).toContain('Backend API');
    expect(content).toContain('Hono');
    expect(content).toContain('Zod');
  });

  it('README.md omits Zod section when BACKEND_ZOD=0', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', BACKEND_ZOD: '0', DOCKER: '0' });
    const content = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(content).not.toContain('### Zod');
    expect(content).not.toContain('**Zod**');
  });

  it('README.md mentions Docker when enabled', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '1' });
    const content = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(content).toContain('Docker');
  });

  it('scaffolds Better Auth integration preset when selected', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, {
      BACKEND_FRAMEWORK: 'hono',
      DOCKER: '0',
      INTEGRATION_PRESET: 'better-auth',
    });

    expect(existsSync(join(tmpDir, 'src/integrations/better-auth.ts'))).toBe(true);

    const envExample = readFileSync(join(tmpDir, '.env.example'), 'utf-8');
    expect(envExample).toContain('BETTER_AUTH_SECRET=');

    const readme = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
    expect(readme).toContain('## Authentication (Better Auth)');
    expect(readme).toContain('BETTER_AUTH_SECRET');
  });

  it('prints script and generated file summaries for backend database stacks', () => {
    tmpDir = createTmpProject();
    const output = stripAnsi(
      runCli(tmpDir, {
        BACKEND_FRAMEWORK: 'fastify',
        DOCKER: '1',
        SETUP_DATABASE: '1',
        DB_ENGINE: 'mysql',
        DB_ORM: 'prisma',
        SETUP_REDIS: '1',
        INTEGRATION_PRESET: 'better-auth',
        VITEST_PRESET: 'coverage',
        LINT_OPTIONS: 'cspell,secretlint,commitlint',
      }),
    );

    expect(output).toContain('scripts added in package.json:');
    expect(output).toContain('✔    src/db/config.ts');
    expect(output).toContain('✔    tests/integration/db-connectivity.int.test.ts');
    expect(output).toContain('✔    src/redis/index.ts');
    expect(output).toContain('✔    src/integrations/better-auth.ts');
  });
});
