#!/usr/bin/env node
/**
 * tskickstart E2E harness.
 *
 *   node scripts/e2e/run.mjs --tier=gen                 # fast, no network (PR + release gate)
 *   node scripts/e2e/run.mjs --tier=verify [filters]    # gen + `npm install` + typecheck (nightly)
 *
 * Optional filters (passed by e2e.yml's FILTER input):
 *   --type=<projectType>   scaffold this PROJECT_TYPE instead of the default matrix (repeatable)
 *
 * The harness drives the promptless CLI exactly like the integration tests do: it spawns
 * `node src/index.js` inside a throwaway temp dir seeded with a minimal package.json, with
 * NO_INSTALL=1 and a non-TTY stdin so every prompt takes its env-driven default. It then
 * asserts the core files that generateCommon always emits and that package.json was patched.
 *
 * Writes e2e-report.json at the repo root (uploaded by .github/workflows/e2e.yml).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const cliPath = join(repoRoot, 'src', 'index.js');

const args = process.argv.slice(2);
const tier = (args.find((a) => a.startsWith('--tier=')) ?? '--tier=gen').slice('--tier='.length);
const types = args.filter((a) => a.startsWith('--type=')).map((a) => a.slice('--type='.length));

// Files that generateCommon always emits (verified against tests/integration/index.int.test.js).
// The project-type generators are optional (wrapped in try/catch in src/index.js), so the gate
// only relies on the common scaffold — that keeps the required check robust and network-free.
const REQUIRED_FILES = [
  'eslint.config.js',
  'prettier.config.js',
  'tsconfig.json',
  'tsconfig.base.json',
  'src/main.ts',
  'README.md',
  '.gitignore',
];

// Default matrix: base scaffold + the native vitest preset. Both exercise generateCommon only.
const DEFAULT_MATRIX = [
  { name: 'base', env: {} },
  { name: 'vitest-native', env: { VITEST_PRESET: 'native' } },
];

const matrix = types.length
  ? types.map((t) => ({ name: `type-${t}`, env: { PROJECT_TYPE: t } }))
  : DEFAULT_MATRIX;

function scaffold({ name, env }) {
  const dir = mkdtempSync(join(tmpdir(), 'tsk-e2e-'));
  const started = Date.now();
  try {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: `e2e-${name}`, version: '0.0.0' }, null, 2),
    );

    const run = spawnSync('node', [cliPath], {
      cwd: dir,
      env: { ...process.env, NO_INSTALL: '1', ...env },
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    if (run.status !== 0) {
      throw new Error(`CLI exited with ${run.status}\n${run.stderr || run.stdout}`);
    }

    for (const file of REQUIRED_FILES) {
      if (!existsSync(join(dir, file))) throw new Error(`missing expected file: ${file}`);
    }

    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
    if (pkg.type !== 'module') throw new Error('package.json "type":"module" was not set');
    if (pkg.scripts?.lint !== 'eslint .') {
      throw new Error(`package.json lint script not injected (got: ${pkg.scripts?.lint})`);
    }

    if (tier === 'verify') {
      const install = spawnSync('npm', ['install', '--no-audit', '--no-fund'], {
        cwd: dir,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      if (install.status !== 0) throw new Error(`npm install failed\n${install.stderr}`);
      if (pkg.scripts?.typecheck) {
        const tc = spawnSync('npm', ['run', 'typecheck'], {
          cwd: dir,
          stdio: 'pipe',
          encoding: 'utf-8',
        });
        if (tc.status !== 0) throw new Error(`typecheck failed\n${tc.stdout}\n${tc.stderr}`);
      }
    }

    return { case: name, tier, ok: true, ms: Date.now() - started };
  } catch (err) {
    return { case: name, tier, ok: false, ms: Date.now() - started, error: err.message };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const results = matrix.map(scaffold);
const failed = results.filter((r) => !r.ok);

writeFileSync(
  join(repoRoot, 'e2e-report.json'),
  JSON.stringify({ tier, total: results.length, failed: failed.length, results }, null, 2),
);

for (const r of results) {
  const head = `${r.ok ? 'ok  ' : 'FAIL'}  ${r.tier}  ${r.case}  (${r.ms}ms)`;
  console.log(r.ok ? head : `${head}\n      ${r.error}`);
}

if (failed.length) {
  console.error(`\n${failed.length}/${results.length} e2e case(s) failed`);
  process.exit(1);
}
console.log(`\nall ${results.length} e2e case(s) passed (tier=${tier})`);
