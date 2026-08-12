import fs from 'fs-extra';
import pc from 'picocolors';
import path from 'node:path';

import { copyIfMissing, templatePath } from '../utils/file-system.js';

const ELECTRON_FILES = [
  'electron.vite.config.ts',
  'electron-builder.yml',
  '.nvmrc',
  'tsconfig.json',
  'tsconfig.node.json',
  'tsconfig.web.json',
  'src/main/index.ts',
  'src/preload/index.ts',
  'src/preload/index.d.ts',
  'src/renderer/index.html',
  'src/renderer/src/main.tsx',
  'src/renderer/src/App.tsx',
];

async function copyElectronFile(relativePath, cwd) {
  const src = templatePath('electron', relativePath);
  const dest = path.join(cwd, relativePath);
  await fs.ensureDir(path.dirname(dest));
  await copyIfMissing(src, dest, relativePath);
}

const ELECTRON_VITEST_FILES = ['vitest.config.ts', 'tests/setup.ts', 'tests/unit/App.unit.test.tsx'];

export async function generateElectron(answers, cwd = process.cwd()) {
  console.log(pc.green('→') + '  copying electron starter files...');
  for (const file of ELECTRON_FILES) {
    await copyElectronFile(file, cwd);
  }
  if (answers.linter === 'eslint') {
    await copyElectronFile('eslint.config.js', cwd);
  }
  if (answers.vitestPreset === 'native' || answers.vitestPreset === 'coverage') {
    for (const file of ELECTRON_VITEST_FILES) {
      await copyElectronFile(file, cwd);
    }
  }
}
