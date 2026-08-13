#!/usr/bin/env node
/**
 * tskickstart local try-runner.
 *
 * Scaffolds into a fresh throwaway temp dir so you can eyeball generator output
 * without polluting the repo — running the CLI in the repo root would scaffold
 * on top of it. A new temp dir is minted each run, so there are no leftovers.
 *
 * Environment variables pass straight through (stdio + env are inherited), so
 * the flags from the README's "Non-interactive / CI usage" section work here:
 *
 *   npm run try:cli
 *   NO_INSTALL=1 npm run try:cli
 *   PROJECT_TYPE=frontend NO_INSTALL=1 npm run try:cli
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(here, '../src/index.js');
const dir = mkdtempSync(join(tmpdir(), 'tskickstart-'));

console.log(`→ scaffolding into ${dir}\n`);
const { status } = spawnSync(process.execPath, [cliPath], {
  cwd: dir,
  stdio: 'inherit',
});
console.log(`\n→ done — generated project is in ${dir}`);
process.exit(status ?? 0);
