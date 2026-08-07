import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expectedFiles, LINTER_FILES } from '../matrix.mjs';
import { exec, stripAnsi } from './proc.mjs';

function createTmpProject(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'e2e-fixture', version: '0.0.0' }, null, 2));
  return dir;
}

function tail(res, lines = 25) {
  const text = stripAnsi(`${res.stdout || ''}\n${res.stderr || ''}`).trimEnd();
  return text.split('\n').slice(-lines).join('\n');
}

function readPkg(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
  } catch {
    return {};
  }
}

function scaffold(cliPath, dir, comboEnv, { install, timeoutMs }) {
  const env = { ...process.env, ...comboEnv };
  if (install) delete env.NO_INSTALL;
  else env.NO_INSTALL = '1';
  return exec(process.execPath, [cliPath], { cwd: dir, env, timeoutMs });
}

function result(combo, status, started, extra) {
  return { id: combo.id, group: combo.group, type: combo.type, env: combo.env, status, ms: Date.now() - started, ...extra };
}

function checkManifest(dir, combo) {
  const missing = [];
  for (const rel of expectedFiles(combo)) {
    if (!existsSync(join(dir, rel))) missing.push(rel);
  }
  const hasLinter = existsSync(join(dir, LINTER_FILES.eslint)) || existsSync(join(dir, LINTER_FILES.biome));
  if (!hasLinter) missing.push(`${LINTER_FILES.eslint}|${LINTER_FILES.biome}`);
  return missing;
}

/** Tier 1 — generation only (NO_INSTALL). Fast; asserts exit 0 + core files. */
export async function runGen(combo, ctx) {
  const started = Date.now();
  const dir = createTmpProject('tskickstart-e2e-gen-');
  try {
    const res = await scaffold(ctx.cliPath, dir, combo.env, { install: false, timeoutMs: ctx.timeoutMs });
    if (res.timedOut) return result(combo, 'fail', started, { error: 'timed out', tail: tail(res) });
    if (res.code !== 0) return result(combo, 'fail', started, { error: `CLI exited ${res.code}`, tail: tail(res) });
    const missing = checkManifest(dir, combo);
    if (missing.length) return result(combo, 'fail', started, { error: `missing: ${missing.join(', ')}`, tail: tail(res) });
    return result(combo, 'pass', started, {});
  } finally {
    if (!ctx.keep) rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Tier 2 — real install + verification on the curated subset. Runs the
 * generated project's own `build` and `check` scripts. Steps degrade to `skip`
 * (never a false fail) when an environmental prerequisite is missing.
 */
export async function runVerify(combo, ctx) {
  const started = Date.now();
  const dir = createTmpProject('tskickstart-e2e-verify-');
  const steps = [];
  const runInDir = (cmd, args) => exec(cmd, args, { cwd: dir, env: { ...process.env }, timeoutMs: ctx.verifyTimeoutMs });
  try {
    const scaf = await scaffold(ctx.cliPath, dir, combo.env, { install: true, timeoutMs: ctx.verifyTimeoutMs });
    steps.push({ name: 'scaffold+install', code: scaf.code, timedOut: scaf.timedOut });
    if (scaf.timedOut || scaf.code !== 0) {
      return result(combo, 'fail', started, { steps, error: 'scaffold/install failed', tail: tail(scaf) });
    }

    if (combo.env.DB_ORM === 'prisma') {
      const gen = await runInDir('npx', ['--no', 'prisma', 'generate']);
      steps.push({ name: 'prisma generate', code: gen.code, tail: gen.code === 0 ? undefined : tail(gen) });
    }

    const pkg = readPkg(dir);
    const scripts = pkg.scripts || {};

    if (scripts.build) {
      if (combo.env.BACKEND_FRAMEWORK === 'elysia' && !ctx.hasBun) {
        steps.push({ name: 'build', status: 'skip', reason: 'bun not installed' });
      } else {
        const b = await runInDir('npm', ['run', 'build']);
        steps.push({ name: 'build', code: b.code, tail: b.code === 0 ? undefined : tail(b) });
      }
    }

    if (scripts.check) {
      const c = await runInDir('npm', ['run', 'check']);
      steps.push({ name: 'check', code: c.code, tail: c.code === 0 ? undefined : tail(c) });
    }

    const failed = steps.some((s) => typeof s.code === 'number' && s.code !== 0);
    return result(combo, failed ? 'fail' : 'pass', started, { steps });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return result(combo, 'fail', started, { steps, error: message });
  } finally {
    if (!ctx.keep) rmSync(dir, { recursive: true, force: true });
  }
}
