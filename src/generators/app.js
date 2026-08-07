import fs from 'fs-extra';
import pc from 'picocolors';
import path from 'node:path';

import { copyIfMissing, templatePath } from '../utils/file-system.js';

const APP_CORE_FILES = [
  '.npmrc',
  'index.ts',
  'app.json',
  'babel.config.cjs',
  'metro.config.cjs',
  'tsconfig.json',
  '.mise.toml',
  'src/App.tsx',
  'src/screens/HomeScreen.tsx',
  'src/navigation/index.tsx',
];

const APP_JEST_FILES = ['jest.config.cjs', 'tests/setup.ts', 'tests/unit/HomeScreen.unit.test.tsx'];

const APP_DETOX_FILES = ['.detoxrc.cjs', 'tests/e2e/jest.config.cjs', 'tests/e2e/firstTest.e2e.ts'];

const APP_OVERWRITE_FILES = new Set([
  ...APP_CORE_FILES.filter((file) => file !== '.npmrc'),
  ...APP_JEST_FILES,
  ...APP_DETOX_FILES,
]);

function appTemplatePath(file) {
  return templatePath('app', file);
}

async function copyAppFile(file, cwd, { overwrite = false } = {}) {
  const src = appTemplatePath(file);
  const dest = path.join(cwd, file);
  await fs.ensureDir(path.dirname(dest));

  if (overwrite) {
    await fs.copyFile(src, dest);
    console.log(pc.green('✔') + `    ${file}`);
    return true;
  }

  return copyIfMissing(src, dest, file);
}

export async function generateApp(answers, cwd) {
  const { setupAppJest = true, setupAppDetox = true } = answers;

  console.log(pc.green('→') + '  copying app starter files...');

  for (const file of APP_CORE_FILES) {
    await copyAppFile(file, cwd, { overwrite: APP_OVERWRITE_FILES.has(file) });
  }

  if (answers.linter !== 'biome') {
    await copyAppFile('eslint.config.js', cwd, { overwrite: true });
  }

  if (setupAppJest) {
    for (const file of APP_JEST_FILES) {
      await copyAppFile(file, cwd, { overwrite: APP_OVERWRITE_FILES.has(file) });
    }
  }

  if (setupAppDetox) {
    for (const file of APP_DETOX_FILES) {
      await copyAppFile(file, cwd, { overwrite: APP_OVERWRITE_FILES.has(file) });
    }
  }
}
