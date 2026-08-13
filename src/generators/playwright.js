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

async function addPlaywrightScripts(pkgPath, isElectron) {
  const pkg = await fs.readJson(pkgPath);
  // The electron app must be built before the _electron launcher has an entry point.
  const prefix = isElectron ? 'electron-vite build && ' : '';
  pkg.scripts = {
    ...pkg.scripts,
    'test:e2e': `${prefix}npx playwright test`,
    'test:e2e:ui': `${prefix}npx playwright test --ui`,
  };
  pkg.scripts = orderScripts(pkg.scripts);
  await fs.writeJson(pkgPath, orderPackageKeys(pkg), { spaces: 2 });
}

export async function generatePlaywright(answers, cwd = process.cwd()) {
  const { projectType } = answers;
  const isElectron = projectType === 'electron';
  console.log(pc.green('→') + '  copying Playwright files...');

  const configTemplate = isElectron
    ? templatePath('electron', 'playwright.config.ts')
    : templatePath('playwright', 'playwright.config.ts');
  await copyIfMissing(configTemplate, path.join(cwd, 'playwright.config.ts'), 'playwright.config.ts');

  await fs.ensureDir(path.join(cwd, 'tests', 'e2e'));

  if (isElectron) {
    const spec = 'tests/e2e/app.e2e.ts';
    await copyIfMissing(templatePath('electron', spec), path.join(cwd, spec), spec);
  } else {
    const specFile = projectType === 'frontend' ? 'tests/e2e/welcome.spec.ts' : 'tests/e2e/example.spec.ts';
    await copyIfMissing(templatePath('playwright', specFile), path.join(cwd, specFile), specFile);
  }

  await appendGitignoreEntries(cwd);
  await addPlaywrightScripts(path.join(cwd, 'package.json'), isElectron);
}
