import { spawn } from 'node:child_process';

// eslint-disable-next-line no-control-regex
const ANSI = /\x1b\[[0-9;]*m/g;

export function stripAnsi(value) {
  return String(value).replace(ANSI, '');
}

/**
 * Run a command, capturing stdout/stderr. Never rejects — resolves with
 * `{ code, stdout, stderr, timedOut }`. stdin is ignored so the spawned CLI
 * sees a non-TTY stream and falls back to env vars / defaults (no hang).
 */
export function exec(cmd, args, opts = {}) {
  const { timeoutMs = 0, ...spawnOpts } = opts;
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...spawnOpts });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let timer = null;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);
    }
    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      const message = err && err.message ? err.message : String(err);
      resolve({ code: -1, stdout, stderr: `${stderr}${message}`, timedOut });
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

/** True if `<name> --version` exits 0 (used to gate steps that need e.g. bun). */
export async function hasBinary(name) {
  const res = await exec(name, ['--version'], { timeoutMs: 10000 });
  return res.code === 0;
}

/**
 * Run `worker` over `items` with bounded concurrency. Results are written
 * positionally; if `shouldStop()` becomes true, remaining items are left
 * undefined (used for --bail).
 */
export async function runPool(items, worker, concurrency, shouldStop = () => false) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      if (shouldStop()) return;
      const idx = next;
      next += 1;
      results[idx] = await worker(items[idx], idx);
    }
  }
  const count = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: count }, () => run()));
  return results;
}
