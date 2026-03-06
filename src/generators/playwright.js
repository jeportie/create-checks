import fs from 'fs-extra';
import pc from 'picocolors';
import path from 'node:path';

import { copyIfMissing, templatePath } from '../utils/file-system.js';
import { orderPackageKeys, orderScripts } from '../utils/scripts.js';

async function appendGitignoreEntries(cwd) {
  const gitignorePath = path.join(cwd, '.gitignore');
  const entries = ['playwright-report/', 'test-results/'];

  let existing = '';
  if (await fs.pathExists(gitignorePath)) {
    existing = await fs.readFile(gitignorePath, 'utf-8');
  }

  const missing = entries.filter((entry) => !existing.includes(entry));
  if (missing.length === 0) return;

  const needsLeadingNewline = existing.length > 0 && !existing.endsWith('\n');
  const prefix = needsLeadingNewline ? '\n' : '';
  await fs.appendFile(gitignorePath, `${prefix}${missing.join('\n')}\n`);
}

async function addPlaywrightScripts(pkgPath) {
  const pkg = await fs.readJson(pkgPath);
  pkg.scripts = {
    ...pkg.scripts,
    'test:e2e': 'npx playwright test',
    'test:e2e:ui': 'npx playwright test --ui',
  };
  pkg.scripts = orderScripts(pkg.scripts);
  await fs.writeJson(pkgPath, orderPackageKeys(pkg), { spaces: 2 });
}

export async function generatePlaywright(_answers, cwd = process.cwd()) {
  console.log(pc.green('→') + '  copying Playwright files...');

  await copyIfMissing(
    templatePath('playwright', 'playwright.config.ts'),
    path.join(cwd, 'playwright.config.ts'),
    'playwright.config.ts',
  );

  await fs.ensureDir(path.join(cwd, 'e2e'));
  await copyIfMissing(
    templatePath('playwright', 'e2e/example.spec.ts'),
    path.join(cwd, 'e2e/example.spec.ts'),
    'e2e/example.spec.ts',
  );

  await appendGitignoreEntries(cwd);
  await addPlaywrightScripts(path.join(cwd, 'package.json'));
}
