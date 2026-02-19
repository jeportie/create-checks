import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

export default tseslint.config([
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.vite/**',
    ],
  },

  eslint.configs.recommended,

  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    plugins: {
      '@stylistic': stylistic,
      import: importPlugin,
    },

    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },

    rules: {
      /* ---------------- IMPORTS ---------------- */
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

      /* ---------------- STYLISTIC ---------------- */
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      'spaced-comment': ['error', 'always'],

      /* ---------------- TYPESCRIPT ---------------- */
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },

  /* ---------------- TEST OVERRIDES ---------------- */
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },

  /* ---------------- CONFIG FILES ---------------- */
  {
    files: ['*.config.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },

  /* ---------------- PRETTIER MUST BE LAST ---------------- */
  prettier,
]);
