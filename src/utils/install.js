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

  if (setupPlaywright) {
    devDeps.push('@playwright/test');
  }

  const prodDeps = [...extraProdDeps];
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
