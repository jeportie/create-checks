import fs from 'fs-extra';
import pc from 'picocolors';
import path from 'node:path';

import { copyIfMissing, templatePath } from '../utils/file-system.js';

function cliTemplatePath(file) {
  return templatePath('cli', file);
}

export async function generateCli(answers, cwd) {
  const { cliFramework = 'commander', cliName = 'my-cli' } = answers;

  console.log(pc.green('→') + '  copying CLI starter files...');

  await copyIfMissing(cliTemplatePath('tsup.config.ts'), path.join(cwd, 'tsup.config.ts'), 'tsup.config.ts');
  await copyIfMissing(cliTemplatePath('.mise.toml'), path.join(cwd, '.mise.toml'), '.mise.toml');

  // Framework-specific entry point
  const srcDir = path.join(cwd, 'src');
  await fs.ensureDir(srcDir);

  const entryDest = path.join(cwd, 'src/index.ts');
  if (!(await fs.pathExists(entryDest))) {
    await fs.copyFile(cliTemplatePath(`src/index.${cliFramework}.ts`), entryDest);
    console.log(pc.green('✔') + '    src/index.ts');
  } else {
    console.log(pc.dim('–') + '    src/index.ts (already exists, skipped)');
  }

  // Framework-specific command example
  const cmdDir = path.join(cwd, 'src/commands');
  await fs.ensureDir(cmdDir);

  const cmdDest = path.join(cwd, 'src/commands/hello.ts');
  if (!(await fs.pathExists(cmdDest))) {
    await fs.copyFile(cliTemplatePath(`src/commands/hello.${cliFramework}.ts`), cmdDest);
    console.log(pc.green('✔') + '    src/commands/hello.ts');
  } else {
    console.log(pc.dim('–') + '    src/commands/hello.ts (already exists, skipped)');
  }

  // Framework-specific test file
  const testDir = path.join(cwd, 'tests/unit');
  await fs.ensureDir(testDir);

  const testDest = path.join(cwd, 'tests/unit/hello.unit.test.ts');
  if (!(await fs.pathExists(testDest))) {
    await fs.copyFile(cliTemplatePath(`tests/unit/hello.${cliFramework}.ts`), testDest);
    console.log(pc.green('✔') + '    tests/unit/hello.unit.test.ts');
  } else {
    console.log(pc.dim('–') + '    tests/unit/hello.unit.test.ts (already exists, skipped)');
  }

  // Update package.json bin field
  const pkgPath = path.join(cwd, 'package.json');
  const pkg = await fs.readJson(pkgPath);
  pkg.bin = { [cliName]: './dist/index.cjs' };
  pkg.files = ['dist'];
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });
  console.log(pc.green('✔') + `    package.json — added bin.${cliName}`);
}
