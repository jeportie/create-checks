import { execa } from 'execa';
import pc from 'picocolors';

import { startSpinner } from './spinner.js';

function unique(items) {
  return [...new Set(items)];
}

function shouldSkipInstall() {
  const value = process.env.NO_INSTALL;
  if (!value) return false;
  return value !== '0' && value.toLowerCase() !== 'false';
}

export function getSemanticReleaseDevDeps() {
  return [
    'semantic-release',
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/npm',
    '@semantic-release/github',
    'conventional-changelog-conventionalcommits',
  ];
}

async function installWithRetry(args, startText, successText, failureText) {
  const stopSpinner = startSpinner(startText);
  const installCommand = args[1] === '-D' ? 'npm install -D' : 'npm install';

  try {
    await execa('npm', args, { stdio: 'pipe' });
    stopSpinner(successText);
    return;
  } catch (error) {
    stopSpinner(failureText, 'error');
    console.error(pc.red(`${installCommand} failed.`));
    if (error.stderr) console.error(error.stderr);
    if (error.stdout) console.error(error.stdout);
    console.log(pc.yellow('Retrying once with live npm output...'));
  }

  await execa('npm', args, { stdio: 'inherit' });
  console.log(pc.green('✔') + `  ${successText}`);
}

// Install a dev dependency pinned to the exact version of an already-installed
// package (e.g. an Expo-pinned one), falling back to the unpinned latest.
async function installDevPinnedTo(sourcePkg, targetName, startText, doneText) {
  const stop = startSpinner(startText);
  try {
    const { stdout: version } = await execa('node', [
      '-e',
      `process.stdout.write(require('${sourcePkg}/package.json').version)`,
    ]);
    await execa('npm', ['install', '-D', `${targetName}@${version}`], { stdio: 'pipe' });
  } catch {
    await execa('npm', ['install', '-D', targetName], { stdio: 'pipe' });
  }
  stop(doneText);
}

