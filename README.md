# tskickstart

A zero-config scaffolding CLI that sets up production-ready **TypeScript** projects in one interactive command. Pick your project type, answer a few questions, and get a fully wired dev environment with linting, formatting, testing, and git hooks.

```sh
npm create @jeportie/tskickstart
```

---

## Project types

The CLI first asks what you're building, then tailors everything to that choice:

| Type                | What you get                                                     |
| ------------------- | ---------------------------------------------------------------- |
| **npm library**     | Node.js library scaffold with `src/main.ts` and test boilerplate |
| **CLI tool**        | Same as npm library (CLI-specific templates coming soon)         |
| **backend service** | Same as npm library (backend-specific templates coming soon)     |
| **frontend app**    | React + Vite + Tailwind CSS v4 starter with component tests      |
| **fullstack app**   | Frontend + backend (fullstack-specific templates coming soon)    |

All project types share a common foundation: ESLint 9 flat config, Prettier, TypeScript strict mode, and optional tooling (Vitest, Husky, CSpell, Secretlint, Commitlint).

---

## What it does

Running `npm create @jeportie/tskickstart` inside a project directory will:

1. **Ask your project type** — npm library, CLI tool, backend, frontend, or fullstack
2. **Ensure `package.json` exists** — creates one with `npm init -y` if missing, or patches `"type": "module"`
3. **Install** all required dev dependencies for your selections
4. **Copy** config files and starter templates into your project root
5. **Inject scripts** into your `package.json`
6. **Set up optional tooling** based on your answers

### Interactive prompts

| Prompt | What it sets up |
| --- | --- |
| **What are you building?** | Project type — determines which templates and dependencies are used |
| **Your name** | Reads from `git config github.user` (then `user.name`); added to `package.json` and cspell |
| **Select more lint options** | Multi-select: `cspell`, `secretlint`, `commitlint` |
| **Set up Vitest?** | Optional test runner — choose Native or Coverage preset |
| **Set up pre-commit hook?** | Husky + lint-staged wired to your selected tools |
| **Set up Playwright?** | E2E testing with Playwright (frontend/fullstack only) |

All existing files are left untouched (the CLI skips them with a notice).

---

## Quick start

```sh
# Inside your project directory
npm create @jeportie/tskickstart

# Run all checks at once
npm run check

# Individual tools
npm run lint
npm run format
npm run typecheck
npm run spellcheck    # if cspell was selected
npm run secretlint    # if secretlint was selected

# If you chose Vitest
npm test
npm run test:unit
npm run test:integration
npm run test:coverage  # coverage preset only

# Frontend projects
npm run dev            # Vite dev server
npm run build          # TypeScript + Vite build
npm run preview        # Preview production build

# If you chose Playwright
npm run test:e2e       # Run E2E tests headless
npm run test:e2e:ui    # Run E2E tests with Playwright UI
```

---

## Frontend starter

When you select **frontend app**, the CLI scaffolds a complete React + Vite + Tailwind CSS v4 project:

### What gets created

```
your-project/
├── index.html
├── vite.config.ts
├── vitest.config.ts          # happy-dom + Testing Library
├── tsconfig.json             # project references
├── tsconfig.app.json         # app source config
├── tsconfig.node.json        # vite/node config
├── tsconfig.test.json        # test config
├── eslint.config.js          # React-specific ESLint rules
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Root component
│   ├── Welcome.tsx           # Welcome page component
│   ├── index.css             # Tailwind CSS entry
│   ├── vite-env.d.ts         # Vite type references
│   └── assets/               # SVG assets (React, Vite, Tailwind logos)
└── tests/
    ├── setup.ts              # Testing Library setup
    ├── unit/App.unit.test.tsx
    └── integration/App.int.test.tsx
```

### Frontend dependencies

