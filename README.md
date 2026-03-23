# tskickstart

A zero-config scaffolding CLI that wires **ESLint + Prettier + TypeScript** into any Node.js project — and optionally sets up **Vitest**, **Husky**, **lint-staged**, **Commitlint**, **CSpell**, and **Secretlint** — in one interactive command.

```sh
npm create @jeportie/tskickstart
```

---

## What it does

Running `npm create @jeportie/tskickstart` inside an existing project will ask you a series of questions and then:

1. **Ensure `package.json` exists** — creates one with `npm init -y` if missing, or patches `"type": "module"` if it is already there but missing that field
2. **Install** ESLint, Prettier, TypeScript and their plugins as dev dependencies
3. **Copy** config files into your project root
4. **Inject scripts** into your `package.json`
5. **Set up optional tooling** based on your answers to the interactive prompts

### Interactive prompts

| Prompt | What it sets up |
| --- | --- |
| **Your name** | Reads from `git config github.user` (then `user.name`); added to `package.json` and cspell |
| **Select more lint options** | Multi-select: `cspell`, `secretlint`, `commitlint` |
| **Set up Vitest?** | Optional test runner — choose Native or Coverage preset |
| **Set up pre-commit hook?** | Husky + lint-staged wired to your selected tools |

All existing files are left untouched (the CLI skips them with a notice).

---

## Quick start

```sh
# Inside your existing project
npm create @jeportie/tskickstart

# Run all checks at once
npm run check

# Individual tools
npm run lint
npm run format
npm run typecheck
npm run spellcheck    # if cspell was selected
npm run secretlint    # if secretlint was selected

# If you chose the Native or Coverage Vitest preset
npm test
npm run test:unit
npm run test:integration

# If you chose the Coverage preset
npm run test:coverage
```

---

## How it works internally

```
npm create @jeportie/tskickstart
        │
        └─▶ npm downloads the create-tskickstart package
            └─▶ node runs ./src/index.js  (registered via "bin" in package.json)
                │
                ├─ 1. read author name (git config github.user → user.name → prompt if missing)
                ├─ 2. prompt — lint options (cspell / secretlint / commitlint)
                ├─ 3. prompt — Vitest preset (none / native / coverage)
                ├─ 4. prompt — pre-commit hook (husky + lint-staged)
                ├─ 5. ensure package.json exists and has "type": "module"
                ├─ 6. npm install -D eslint prettier ... (+ selected optional deps)
                ├─ 7. copy template config files → YOUR project root
                ├─ 8. create src/main.ts (and test/ if Vitest chosen)
                └─ 9. inject scripts + author + lint-staged config → YOUR package.json
```

### Template path resolution

Inside `src/index.js`:

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

### Always installed

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

Uses ESLint's flat config format (ESLint 9+). Includes:

- `@eslint/js` recommended rules
- Full TypeScript type-checked rules via `typescript-eslint`
- Stylistic rules (single quotes, spaced comments)
- Import ordering and cycle detection
- Prettier compatibility (must be last)
- Test file overrides (relaxed rules in `*.test.*`)

When cspell is selected, `eslintCspell.config.js` is used instead, which adds `@cspell/eslint-plugin` to report spelling errors directly in ESLint output.

### `prettier.config.js`

Standard Prettier settings:

- Single quotes, trailing commas, 80-char print width
- No semicolons in prose, arrow parens always

### `.eslintignore` / `.prettierignore`

Both ignore files are pre-populated with:

```
dist
node_modules
package-lock.json
coverage
```

### `.gitignore`

Includes `node_modules`, `dist`, `coverage`, `.env*`, and `*.log`.

### `tsconfig.base.json` / `tsconfig.json`

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

- A `test.include` that covers both `tests/` and `test/` directory conventions:

  ```ts
  include: ['**/tests/**/*.{test,spec}.{ts,tsx,js}', '**/test/**/*.{test,spec}.{ts,tsx,js}'];
  ```

**Coverage preset** additionally adds:

```ts
coverage: {
  enabled: true,
  reporter: ['json-summary', 'json', 'html'],
  include: ['src/**/*'],
  reportOnFailure: true,
},
```

The `coverage/` output folder is automatically excluded from ESLint, Prettier, and Git via the installed ignore files.

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

Set the `VITEST_PRESET` environment variable to bypass the Vitest interactive prompt:

```sh
# Skip Vitest setup
VITEST_PRESET=none node ./src/index.js

# Install vitest with path alias only
VITEST_PRESET=native node ./src/index.js

# Install vitest with coverage reporting
VITEST_PRESET=coverage node ./src/index.js
```

Set `AUTHOR_NAME` to bypass the git config lookup and author prompt:

```sh
AUTHOR_NAME="Jane Doe" node ./src/index.js
```

Set `NO_INSTALL=1` to skip all `npm install` calls (useful for testing):

```sh
NO_INSTALL=1 node ./src/index.js
```

---

## How to release

This repo uses [semantic-release](https://semantic-release.gitbook.io/semantic-release/). Requires `NPM_TOKEN` and `GITHUB_TOKEN` secrets in the repo.

### Release flow

```
git commit -m "feat: add support for --skip-install flag"
git push origin main
        │
        └─▶ GitHub Actions: semantic-release.yml
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
npm test                  # all tests
npm run test:integration  # integration tests only
npm run test:coverage     # with coverage report
```

### Project structure

```
tskickstart/
├── src/
│   ├── index.js                          # CLI entrypoint (#!/usr/bin/env node)
│   └── templates/
│       ├── eslint.config.js              # copied when cspell is NOT selected
│       ├── eslintCspell.config.js        # copied when cspell IS selected
│       ├── prettier.config.js
│       ├── .editorconfig
│       ├── .eslintignore
│       ├── .prettierignore
│       ├── _gitignore                    # copied as .gitignore
│       ├── tsconfig.base.json
│       ├── tsconfig.json
│       ├── cspell.json                   # copied when cspell is selected
│       ├── .secretlintrc.json            # copied when secretlint is selected
│       ├── commitlint.config.js          # copied when commitlint is selected
│       ├── .husky/
│       │   ├── pre-commit                # template (generated dynamically at runtime)
│       │   └── commit-msg               # template (written only when commitlint selected)
│       ├── vitest.config.native.ts       # resolve alias + test:unit/integration
│       └── vitest.config.coverage.ts    # + coverage block and test:coverage
├── tests/
│   └── integration/
│       └── index.int.test.js
├── .github/workflows/
│   ├── pull-request-checks.yml
│   └── semantic-release.yml
├── release.config.mjs                   # semantic-release configuration
└── package.json
```

---

## License

MIT
