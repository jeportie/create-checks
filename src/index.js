#!/usr/bin/env node

import fs from 'fs-extra';
import { execa } from 'execa';
import inquirer from 'inquirer';
import pc from 'picocolors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();
const pkgPath = path.join(cwd, 'package.json');

console.log(pc.cyan('\n🔧 create-checks — setting up the project...\n'));

/* ---------------- VITEST PROMPT (before any file changes) ---------------- */

// VITEST_PRESET can be set to 'native', 'coverage', or 'none' to bypass the prompt
// (used by tests and CI environments where stdin is not a TTY)
let vitestPreset = process.env.VITEST_PRESET;

if (!vitestPreset && process.stdin.isTTY) {
  const { setupVitest } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'setupVitest',
      message: 'Do you want to set up Vitest for testing?',
      default: true,
    },
  ]);

  if (setupVitest) {
    const { preset } = await inquirer.prompt([
      {
        type: 'list',
        name: 'preset',
        message: 'Which Vitest configuration would you like?',
        choices: [
          {
            name: 'Native — vitest + path alias (@→src), test/test:unit/test:integration scripts',
            value: 'native',
          },
          {
            name: 'Coverage — adds @vitest/coverage-v8, HTML/JSON reports, test:coverage script',
            value: 'coverage',
          },
        ],
      },
    ]);
    vitestPreset = preset;
  }
}

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
  const deps = [
    'eslint@^9',
    'prettier',
    'eslint-config-prettier@^9.1.0',
    'typescript-eslint',
    '@stylistic/eslint-plugin',
    'eslint-plugin-import',
    'eslint-import-resolver-typescript',
    'typescript',
    '@types/node',
  ];

  if (vitestPreset === 'native' || vitestPreset === 'coverage') {
    deps.push('vitest');
  }
  if (vitestPreset === 'coverage') {
    deps.push('@vitest/coverage-v8');
  }

  console.log(pc.dim('  Installing dev dependencies...'));
  await execa('npm', ['install', '-D', ...deps], { stdio: 'inherit' });
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

if (!(await fs.pathExists(path.join(cwd, '.eslintignore')))) {
  await fs.copyFile(path.join(__dirname, 'templates/.eslintignore'), path.join(cwd, '.eslintignore'));
  console.log(pc.green('  ✔') + '  .eslintignore');
} else {
  console.log(pc.dim('  –') + '  .eslintignore (already exists, skipped)');
}

if (!(await fs.pathExists(path.join(cwd, '.prettierignore')))) {
  await fs.copyFile(path.join(__dirname, 'templates/.prettierignore'), path.join(cwd, '.prettierignore'));
  console.log(pc.green('  ✔') + '  .prettierignore');
} else {
  console.log(pc.dim('  –') + '  .prettierignore (already exists, skipped)');
}

if (!(await fs.pathExists(path.join(cwd, '.gitignore')))) {
  await fs.copyFile(path.join(__dirname, 'templates/_gitignore'), path.join(cwd, '.gitignore'));
  console.log(pc.green('  ✔') + '  .gitignore');
} else {
  console.log(pc.dim('  –') + '  .gitignore (already exists, skipped)');
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

if (vitestPreset === 'native' || vitestPreset === 'coverage') {
  await fs.copyFile(
    path.join(__dirname, `templates/vitest.config.${vitestPreset}.ts`),
    path.join(cwd, 'vitest.config.ts'),
  );
  console.log(pc.green('  ✔') + '  vitest.config.ts');
}

/* ---------------- UPDATE package.json SCRIPTS ---------------- */

const pkg = await fs.readJson(pkgPath);

pkg.scripts = {
  ...pkg.scripts,
  lint: 'eslint .',
  format: 'prettier . --write',
  typecheck: 'tsc --noEmit',
};

if (vitestPreset === 'native' || vitestPreset === 'coverage') {
  pkg.scripts.test = 'vitest --run';
  pkg.scripts['test:unit'] = 'vitest unit --run';
  pkg.scripts['test:integration'] = 'vitest int --run';
}
if (vitestPreset === 'coverage') {
  pkg.scripts['test:coverage'] = 'vitest --coverage --run';
}

await fs.writeJson(pkgPath, pkg, { spaces: 2 });

const baseScripts = ['lint', 'format', 'typecheck'];
if (vitestPreset === 'native' || vitestPreset === 'coverage') baseScripts.push('test', 'test:unit', 'test:integration');
if (vitestPreset === 'coverage') baseScripts.push('test:coverage');
console.log(pc.green('  ✔') + `  package.json  (scripts: ${baseScripts.join(', ')})`);

console.log(pc.green('\n✅ Done!\n'));
