import fs from 'fs-extra';
import { execa } from 'execa';
import pc from 'picocolors';
import path from 'node:path';

import { copyIfMissing, templatePath } from '../utils/file-system.js';
import { installDeps } from '../utils/install.js';
import { buildScripts, orderPackageKeys } from '../utils/scripts.js';

async function ensurePackageJson(pkgPath) {
  if (!(await fs.pathExists(pkgPath))) {
    console.log(pc.red('\n⨯'), pc.yellow(' No package.json found — running npm init -y...'));
    await execa('npm', ['init', '-y'], { stdout: 'ignore', stderr: 'inherit' });
    const pkg = await fs.readJson(pkgPath);
    pkg.type = 'module';
    await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    console.log(pc.green('✔') + '  package.json created with "type": "module"');
    return;
  }

  const pkg = await fs.readJson(pkgPath);
  if (pkg.type !== 'module') {
    pkg.type = 'module';
    await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    console.log(pc.green('✔') + '  package.json — added "type": "module"');
  }
}

async function appendAuthorToCspell(cwd, authorName) {
  if (!authorName) return;

  const cspellPath = path.join(cwd, 'cspell.json');
  const cspellJson = await fs.readJson(cspellPath);
  if (!cspellJson.words) cspellJson.words = [];

  for (const word of authorName.split(/\s+/).filter(Boolean)) {
    if (!cspellJson.words.includes(word)) cspellJson.words.push(word);
  }

  await fs.writeJson(cspellPath, cspellJson, { spaces: 2 });
}

