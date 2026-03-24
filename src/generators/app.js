import fs from 'fs-extra';
import pc from 'picocolors';
import path from 'node:path';

import { copyIfMissing, templatePath } from '../utils/file-system.js';

const APP_FILES = [
  'app.json',
  'babel.config.js',
  'metro.config.js',
  'tsconfig.json',
  'eslint.config.js',
  '.mise.toml',
  '.detoxrc.js',
  'src/App.tsx',
  'src/screens/HomeScreen.tsx',
  'src/navigation/index.tsx',
  'tests/setup.ts',
  'tests/unit/HomeScreen.unit.test.tsx',
  'tests/e2e/firstTest.e2e.ts',
];

function appTemplatePath(file) {
  return templatePath('app', file);
}

async function copyAppFile(file, cwd) {
  const src = appTemplatePath(file);
  const dest = path.join(cwd, file);
  await fs.ensureDir(path.dirname(dest));
  return copyIfMissing(src, dest, file);
}

export async function generateApp(_answers, cwd) {
  console.log(pc.green('→') + '  copying app starter files...');
  for (const file of APP_FILES) {
    await copyAppFile(file, cwd);
  }
}
