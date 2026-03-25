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
  execSync(`node ${cliPath}`, {
    cwd,
    env: { ...process.env, NO_INSTALL: '1', PROJECT_TYPE: 'backend', ...extraEnv },
    stdio: 'pipe',
  });
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
    expect(pkg.scripts).toHaveProperty('start', 'node dist/index.js');
  });

  it('creates Dockerfile when DOCKER=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '1' });
    expect(existsSync(join(tmpDir, 'Dockerfile'))).toBe(true);
  });

  it('creates docker-compose.yml when DOCKER=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'hono', DOCKER: '1' });
    expect(existsSync(join(tmpDir, 'docker-compose.yml'))).toBe(true);
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
  });

  it('creates tests/unit/server.unit.test.ts for elysia', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { BACKEND_FRAMEWORK: 'elysia', DOCKER: '0' });
    expect(existsSync(join(tmpDir, 'tests/unit/server.unit.test.ts'))).toBe(true);
    const content = readFileSync(join(tmpDir, 'tests/unit/server.unit.test.ts'), 'utf-8');
    expect(content).toContain('app.handle');
  });
});
