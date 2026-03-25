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

async function installWithRetry(args, startText, successText, failureText) {
  const stopSpinner = startSpinner(startText);

  try {
    await execa('npm', args, { stdio: 'pipe' });
    stopSpinner(successText);
    return;
  } catch (error) {
    stopSpinner(failureText, 'error');
    console.error(pc.red(`npm ${args.join(' ')} failed.`));
    if (error.stderr) console.error(error.stderr);
    if (error.stdout) console.error(error.stdout);
    console.log(pc.yellow('Retrying once with live npm output...'));
  }

  await execa('npm', args, { stdio: 'inherit' });
  console.log(pc.green('✔') + `  ${successText}`);
}

export async function installDeps(answers, options = {}) {
  if (shouldSkipInstall()) return;

  const { lintOption = [], setupPrecommit = true, vitestPreset, projectType, setupPlaywright } = answers;
  const { extraDeps = [], extraProdDeps = [] } = options;

  const devDeps = [
    'eslint@^9',
    '@eslint/js@^9',
    'prettier',
    'eslint-config-prettier@^9.1.0',
    'typescript-eslint',
    '@stylistic/eslint-plugin',
    'eslint-plugin-import',
    'eslint-import-resolver-typescript',
    projectType === 'app' ? 'typescript@~5.9.2' : 'typescript',
    '@types/node',
  ];

  if (lintOption.includes('secretlint')) {
    devDeps.push('secretlint', '@secretlint/secretlint-rule-preset-recommend');
  }

  if (lintOption.includes('cspell')) {
    devDeps.push('cspell', '@cspell/eslint-plugin');
  }

  if (lintOption.includes('commitlint')) {
    devDeps.push('@commitlint/cli', '@commitlint/config-conventional');
    if (lintOption.includes('cspell')) {
      devDeps.push('commitlint-plugin-cspell');
    }
  }

  if (setupPrecommit) {
    devDeps.push('husky', 'lint-staged');
  }

  if (vitestPreset === 'native' || vitestPreset === 'coverage') {
    devDeps.push('vitest');
  }

  if (vitestPreset === 'coverage') {
    devDeps.push('@vitest/coverage-v8');
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
    );
  }

  if (projectType === 'npm-lib') {
    devDeps.push('tsup');
    if (answers.setupSemanticRelease) {
      devDeps.push(
        'semantic-release',
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/npm',
        '@semantic-release/github',
        'conventional-changelog-conventionalcommits',
      );
    }
  }

  if (projectType === 'cli') {
    devDeps.push('tsup', 'tsx');
    if (answers.setupSemanticRelease) {
      devDeps.push(
        'semantic-release',
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/npm',
        '@semantic-release/github',
        'conventional-changelog-conventionalcommits',
      );
    }
  }

  if (projectType === 'backend') {
    if (answers.backendFramework !== 'elysia') {
      devDeps.push('tsx');
    }
    if (answers.backendFramework === 'express') {
      devDeps.push('@types/express', 'supertest', '@types/supertest');
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
        '@testing-library/react-native',
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

  const finalProdDeps = unique(prodDeps);
  const finalDevDeps = unique([...devDeps, ...extraDeps]);

  if (finalProdDeps.length > 0) {
    await installWithRetry(
      ['install', ...finalProdDeps],
      'Installing dependencies...',
      'dependencies installed',
      'failed to install dependencies',
    );
  }

  if (finalDevDeps.length > 0) {
    await installWithRetry(
      ['install', '-D', ...finalDevDeps],
      'Installing dev dependencies...',
      'dev dependencies installed',
      'failed to install dev dependencies',
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
      // react-test-renderer must exactly match the Expo-pinned react version
      const stopRtr = startSpinner('Installing react-test-renderer...');
      try {
        const { stdout: reactVersion } = await execa('node', [
          '-e',
          "process.stdout.write(require('react/package.json').version)",
        ]);
        await execa('npm', ['install', '-D', `react-test-renderer@${reactVersion}`], { stdio: 'pipe' });
      } catch {
        await execa('npm', ['install', '-D', 'react-test-renderer'], { stdio: 'pipe' });
      }
      stopRtr('react-test-renderer installed');
    }
  }
}
