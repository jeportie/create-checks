import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  /* ---------------- GLOBAL IGNORES ---------------- */
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.vite/**',
    ],
  },

  /* ---------------- BASE CONFIGS ---------------- */
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  /* ---------------- TYPESCRIPT PARSER OPTIONS ---------------- */
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  /* ---------------- IMPORT PLUGIN ---------------- */
  {
    plugins: {
      import: importPlugin,
    },

    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },

    rules: {
      'import/first': 'error',
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/no-unresolved': 'error',
      'import/no-useless-path-segments': 'error',
      'import/order': [
        'error',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            ['sibling', 'index'],
            'type',
          ],
          'newlines-between': 'always',
        },
      ],
    },
  },

  /* ---------------- STYLISTIC RULES ---------------- */
  {
    plugins: {
      '@stylistic': stylistic,
    },

    rules: {
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
    },
  },

  /* ---------------- GENERAL RULES ---------------- */
  {
    rules: {
      'sort-imports': 'off',
      'spaced-comment': [
        'error',
        'always',
        { block: { markers: ['!'], balanced: true } },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },

  /* ---------------- TEST OVERRIDES ---------------- */
  {
    files: [
      '**/__tests__/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },

  /* ---------------- CONFIG FILES ---------------- */
  {
    files: ['*.config.{js,mjs,cjs}', '**/*.config.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },

  /* ---------------- PRETTIER MUST BE LAST ---------------- */
  prettier,
);
