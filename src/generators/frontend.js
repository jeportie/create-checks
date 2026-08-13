import fs from 'fs-extra';
import pc from 'picocolors';
import path from 'node:path';

import { copyIfMissing, templatePath } from '../utils/file-system.js';

const FRONTEND_FILES = [
  'index.html',
  'vite.config.ts',
  'vitest.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'tsconfig.test.json',
  'src/main.tsx',
  'src/App.tsx',
  'src/Welcome.tsx',
  'src/index.css',
  'src/vite-env.d.ts',
  'src/assets/react.svg',
  'src/assets/tailwind.svg',
  'src/assets/vite.svg',
  'tests/setup.ts',
  'tests/unit/App.unit.test.tsx',
  'tests/integration/App.int.test.tsx',
];

async function copyFrontendFile(relativePath, cwd) {
  const src = templatePath('frontend', relativePath);
  const dest = path.join(cwd, relativePath);
  await fs.ensureDir(path.dirname(dest));
  await copyIfMissing(src, dest, relativePath);
}

export async function generateFrontend(answers, cwd = process.cwd()) {
  console.log(pc.green('→') + '  copying frontend starter files...');
  for (const file of FRONTEND_FILES) {
    await copyFrontendFile(file, cwd);
  }

  if (answers.linter !== 'biome') {
    await copyFrontendFile('eslint.config.js', cwd);
  }
}
