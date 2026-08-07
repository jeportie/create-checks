#!/usr/bin/env node
/**
 * Create or update branch-protection rulesets from .github/rulesets/*.json.
 * Idempotent (matches by ruleset name). Requires `gh` + admin auth.
 * Run from the repo root: `node scripts/ci/apply-rulesets.mjs`
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rulesetsDir = resolve(here, '../../.github/rulesets');
const files = ['main.json', 'dev.json'];

function gh(args, input) {
  return execFileSync('gh', args, { input, encoding: 'utf-8' });
}

let existing = [];
try {
  existing = JSON.parse(gh(['api', 'repos/{owner}/{repo}/rulesets', '--paginate']));
} catch (err) {
  console.error('Could not list existing rulesets (need admin auth?):', err.message);
  process.exit(1);
}

for (const file of files) {
  const body = readFileSync(join(rulesetsDir, file), 'utf-8');
  const def = JSON.parse(body);
  const match = existing.find((r) => r.name === def.name);
  try {
    if (match) {
      gh(['api', '--method', 'PUT', `repos/{owner}/{repo}/rulesets/${match.id}`, '--input', '-'], body);
      console.log(`Updated ruleset "${def.name}" (#${match.id}).`);
    } else {
      gh(['api', '--method', 'POST', 'repos/{owner}/{repo}/rulesets', '--input', '-'], body);
      console.log(`Created ruleset "${def.name}".`);
    }
  } catch (err) {
    console.error(`Failed to apply ruleset "${def.name}":`, err.message);
    process.exitCode = 1;
  }
}
