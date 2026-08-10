#!/usr/bin/env node
/**
 * Create/update the repository label set (idempotent). Requires `gh` + auth.
 * Run from the repo root: `node scripts/ci/labels.mjs`
 */
import { execFileSync } from 'node:child_process';

const labels = [
  ['prompts', '0e8a16', 'src/prompts changes'],
  ['generators', '1d76db', 'src/generators changes'],
  ['templates', '5319e7', 'src/templates changes'],
  ['utils', 'fbca04', 'src/utils changes'],
  ['tests', 'c5def5', 'test changes'],
  ['e2e', 'bfdadc', 'E2E matrix / scripts/e2e'],
  ['ci', 'ededed', 'CI / .github / scripts/ci'],
  ['docs', '0075ca', 'documentation'],
  ['dependencies', '0366d6', 'dependency updates'],
  ['bug', 'd73a4a', 'something is broken'],
  ['enhancement', 'a2eeef', 'feature request'],
  ['triage:l1-do-now', '1a7f37', 'auto-fixable now — crew opens a PR'],
  ['triage:l2-delegate', 'd4a72c', 'delegate via Jira ticket + human approval'],
  ['triage:l3-human', 'd93f0b', 'human-only (features, UI, security, architecture)'],
  ['triage:needs-info', '8b949e', 'unclear / out of scope / duplicate — needs a human'],
];

for (const [name, color, description] of labels) {
  try {
    execFileSync('gh', ['label', 'create', name, '--color', color, '--description', description, '--force'], {
      stdio: 'inherit',
    });
  } catch (err) {
    console.error(`Failed to create label "${name}":`, err.message);
    process.exitCode = 1;
  }
}
