import fs from 'fs-extra';
import pc from 'picocolors';
import path from 'node:path';

import { copyIfMissing, templatePath } from '../utils/file-system.js';

function npmLibTemplatePath(file) {
  return templatePath('npm-lib', file);
}

async function copyNpmLibFile(file, cwd) {
  const src = npmLibTemplatePath(file);
  const dest = path.join(cwd, file);
  await fs.ensureDir(path.dirname(dest));
  return copyIfMissing(src, dest, file);
}

export async function generateNpmLib(answers, cwd) {
  console.log(pc.green('→') + '  copying npm-lib files...');

  await copyNpmLibFile('tsup.config.ts', cwd);

  if (answers.setupSemanticRelease) {
    await copyNpmLibFile('release.config.mjs', cwd);
    await copyNpmLibFile('.github/workflows/semantic-release.yml', cwd);
  }

  await copyNpmLibFile('.github/workflows/pull-request-checks.yml', cwd);

  // Update package.json with npm-lib specific fields
  const pkgPath = path.join(cwd, 'package.json');
  const pkg = await fs.readJson(pkgPath);

  pkg.main = './dist/index.cjs';
  pkg.module = './dist/index.js';
  pkg.types = './dist/index.d.ts';
  pkg.exports = {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js',
      require: './dist/index.cjs',
    },
  };
  pkg.files = ['dist'];

  await fs.writeJson(pkgPath, pkg, { spaces: 2 });
  console.log(pc.green('✔') + '    package.json — added exports, main, module, types, files');
}
