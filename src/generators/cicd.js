import fs from 'fs-extra';
import path from 'node:path';

function ciWorkflow() {
  return `name: CI

on:
  pull_request:

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check
`;
}

export async function generateCicd(answers, cwd) {
  if (!answers.setupCicd) return;

  // npm-lib already generates its own pull-request-checks.yml
  if (answers.projectType === 'npm-lib') return;

  const workflowsDir = path.join(cwd, '.github/workflows');
  await fs.ensureDir(workflowsDir);

  await fs.writeFile(path.join(workflowsDir, 'ci.yml'), ciWorkflow());
}
