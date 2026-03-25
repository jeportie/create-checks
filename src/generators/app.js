import fs from 'fs-extra';
import pc from 'picocolors';
import path from 'node:path';

import { copyIfMissing, templatePath } from '../utils/file-system.js';

const APP_CORE_FILES = [
  'app.json',
  'babel.config.cjs',
  'metro.config.cjs',
  'tsconfig.json',
  'eslint.config.js',
  '.mise.toml',
  'src/App.tsx',
  'src/screens/HomeScreen.tsx',
  'src/navigation/index.tsx',
];

const APP_JEST_FILES = ['tests/setup.ts', 'tests/unit/HomeScreen.unit.test.tsx'];

const APP_DETOX_FILES = ['.detoxrc.cjs', 'tests/e2e/firstTest.e2e.ts'];

function appTemplatePath(file) {
  return templatePath('app', file);
}

async function copyAppFile(file, cwd) {
  const src = appTemplatePath(file);
  const dest = path.join(cwd, file);
  await fs.ensureDir(path.dirname(dest));
  return copyIfMissing(src, dest, file);
}

export async function generateApp(answers, cwd) {
  const { setupAppJest = true, setupAppDetox = true } = answers;

  console.log(pc.green('→') + '  copying app starter files...');

  for (const file of APP_CORE_FILES) {
    await copyAppFile(file, cwd);
  }

  if (setupAppJest) {
    for (const file of APP_JEST_FILES) {
      await copyAppFile(file, cwd);
    }
  }

  if (setupAppDetox) {
    for (const file of APP_DETOX_FILES) {
      await copyAppFile(file, cwd);
    }
  }
}