**Production:** `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `react-error-boundary`, `tailwindcss`, `@tailwindcss/vite`

**Dev:** `vite`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@testing-library/dom`, `happy-dom`, `@types/react`, `@types/react-dom`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`

### Frontend ESLint config

The frontend gets its own `eslint.config.js` with:

- Everything from the common config (TypeScript type-checked rules, import ordering, Prettier)
- `eslint-plugin-react-hooks` — enforces Rules of Hooks
- `eslint-plugin-react-refresh` — flags components that can't be safely hot-reloaded
- Relaxed rules for test files

---

## Playwright E2E testing

Available for **frontend** and **fullstack** project types. When enabled:

- Installs `@playwright/test`
- Copies `playwright.config.ts` (configured with `testDir: 'tests/e2e'`, `baseURL: 'http://localhost:5173'`)
- Creates `tests/e2e/` with a starter spec file
- Appends `playwright-report/` and `test-results/` to `.gitignore`
- Adds `test:e2e` and `test:e2e:ui` scripts

The frontend starter includes a `welcome.spec.ts` that validates the Welcome page renders correctly.

---

## How it works internally

```
npm create @jeportie/tskickstart
        │
        └──▶ npm downloads the create-tskickstart package
            └──▶ node runs ./src/index.js
                │
                ├─ 1. prompt — project type (npm-lib / cli / backend / frontend / fullstack)
                ├─ 2. prompt — author name (git config → prompt)
                ├─ 3. prompt — lint options (cspell / secretlint / commitlint)
                ├─ 4. prompt — Vitest preset (none / native / coverage)
                ├─ 5. prompt — pre-commit hook (husky + lint-staged)
                ├─ 6. prompt — Playwright E2E (frontend/fullstack only)
                ├─ 7. ensure package.json + "type": "module"
                ├─ 8. npm install all selected dependencies
                ├─ 9. copy common config templates → project root
                ├─ 10. copy project-type-specific templates (frontend starter, etc.)
                ├─ 11. copy Playwright templates (if selected)
                └─ 12. inject scripts + author + lint-staged → package.json
```

### Modular architecture

The codebase is organized into four layers:

| Directory         | Purpose                                                                  |
| ----------------- | ------------------------------------------------------------------------ |
| `src/prompts/`    | Interactive prompt modules — one per concern                             |
| `src/generators/` | File generation logic — common, frontend, playwright                     |
| `src/templates/`  | Template files organized by type (`common/`, `frontend/`, `playwright/`) |
| `src/utils/`      | Shared utilities — prompt wrapper, spinner, fs helpers, install, scripts |

### Template path resolution

```js
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();
```

- `__dirname` always points to `create-tskickstart/src/` — the CLI's own files, wherever npm installed them
- `cwd` is **your** project's directory — where files get copied and `package.json` gets updated

This separation is what lets a `create-*` tool safely write into an unrelated target directory.

### How `bin` mapping works in npm

```json
"bin": {
  "create-tskickstart": "./src/index.js"
}
```

When npm installs a package that has a `bin` field, it creates a symlink in `node_modules/.bin/`. When you run `npm create foo`, npm translates that into `npm exec create-foo` and executes the registered binary. The `#!/usr/bin/env node` shebang on line 1 of `src/index.js` tells the OS to run it with Node.

---

## What gets installed in your project

### Always installed (all project types)

| Package                             | Purpose                                           |
| ----------------------------------- | ------------------------------------------------- |
| `eslint`                            | JavaScript/TypeScript linter                      |
| `prettier`                          | Opinionated code formatter                        |
| `eslint-config-prettier`            | Disables ESLint rules that conflict with Prettier |
| `typescript-eslint`                 | TypeScript parser and rules for ESLint            |
| `@stylistic/eslint-plugin`          | Code style rules (quotes, spacing, etc.)          |
| `eslint-plugin-import`              | Import order and resolution rules                 |
| `eslint-import-resolver-typescript` | Resolves TypeScript paths in import plugin        |
| `typescript`                        | TypeScript compiler                               |
| `@types/node`                       | Node.js type definitions                          |

### If **cspell** is selected

| Package                 | Purpose                                 |
| ----------------------- | --------------------------------------- |
| `cspell`                | Spell checker for source code and docs  |
| `@cspell/eslint-plugin` | ESLint integration — flags typos inline |

When cspell is selected, `eslintCspell.config.js` is used instead of the base `eslint.config.js`, adding the `@cspell/eslint-plugin` rule directly into ESLint.

### If **secretlint** is selected

| Package                                        | Purpose                               |
| ---------------------------------------------- | ------------------------------------- |
| `secretlint`                                   | Scans files for leaked secrets/tokens |
| `@secretlint/secretlint-rule-preset-recommend` | Default ruleset for secretlint        |

### If **commitlint** is selected

