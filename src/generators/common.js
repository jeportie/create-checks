import fs from 'fs-extra';
import { execa } from 'execa';
import pc from 'picocolors';
import path from 'node:path';

import { copyIfMissing, templatePath } from '../utils/file-system.js';
import { generateCicd } from './cicd.js';
import { installDeps } from '../utils/install.js';
import { writeReadme } from '../utils/readme.js';
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

async function appendWordsToCspell(cwd, words) {
  const cspellPath = path.join(cwd, 'cspell.json');
  if (!(await fs.pathExists(cspellPath))) return;

  const cspellJson = await fs.readJson(cspellPath);
  if (!cspellJson.words) cspellJson.words = [];

  for (const word of words) {
    if (!cspellJson.words.includes(word)) cspellJson.words.push(word);
  }

  await fs.writeJson(cspellPath, cspellJson, { spaces: 2 });
}

async function appendIgnorePathsToCspell(cwd, ignorePaths) {
  const cspellPath = path.join(cwd, 'cspell.json');
  if (!(await fs.pathExists(cspellPath))) return;

  const cspellJson = await fs.readJson(cspellPath);
  if (!cspellJson.ignorePaths) cspellJson.ignorePaths = [];

  for (const value of ignorePaths) {
    if (!cspellJson.ignorePaths.includes(value)) cspellJson.ignorePaths.push(value);
  }

  await fs.writeJson(cspellPath, cspellJson, { spaces: 2 });
}

function normalizeEnvLines(content) {
  return content
    .split('\n')
    .filter(Boolean)
    .reduce((acc, line) => {
      const [key] = line.split('=');
      if (!key) return acc;
      acc[key] = line.slice(key.length + 1);
      return acc;
    }, {});
}

async function bootstrapEnvFiles(cwd, answers) {
  if (!answers.captureSecrets) return;

  const secretValues = answers.secretValues ?? {};
  const envExamplePath = path.join(cwd, '.env.example');
  const envLocalPath = path.join(cwd, '.env.local');

  const envExampleContent = (await fs.pathExists(envExamplePath)) ? await fs.readFile(envExamplePath, 'utf-8') : '';
  const envLocalContent = (await fs.pathExists(envLocalPath)) ? await fs.readFile(envLocalPath, 'utf-8') : '';

  const exampleMap = normalizeEnvLines(envExampleContent);
  const localMap = normalizeEnvLines(envLocalContent);

  for (const key of Object.keys(secretValues)) {
    if (!(key in exampleMap)) exampleMap[key] = '';
    if (!(key in localMap)) localMap[key] = secretValues[key] ?? '';
  }

  const exampleLines = Object.entries(exampleMap).map(([key, value]) => `${key}=${value}`);
  const localLines = Object.entries(localMap).map(([key, value]) => `${key}=${value}`);

  await fs.writeFile(envExamplePath, `${exampleLines.join('\n')}\n`);
  await fs.writeFile(envLocalPath, `${localLines.join('\n')}\n`);
}

export async function generateCommon(answers, cwd = process.cwd()) {
  const pkgPath = path.join(cwd, 'package.json');
  const { lintOption = [], vitestPreset, setupPrecommit = true, authorName, projectType, linter = 'eslint' } = answers;
  const isFrontend = projectType === 'frontend';
  const isApp = projectType === 'app';

  await ensurePackageJson(pkgPath);

  if (isApp) {
    await fs.copyFile(templatePath('app', '.npmrc'), path.join(cwd, '.npmrc'));
  }

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

  if (linter === 'biome') {
    await fs.copyFile(templatePath('common', 'biome.json'), path.join(cwd, 'biome.json'));
    console.log(pc.green('✔') + '    biome.json');
  } else {
    await fs.copyFile(templatePath('common', 'prettier.config.js'), path.join(cwd, 'prettier.config.js'));
    console.log(pc.green('✔') + '    prettier.config.js');
  }

  if (!isFrontend && !isApp && linter !== 'biome') {
    const eslintTemplate = lintOption.includes('cspell') ? 'eslintCspell.config.js' : 'eslint.config.js';
    await fs.copyFile(templatePath('common', eslintTemplate), path.join(cwd, 'eslint.config.js'));
    console.log(pc.green('✔') + '    eslint.config.js');
  }

  if (lintOption.includes('cspell')) {
    await copyIfMissing(templatePath('common', 'cspell.json'), path.join(cwd, 'cspell.json'), 'cspell.json');
    await appendIgnorePathsToCspell(cwd, ['dist/**']);
    await appendWordsToCspell(cwd, ['tskickstart', 'composable', 'preconfigured', 'precommit', 'subroutes']);
    if (authorName) {
      await appendWordsToCspell(cwd, authorName.split(/\s+/).filter(Boolean));
    }
    if (projectType === 'backend') {
      await appendWordsToCspell(cwd, ['middlewares', 'onboarding']);
      if (answers.backendFramework === 'elysia') {
        await appendWordsToCspell(cwd, ['elysia', 'Elysia']);
      }
      if (answers.backendFramework === 'hono') {
        await appendWordsToCspell(cwd, ['Hono', 'hono']);
      }
      if (answers.backendFramework === 'fastify') {
        await appendWordsToCspell(cwd, ['Fastify', 'fastify']);
      }
    }
    if (isFrontend) {
      await appendWordsToCspell(cwd, ['tailwindcss', 'Tailwind']);
    }
    if (projectType === 'cli') {
      await appendWordsToCspell(cwd, ['shebang', 'subcommands']);
    }
    if (isApp) {
      await appendWordsToCspell(cwd, [
        'myapp',
        'Pressable',
        'react',
        'React',
        'react-native',
        'ReactNative',
        'expo',
        'Expo',
        'onboarding',
      ]);
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
  if (linter !== 'biome') {
    await copyIfMissing(
      templatePath('common', '.prettierignore'),
      path.join(cwd, '.prettierignore'),
      '.prettierignore',
    );
  }

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

  const wroteReadme = await writeReadme(answers, cwd);
  if (wroteReadme) {
    console.log(pc.green('→') + '  copying README.md');
    if (lintOption.includes('cspell')) {
      const pkg = await fs.readJson(pkgPath);
      if (pkg.name) {
        await appendWordsToCspell(cwd, pkg.name.split(/[-_/\s@]+/).filter(Boolean));
      }
    }
  } else {
    console.log(pc.dim('–') + '    README.md (already exists, skipped)');
  }

  await bootstrapEnvFiles(cwd, answers);

  await generateCicd(answers, cwd);
}