export async function installDeps(answers, options = {}) {
  if (shouldSkipInstall()) return;

  const { lintOption = [], setupPrecommit = true, vitestPreset, projectType, setupPlaywright, linter } = answers;
  const { extraDeps = [], extraProdDeps = [] } = options;

  const devDeps = [projectType === 'app' ? 'typescript@~5.9.2' : 'typescript@~5.9.3', '@types/node'];

  if (linter === 'biome') {
    devDeps.push('@biomejs/biome');
  } else if (linter === 'oxlint') {
    devDeps.push('oxlint@~1.51.0', 'oxfmt@^0.36.0');
  } else {
    devDeps.push(
      'eslint@^9',
      '@eslint/js@^9',
      'prettier',
      'eslint-config-prettier@^9.1.0',
      'typescript-eslint',
      '@stylistic/eslint-plugin',
      'eslint-plugin-import',
      'eslint-import-resolver-typescript',
    );
  }

  if (lintOption.includes('secretlint')) {
    devDeps.push('secretlint', '@secretlint/secretlint-rule-preset-recommend');
  }

  if (lintOption.includes('cspell')) {
    if (linter === 'eslint') {
      devDeps.push('@cspell/eslint-plugin');
    }
    devDeps.push('cspell@^8');
  }

  if (lintOption.includes('commitlint')) {
    devDeps.push('@commitlint/cli', '@commitlint/config-conventional');
    if (lintOption.includes('cspell')) {
      devDeps.push('commitlint-plugin-cspell');
    }
  }

  if (setupPrecommit && answers.precommitTool !== 'hk') {
    devDeps.push('husky', 'lint-staged');
  }

  if (vitestPreset === 'native' || vitestPreset === 'coverage') {
    devDeps.push('vitest@^2');
  }

  if (vitestPreset === 'coverage') {
    devDeps.push('@vitest/coverage-v8@^2');
  }

  if (projectType === 'frontend') {
    devDeps.push(
      'vite',
      '@vitejs/plugin-react@^5',
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
      '@testing-library/dom',
      'happy-dom',
      '@types/react',
      '@types/react-dom',
      'eslint-plugin-react-hooks',
      'eslint-plugin-react-refresh',
      'globals',
      '@vitest/coverage-v8@^2',
    );
  }

  if (projectType === 'electron') {
    devDeps.push(
      'electron@^39',
      'electron-vite@^5',
      'electron-builder@^26',
      'vite@^7',
      '@vitejs/plugin-react@^5',
      '@electron-toolkit/tsconfig@^2',
      '@types/react@^19',
      '@types/react-dom@^19',
    );
  }

  if (projectType === 'electron' && linter === 'eslint') {
    devDeps.push('eslint-plugin-react-hooks', 'eslint-plugin-react-refresh', 'globals');
  }

  if (projectType === 'electron' && (vitestPreset === 'native' || vitestPreset === 'coverage')) {
    devDeps.push(
      'happy-dom',
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
      '@testing-library/dom',
      '@vitest/coverage-v8@^2',
    );
  }

  if (projectType === 'npm-lib') {
    devDeps.push('tsup');
    if (answers.setupSemanticRelease) {
      devDeps.push(...getSemanticReleaseDevDeps());
    }
  }

  if (projectType === 'cli') {
    devDeps.push('tsup', 'tsx');
    if (answers.setupSemanticRelease) {
      devDeps.push(...getSemanticReleaseDevDeps());
    }
  }

  if (projectType === 'backend') {
    if (answers.backendFramework !== 'elysia') {
      devDeps.push('tsx');
    }
    if (answers.backendFramework === 'express') {
      devDeps.push('@types/express', 'supertest', '@types/supertest');
    }

    if (answers.setupDatabase) {
      if (answers.databaseOrm === 'drizzle') {
        devDeps.push('drizzle-kit');
        extraProdDeps.push('drizzle-orm');

        if (answers.databaseEngine === 'postgresql') {
          extraProdDeps.push('pg');
          devDeps.push('@types/pg');
        }

        if (answers.databaseEngine === 'mysql' || answers.databaseEngine === 'mariadb') {
          extraProdDeps.push('mysql2');
        }

        if (answers.databaseEngine === 'sqlite') {
          extraProdDeps.push('better-sqlite3');
          devDeps.push('@types/better-sqlite3');
        }
      }

      if (answers.databaseOrm === 'prisma') {
        devDeps.push('prisma@^6');
        extraProdDeps.push('@prisma/client@^6');
      }

      if (answers.databaseOrm === 'mongoose') {
        extraProdDeps.push('mongoose');
      }

      if (answers.databaseOrm === 'none') {
        if (answers.databaseEngine === 'postgresql') {
          extraProdDeps.push('pg');
          devDeps.push('@types/pg');
        }
        if (answers.databaseEngine === 'mysql' || answers.databaseEngine === 'mariadb') {
          extraProdDeps.push('mysql2');
        }
        if (answers.databaseEngine === 'sqlite') {
          extraProdDeps.push('better-sqlite3');
          devDeps.push('@types/better-sqlite3');
        }
      }

      if (answers.setupRedis) {
        extraProdDeps.push('ioredis');
      }
    }
  }

  if (projectType === 'app') {
    devDeps.push('@types/react', 'babel-preset-expo');
    if (answers.setupAppJest) {
      devDeps.push(
        'jest@~29.7.0',
        'jest-expo',
        '@jest/globals',
        '@types/jest@^29.5.14',
        '@testing-library/react-native@^12',
      );
    }
    if (answers.setupAppDetox) {
      devDeps.push('detox', '@types/jest@^29.5.14');
    }
  }

  if (setupPlaywright) {
    devDeps.push('@playwright/test');
  }

  const prodDeps = [...extraProdDeps];
  if (projectType === 'cli') {
    if (answers.cliFramework === 'inquirer') {
      prodDeps.push('inquirer');
    } else if (answers.cliFramework === 'clack') {
      prodDeps.push('@clack/prompts');
    } else {
      prodDeps.push('commander');
    }
  }

  if (projectType === 'backend') {
    if (answers.setupZod !== false) {
      prodDeps.push('zod');
    }
    if (answers.backendFramework === 'fastify') {
      prodDeps.push('fastify');
    } else if (answers.backendFramework === 'express') {
      prodDeps.push('express');
    } else if (answers.backendFramework === 'elysia') {
      prodDeps.push('elysia');
    } else {
      prodDeps.push('hono', '@hono/node-server');
    }
  }

  if (projectType === 'app') {
    prodDeps.push('expo', '@react-navigation/native', '@react-navigation/native-stack', '@tanstack/react-query');
  }

  if (projectType === 'frontend') {
    prodDeps.push(
      'react',
      'react-dom',
      'react-router',
      '@tanstack/react-query',
      'react-error-boundary',
      'tailwindcss',
      '@tailwindcss/vite',
    );
  }

  if (projectType === 'electron') {
    prodDeps.push('react@^19', 'react-dom@^19', '@electron-toolkit/preload@^3', '@electron-toolkit/utils@^4');
  }

  const finalProdDeps = unique(prodDeps);
  const finalDevDeps = unique([...devDeps, ...extraDeps]);

  if (finalProdDeps.length > 0) {
    await installWithRetry(
      ['install', ...finalProdDeps],
      'Installing dependencies...',
      'dependencies installed',
      'failed to install dependencies',
    );
    console.log(
      pc.green('✔') + `  installed ${finalProdDeps.length} runtime package${finalProdDeps.length === 1 ? '' : 's'}`,
    );
  }

  if (finalDevDeps.length > 0) {
    await installWithRetry(
      ['install', '-D', ...finalDevDeps],
      'Installing dev dependencies...',
      'dev dependencies installed',
      'failed to install dev dependencies',
    );
    console.log(
      pc.green('✔') + `  installed ${finalDevDeps.length} dev package${finalDevDeps.length === 1 ? '' : 's'}`,
    );
  }

  if (projectType === 'app') {
    const expoPkgs = [
      'expo-status-bar',
      'react',
      'react-native',
      'react-native-screens',
      'react-native-safe-area-context',
    ];
    const stopSpinner = startSpinner('Installing Expo-compatible versions...');
    try {
      await execa('npx', ['expo', 'install', ...expoPkgs], { stdio: 'pipe' });
    } catch {
      // npx expo install may crash in the post-install config plugin step
      // (e.g. autoAddConfigPlugins.js bug) even though packages were installed
      // successfully. Swallow the error and continue.
    }
    stopSpinner('Expo-compatible versions installed');

    if (answers.setupAppJest) {
      // Both packages must exactly match the Expo-pinned versions. The unpinned
      // latest @react-native/jest-preset expects a newer react-native internal
      // layout (react-native/setup-env) and breaks the jest-expo preset (CF-048);
      // react-test-renderer must line up with react.
      await installDevPinnedTo(
        'react-native',
        '@react-native/jest-preset',
        'Installing @react-native/jest-preset...',
        '@react-native/jest-preset installed',
      );
      await installDevPinnedTo(
        'react',
        'react-test-renderer',
        'Installing react-test-renderer...',
        'react-test-renderer installed',
      );
    }
  }
}
