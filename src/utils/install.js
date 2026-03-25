import { execa } from 'execa';

import { startSpinner } from './spinner.js';

function unique(items) {
  return [...new Set(items)];
}

export async function installDeps(answers, options = {}) {
  if (process.env.NO_INSTALL) return;

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
    'typescript',
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
    devDeps.push(
      'jest',
      '@jest/globals',
      '@testing-library/react-native',
      '@types/react',
      'detox',
      'react-test-renderer',
      'babel-preset-expo',
    );
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
    prodDeps.push('zod');
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
    prodDeps.push(
      'expo',
      'expo-status-bar',
      'react',
      'react-native',
      '@react-navigation/native',
      '@react-navigation/native-stack',
      'react-native-screens',
      'react-native-safe-area-context',
      '@tanstack/react-query',
    );
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
    const stopSpinner = startSpinner('Installing dependencies...');
    await execa('npm', ['install', ...finalProdDeps], { stdio: 'ignore' });
    stopSpinner('dependencies installed');
  }

  if (finalDevDeps.length > 0) {
    const stopSpinner = startSpinner('Installing dev dependencies...');
    await execa('npm', ['install', '-D', ...finalDevDeps], { stdio: 'ignore' });
    stopSpinner('dev dependencies installed');
  }
}