| Package                           | Purpose                                     |
| --------------------------------- | ------------------------------------------- |
| `@commitlint/cli`                 | Lint commit messages                        |
| `@commitlint/config-conventional` | Conventional Commits ruleset                |
| `commitlint-plugin-cspell`        | Spell-check commit messages _(cspell only)_ |

### If **pre-commit hook** is selected

| Package       | Purpose                          |
| ------------- | -------------------------------- |
| `husky`       | Git hooks manager                |
| `lint-staged` | Run linters only on staged files |

The `.husky/pre-commit` hook is generated dynamically based on your selections:

```sh
npx lint-staged
npm run typecheck
npm run test        # only if a Vitest preset was chosen
```

The `.husky/commit-msg` hook is only written if commitlint was selected:

```sh
npx commitlint --edit
```

The `lint-staged` config in `package.json` is also generated dynamically:

```json
"lint-staged": {
  "**/*": ["npm run format", "npm run lint", "npm run spellcheck", "npm run secretlint"]
}
```

Only the commands for tools you selected are included.

### Vitest preset — Native

| Package  | Purpose                       |
| -------- | ----------------------------- |
| `vitest` | Fast, Vite-native test runner |

### Vitest preset — Coverage

| Package               | Purpose                       |
| --------------------- | ----------------------------- |
| `vitest`              | Fast, Vite-native test runner |
| `@vitest/coverage-v8` | Code coverage powered by V8   |

---

## What the templates configure

### `eslint.config.js`

Uses ESLint's flat config format (ESLint 9+). No `.eslintignore` — ignores are defined in the config's `ignores` array. Includes:

- `@eslint/js` recommended rules
- Full TypeScript type-checked rules via `typescript-eslint`
- Stylistic rules (single quotes, spaced comments with `///` triple-slash support)
- Import ordering and cycle detection
- Prettier compatibility (must be last)
- Test file overrides (relaxed rules in `tests/`, `*.test.*`, `*.spec.*`)
- Config file overrides (type-checking disabled for `*.config.js`)

### `prettier.config.js`

Standard Prettier settings:

- Single quotes, trailing commas, 80-char print width
- No semicolons in prose, arrow parens always

### `.prettierignore`

Pre-populated with: `dist`, `node_modules`, `package-lock.json`, `coverage`

### `.gitignore`

Includes `node_modules`, `dist`, `coverage`, `.env*`, and `*.log`.

### `tsconfig.base.json` / `tsconfig.json` (non-frontend)

Strict TypeScript configuration. `tsconfig.json` includes `src`, `test`, `tests`, and root-level `*.ts` / `*.js` files.

### `commitlint.config.js` (commitlint only)

Extends `@commitlint/config-conventional`. If cspell was also selected, the `commitlint-plugin-cspell` plugin is added to spell-check commit message bodies.

### `.secretlintrc.json` (secretlint only)

Enables the full `@secretlint/secretlint-rule-preset-recommend` ruleset to catch API keys, tokens, private keys, and similar secrets.

### `cspell.json` (cspell only)

Base CSpell config with the default English dictionary and common programming word lists enabled.

### `vitest.config.ts` (Vitest presets only)

Both presets create a `vitest.config.ts` in your project root with:

- A `resolve.alias` mapping `@` → `src/` so your tests can import using the same path alias as your source code:

  ```ts
  import { myUtil } from '@/utils/myUtil';
  ```

- A `test.include` that covers both `tests/` and `test/` directory conventions
- A `test.exclude` for `node_modules/`

**Coverage preset** additionally adds:

```ts
coverage: {
  enabled: true,
  reporter: ['json-summary', 'json', 'html'],
  include: ['src/**/*'],
  reportOnFailure: true,
},
```

The `coverage/` output folder is automatically excluded from ESLint, Prettier, and Git via the ignore configs.

---

## Vitest presets in detail

When the CLI runs interactively it asks:

```
? Do you want to set up Vitest for testing? (Y/n)
? Which Vitest configuration would you like?
  ❯ Native — vitest
    Coverage — vitest + @vitest/coverage-v8
```

### Native preset

Installs `vitest` and adds these scripts:

```json
"test":             "vitest --run",
"test:unit":        "vitest unit --run",
"test:integration": "vitest int --run"
```