export async function generateCommon(answers, cwd = process.cwd()) {
  const pkgPath = path.join(cwd, 'package.json');
  const { lintOption = [], vitestPreset, setupPrecommit = true, authorName, projectType } = answers;
  const isFrontend = projectType === 'frontend';
  const isApp = projectType === 'app';

  await ensurePackageJson(pkgPath);
  await installDeps(answers);

  console.log(pc.green('→') + '  copying config files...');

  if (!isFrontend && !isApp) {
    await copyIfMissing(
      templatePath('common', 'tsconfig.base.json'),
      path.join(cwd, 'tsconfig.base.json'),
      'tsconfig.base.json',
    );
    if (projectType !== 'backend') {
      await copyIfMissing(templatePath('common', 'tsconfig.json'), path.join(cwd, 'tsconfig.json'), 'tsconfig.json');
    }
  }

  await fs.copyFile(templatePath('common', 'prettier.config.js'), path.join(cwd, 'prettier.config.js'));
  console.log(pc.green('✔') + '    prettier.config.js');

  if (!isFrontend && !isApp) {
    const eslintTemplate = lintOption.includes('cspell') ? 'eslintCspell.config.js' : 'eslint.config.js';
    await fs.copyFile(templatePath('common', eslintTemplate), path.join(cwd, 'eslint.config.js'));
    console.log(pc.green('✔') + '    eslint.config.js');
  }

  if (lintOption.includes('cspell')) {
    await copyIfMissing(templatePath('common', 'cspell.json'), path.join(cwd, 'cspell.json'), 'cspell.json');
    if (await fs.pathExists(path.join(cwd, 'cspell.json'))) {
      await appendAuthorToCspell(cwd, authorName);
    }
  }

  if (!isFrontend && !isApp && (vitestPreset === 'native' || vitestPreset === 'coverage')) {
    await fs.copyFile(templatePath('common', `vitest.config.${vitestPreset}.ts`), path.join(cwd, 'vitest.config.ts'));
    console.log(pc.green('✔') + '    vitest.config.ts');
  }

  if (lintOption.includes('commitlint')) {
    await copyIfMissing(
      templatePath('common', 'commitlint.config.js'),
      path.join(cwd, 'commitlint.config.js'),
      'commitlint.config.js',
    );
  }

  await copyIfMissing(templatePath('common', '.editorconfig'), path.join(cwd, '.editorconfig'), '.editorconfig');
  await copyIfMissing(templatePath('common', '_gitignore'), path.join(cwd, '.gitignore'), '.gitignore');
  await copyIfMissing(templatePath('common', '.prettierignore'), path.join(cwd, '.prettierignore'), '.prettierignore');

  if (lintOption.includes('secretlint')) {
    await copyIfMissing(
      templatePath('common', '.secretlintrc.json'),
      path.join(cwd, '.secretlintrc.json'),
      '.secretlintrc.json',
    );
  }

  if (setupPrecommit) {
    const huskyDir = path.join(cwd, '.husky');
    await fs.ensureDir(huskyDir);

    const preCommitDest = path.join(huskyDir, 'pre-commit');
    if (!(await fs.pathExists(preCommitDest))) {
      const lines = ['npx lint-staged', 'npm run typecheck'];
      if (!isFrontend && !isApp && (vitestPreset === 'native' || vitestPreset === 'coverage')) {
        lines.push('npm run test');
      }
      await fs.writeFile(preCommitDest, `${lines.join('\n')}\n`);
      console.log(pc.green('✔') + '    .husky/pre-commit');
    } else {
      console.log(pc.dim('–') + '    .husky/pre-commit (already exists, skipped)');
    }

    if (lintOption.includes('commitlint')) {
      const commitMsgDest = path.join(huskyDir, 'commit-msg');
      await copyIfMissing(templatePath('common', '.husky/commit-msg'), commitMsgDest, '.husky/commit-msg');
    }
  }

  console.log(pc.green('→') + '  creating project directories:');

  if (!isFrontend && !isApp && projectType !== 'cli' && projectType !== 'backend') {
    const srcDir = path.join(cwd, 'src');
    await fs.ensureDir(srcDir);
    const mainTs = path.join(srcDir, 'main.ts');
    if (!(await fs.pathExists(mainTs))) {
      await fs.writeFile(
        mainTs,
        `export function helloWorld(): void {
  console.log('Hello, World!');
}

helloWorld();
`,
      );
      console.log(pc.green('✔') + '    src/main.ts');
    } else {
      console.log(pc.dim('–') + '    src/main.ts (already exists, skipped)');
    }

    if (vitestPreset === 'native' || vitestPreset === 'coverage') {
      const testDir = path.join(cwd, 'test');
      await fs.ensureDir(testDir);
      const mainTestTs = path.join(testDir, 'main.test.ts');
      if (!(await fs.pathExists(mainTestTs))) {
        await fs.writeFile(
          mainTestTs,
          `import { afterEach, describe, expect, it, vi } from 'vitest';

import { helloWorld } from '@/main';

describe('helloWorld', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs "Hello, World!" to the console', () => {
    const spy = vi.spyOn(console, 'log');
    helloWorld();
    expect(spy).toHaveBeenCalledWith('Hello, World!');
  });
});
`,
        );
        console.log(pc.green('✔') + '    test/main.test.ts');
      } else {
        console.log(pc.dim('–') + '    test/main.test.ts (already exists, skipped)');
      }
    }
  }

  const pkg = await fs.readJson(pkgPath);
  buildScripts(pkg, answers);
  const organizedPkg = orderPackageKeys(pkg);
  await fs.writeJson(pkgPath, organizedPkg, { spaces: 2 });

  const addedScripts = ['check', 'lint', 'format', 'typecheck'];
  if (lintOption.includes('cspell')) addedScripts.push('spellcheck');
  if (lintOption.includes('secretlint')) addedScripts.push('secretlint');
  if (vitestPreset === 'native' || vitestPreset === 'coverage') {
    addedScripts.push('test', 'test:unit', 'test:integration');
  }
  if (vitestPreset === 'coverage') addedScripts.push('test:coverage');
  if (isFrontend) addedScripts.push('build', 'dev', 'preview');
  if (answers.setupPlaywright) addedScripts.push('test:e2e', 'test:e2e:ui');

  console.log(pc.green('→') + '  scripts added in package.json:');
  for (const script of addedScripts) {
    console.log(pc.green('✔') + `    ${script}`);
  }
}
