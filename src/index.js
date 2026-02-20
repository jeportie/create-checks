#!/usr/bin/env node

import fs from 'fs-extra';
import { execa } from 'execa';
import pc from 'picocolors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();
const pkgPath = path.join(cwd, 'package.json');

console.log(pc.cyan('\n🔧 create-checks — setting up ESLint + Prettier\n'));

/* ---------------- ENSURE package.json EXISTS ---------------- */

if (!(await fs.pathExists(pkgPath))) {
  console.log(pc.yellow('  No package.json found — running npm init -y...'));
  await execa('npm', ['init', '-y'], { stdio: 'inherit' });
  const pkg = await fs.readJson(pkgPath);
  pkg.type = 'module';
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });
  console.log(pc.green('  ✔') + '  package.json created with "type": "module"');
}

/* ---------------- INSTALL DEPENDENCIES ---------------- */

if (!process.env.NO_INSTALL) {
  console.log(pc.dim('  Installing dev dependencies...'));
  await execa(
    'npm',
    [
      'install',
      '-D',

      'eslint@^9',
      'prettier',
      'eslint-config-prettier@^9.1.0',
      '@eslint/js',
      'typescript-eslint',
      '@stylistic/eslint-plugin',
      'eslint-plugin-import',
      'eslint-import-resolver-typescript',
      'typescript',
      '@types/node',
    ],
    { stdio: 'inherit' },
  );
}

/* ---------------- COPY TEMPLATE FILES ---------------- */

await fs.copyFile(path.join(__dirname, 'templates/eslint.config.js'), path.join(cwd, 'eslint.config.js'));
console.log(pc.green('  ✔') + '  eslint.config.js');

await fs.copyFile(path.join(__dirname, 'templates/prettier.config.js'), path.join(cwd, 'prettier.config.js'));
console.log(pc.green('  ✔') + '  prettier.config.js');

if (!(await fs.pathExists(path.join(cwd, '.editorconfig')))) {
  await fs.copyFile(path.join(__dirname, 'templates/.editorconfig'), path.join(cwd, '.editorconfig'));
  console.log(pc.green('  ✔') + '  .editorconfig');
} else {
  console.log(pc.dim('  –') + '  .editorconfig (already exists, skipped)');
}

if (!(await fs.pathExists(path.join(cwd, 'tsconfig.base.json')))) {
  await fs.copyFile(path.join(__dirname, 'templates/tsconfig.base.json'), path.join(cwd, 'tsconfig.base.json'));
  console.log(pc.green('  ✔') + '  tsconfig.base.json');
} else {
  console.log(pc.dim('  –') + '  tsconfig.base.json (already exists, skipped)');
}

if (!(await fs.pathExists(path.join(cwd, 'tsconfig.json')))) {
  await fs.copyFile(path.join(__dirname, 'templates/tsconfig.json'), path.join(cwd, 'tsconfig.json'));
  console.log(pc.green('  ✔') + '  tsconfig.json');
} else {
  console.log(pc.dim('  –') + '  tsconfig.json (already exists, skipped)');
}

/* ---------------- UPDATE package.json ---------------- */

const pkg = await fs.readJson(pkgPath);

pkg.scripts = {
  ...pkg.scripts,
  lint: 'eslint .',
  format: 'prettier . --write',
  typecheck: 'tsc --noEmit',
};

await fs.writeJson(pkgPath, pkg, { spaces: 2 });
console.log(pc.green('  ✔') + '  package.json  (scripts: lint, format, typecheck)');

console.log(pc.green('\n✅ Done!\n'));