`test:unit` matches any file whose path contains `unit`. `test:integration` matches any file whose path contains `int`.

Also adds a `@` → `src/` path alias in `vitest.config.ts` and configures test discovery for both `tests/` and `test/` directories.

### Coverage preset

Everything from Native, plus installs `@vitest/coverage-v8` and adds:

```json
"test:coverage": "vitest --coverage --run"
```

Coverage reports are written to `coverage/` and include HTML, JSON, and a JSON summary (compatible with GitHub Actions PR annotations).

---

## Non-interactive / CI usage

Control behavior via environment variables to bypass interactive prompts:

```sh
# Project type
PROJECT_TYPE=frontend node ./src/index.js

# Vitest preset
VITEST_PRESET=native node ./src/index.js
VITEST_PRESET=coverage node ./src/index.js
VITEST_PRESET=none node ./src/index.js

# Playwright (frontend/fullstack only)
PLAYWRIGHT=1 node ./src/index.js
PLAYWRIGHT=0 node ./src/index.js

# Author name
AUTHOR_NAME="Jane Doe" node ./src/index.js

# Skip npm install (useful for testing)
NO_INSTALL=1 node ./src/index.js

# Combine them
PROJECT_TYPE=frontend VITEST_PRESET=coverage PLAYWRIGHT=1 NO_INSTALL=1 node ./src/index.js
```

---

## How to release

This repo uses [semantic-release](https://semantic-release.gitbook.io/semantic-release/). Requires `NPM_TOKEN` and `GITHUB_TOKEN` secrets in the repo.

### Release flow

```
git commit -m "feat: add support for --skip-install flag"
git push origin main
        │
        └──▶ GitHub Actions: semantic-release.yml
             ├─ Analyzes commits since last tag
             │   feat  → minor bump  (0.1.0 → 0.2.0)
             │   fix   → patch bump  (0.1.0 → 0.1.1)
             │   feat! → major bump  (0.1.0 → 1.0.0)
             ├─ Generates release notes
             ├─ Publishes to npm registry
             └─ Creates a GitHub Release + git tag (v0.2.0)
```

**Never bump the version in `package.json` manually** — semantic-release owns that. The placeholder `"0.0.0-semantically-released"` is intentional and gets replaced at publish time.

### Commit message format

```
<type>(<scope>): <description>

feat: add --dry-run flag
fix: resolve template path on Windows
docs: update README with next steps
chore: upgrade eslint to v9
```

---

## Development

Node.js 20+ required. Run `npm install` after cloning.

### Run tests

```sh
npm test                  # all 68 integration tests
npm run test:integration  # integration tests only
npm run test:coverage     # with coverage report
```

### Project structure

```
tskickstart/
├── src/
│   ├── index.js                              # CLI entrypoint — thin orchestrator
│   ├── prompts/
│   │   ├── project-type.js                   # "What are you building?" prompt
│   │   ├── common.js                         # Author, lint options, vitest, husky prompts
│   │   ├── frontend.js                       # Frontend-specific prompts (placeholder)
│   │   └── playwright.js                     # "Set up Playwright?" prompt
│   ├── generators/
│   │   ├── common.js                         # Shared config generation (all project types)
│   │   ├── frontend.js                       # React + Vite + Tailwind file generation
│   │   └── playwright.js                     # Playwright config and spec generation
│   ├── templates/
│   │   ├── common/                           # Shared templates (eslint, prettier, tsconfig, etc.)
│   │   ├── frontend/                         # React starter (components, tests, configs)
│   │   └── playwright/                       # Playwright config and example specs
│   └── utils/
│       ├── file-system.js                    # copyIfMissing, templatePath helpers
│       ├── install.js                        # npm install logic with dep selection
│       ├── prompt.js                         # Inquirer wrapper
│       ├── scripts.js                        # package.json script injection and ordering
│       └── spinner.js                        # Terminal spinner for install progress
├── tests/
│   └── integration/
│       ├── index.int.test.js                 # 47 tests — common scaffold
│       ├── frontend.int.test.js              # 13 tests — frontend starter
│       └── playwright.int.test.js            # 8 tests — Playwright scaffold
├── .github/workflows/
│   ├── pull-request-checks.yml
│   └── semantic-release.yml
├── release.config.mjs                        # semantic-release configuration
└── package.json
```

---

## License

MIT
