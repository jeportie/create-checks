#!/usr/bin/env node

import fs from 'fs-extra';
import { execa } from 'execa';
import pc from 'picocolors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();

console.log(pc.cyan('🔧 Setting up ESLint + Prettier...'));

/* ---------------- INSTALL DEPENDENCIES ---------------- */

if (!process.env.NO_INSTALL) {
  await execa(
    'npm',
    [
      'install',
      '-D',
      'eslint',
      'prettier',
      'eslint-config-prettier',
      'typescript-eslint',
      '@stylistic/eslint-plugin',
      'eslint-plugin-import',
      'eslint-import-resolver-typescript',
    ],
    { stdio: 'inherit' },
  );
}

/* ---------------- COPY TEMPLATE FILES ---------------- */

await fs.copyFile(path.join(__dirname, 'templates/eslint.config.js'), path.join(cwd, 'eslint.config.js'));

await fs.copyFile(path.join(__dirname, 'templates/prettier.config.js'), path.join(cwd, 'prettier.config.js'));

if (!(await fs.pathExists(path.join(cwd, '.editorconfig')))) {
  await fs.copyFile(path.join(__dirname, 'templates/.editorconfig'), path.join(cwd, '.editorconfig'));
}

/* ---------------- UPDATE package.json ---------------- */

const pkgPath = path.join(cwd, 'package.json');
const pkg = await fs.readJson(pkgPath);

pkg.scripts = {
  ...pkg.scripts,
  lint: 'eslint .',
  format: 'prettier . --write',
  typecheck: 'tsc --noEmit',
};

await fs.writeJson(pkgPath, pkg, { spaces: 2 });

console.log(pc.green('✅ ESLint + Prettier configured successfully!'));
