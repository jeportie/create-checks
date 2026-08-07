#!/usr/bin/env node
/**
 * Enable auto-delete of merged branches and tidy merge settings (idempotent).
 * Requires `gh` + auth. Run from the repo root: `node scripts/ci/repo-settings.mjs`
 */
import { execFileSync } from 'node:child_process';

const settings = [
  ['delete_branch_on_merge', 'true'],
  ['allow_squash_merge', 'true'],
  ['allow_auto_merge', 'true'],
  ['allow_update_branch', 'true'],
];

const args = ['api', '--method', 'PATCH', 'repos/{owner}/{repo}'];
for (const [key, value] of settings) {
  args.push('-F', `${key}=${value}`);
}

try {
  execFileSync('gh', args, { stdio: 'inherit' });
  console.log('Repository settings updated.');
} catch (err) {
  console.error('Failed to update repository settings:', err.message);
  process.exitCode = 1;
}
