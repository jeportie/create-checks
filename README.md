# create-checks

A zero-config scaffolding CLI that wires **ESLint + Prettier + TypeScript** into any Node.js project — and optionally sets up **Vitest** for testing — in one interactive command.

```sh
npm create @jeportie/checks
```

---

## What it does

Running `npm create @jeportie/checks` inside an existing project will:

1. **Install** ESLint, Prettier, and their plugins as dev dependencies
2. **Copy** config files into your project root:
   - `eslint.config.js` and `prettier.config.js`
   - `.editorconfig`, `tsconfig.base.json`, `tsconfig.json`
   - `.eslintignore`, `.prettierignore`, `.gitignore`
3. **Inject** scripts into your `package.json`:
   - `lint` → `eslint .`
   - `format` → `prettier . --write`
   - `typecheck` → `tsc --noEmit`
4. **Prompt** you to optionally set up Vitest with a choice of presets

All existing files are left untouched (the CLI skips them with a notice).

---

## Quick start

```sh
# Inside your existing project
npm create @jeportie/checks

# ESLint / Prettier / TypeScript scripts
npm run lint
npm run format
npm run typecheck

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
npm create @jeportie/checks
        │
        └─▶ npm downloads the create-checks package
            └─▶ node runs ./src/index.js  (registered via "bin" in package.json)
                │
                ├─ 1. npm install -D eslint prettier ...   (in YOUR project's CWD)
                ├─ 2. copy template config files → YOUR project root
                ├─ 3. read YOUR project/package.json → inject scripts → write it back
                └─ 4. ask interactively whether to set up Vitest (and which preset)
```

### Template path resolution

Inside `src/index.js`:

```js
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();
```

- `__dirname` always points to `create-checks/src/` — the CLI's own files, wherever npm installed them
- `cwd` is **your** project's directory — where files get copied and `package.json` gets updated

This separation is what lets a `create-*` tool safely write into an unrelated target directory.

### How `bin` mapping works in npm

```json
"bin": {
  "create-checks": "./src/index.js"
}
```

When npm installs a package that has a `bin` field, it creates a symlink in `node_modules/.bin/`. When you run `npm create foo`, npm translates that into `npm exec create-foo` and executes the registered binary. The `#!/usr/bin/env node` shebang on line 1 of `src/index.js` tells the OS to run it with Node.

---

## What gets installed in your project

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

**Vitest preset — Native** (when selected):

| Package   | Purpose                      |
| --------- | ---------------------------- |
| `vitest`  | Fast, Vite-native test runner |

**Vitest preset — Coverage** (when selected):

| Package                 | Purpose                                    |
| ----------------------- | ------------------------------------------ |
| `vitest`                | Fast, Vite-native test runner              |
| `@vitest/coverage-v8`   | Code coverage powered by V8                |

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

Strict TypeScript configuration. `tsconfig.json` includes `src`, `test`, `__tests__`, and root-level `*.ts` / `*.js` files.

### `vitest.config.ts` (Vitest presets only)

Both presets create a `vitest.config.ts` in your project root with:

- A `resolve.alias` mapping `@` → `src/` so your tests can import using the same path alias as your source code:

  ```ts
  import { myUtil } from '@/utils/myUtil';
  ```

- A `test.include` that covers both `__tests__/` and `test/` directory conventions:

  ```ts
  include: [
    '**/__tests__/**/*.{test,spec}.{ts,tsx,js}',
    '**/test/**/*.{test,spec}.{ts,tsx,js}',
  ]
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
  ❯ Native — vitest + path alias (@→src), test/test:unit/test:integration scripts
    Coverage — adds @vitest/coverage-v8, HTML/JSON reports, test:coverage script
```

### Native preset

Installs `vitest` and adds these scripts:

```json
"test":             "vitest --run",
"test:unit":        "vitest unit --run",
"test:integration": "vitest int --run"
```

`test:unit` matches any file whose path contains `unit`.
`test:integration` matches any file whose path contains `int`.

### Coverage preset

Installs `vitest` + `@vitest/coverage-v8` and adds:

```json
"test":             "vitest --run",
"test:unit":        "vitest unit --run",
"test:integration": "vitest int --run",
"test:coverage":    "vitest --coverage --run"
```

Coverage reports are written to `coverage/` and include HTML, JSON, and a JSON summary (compatible with GitHub Actions PR annotations).

---

## Non-interactive / CI usage

Set the `VITEST_PRESET` environment variable to bypass the interactive prompt:

```sh
# Skip Vitest setup
VITEST_PRESET=none node ./src/index.js

# Install vitest with path alias only
VITEST_PRESET=native node ./src/index.js

# Install vitest with coverage reporting
VITEST_PRESET=coverage node ./src/index.js
```

Set `NO_INSTALL=1` to skip all `npm install` calls (useful for testing):

```sh
NO_INSTALL=1 node ./src/index.js
```

---

## Next steps — optional tooling

After running `create-checks`, here are recommended tools to layer on top:

### Husky — git hooks

Runs linting/tests automatically before every commit.

```sh
npm install -D husky
npx husky init
```

Add to `.husky/pre-commit`:

```sh
npx lint-staged
```

### lint-staged — only lint changed files

Prevents the pre-commit hook from linting your entire codebase.

```sh
npm install -D lint-staged
```

Add to `package.json`:

```json
"lint-staged": {
  "*.{js,ts}": ["eslint --fix", "prettier --write"],
  "*.{json,yml,md}": ["prettier --write --ignore-unknown"]
}
```

### Commitlint — enforce Conventional Commits

Ensures commit messages follow the `feat:`, `fix:`, `chore:` convention required by semantic-release.

```sh
npm install -D @commitlint/cli @commitlint/config-conventional
echo "export default { extends: ['@commitlint/config-conventional'] };" > commitlint.config.js
```

Add to `.husky/commit-msg`:

```sh
npx --no -- commitlint --edit $1
```

### Secretlint — prevent secret leaks

Scans your files for accidentally committed API keys, tokens, and passwords.

```sh
npm install -D secretlint @secretlint/secretlint-rule-preset-recommend
```

Add a `.secretlintrc.json`:

```json
{
  "rules": [{ "id": "@secretlint/secretlint-rule-preset-recommend" }]
}
```

Add to `package.json` scripts:

```json
"secretlint": "secretlint ./src --maskSecrets"
```

### CSpell — spell checking

Catches typos in source code, comments, and docs.

```sh
npm install -D cspell
```

Add to `package.json` scripts:

```json
"spellcheck": "cspell --no-progress \"./**/*.{js,ts,md,json}\""
```

### Semantic Release — automated versioning and publishing

Reads your Conventional Commits and automatically bumps the version, generates a changelog, and publishes to npm.

See [How to release](#how-to-release) below.

---

## How to release

This repo is pre-configured with [semantic-release](https://semantic-release.gitbook.io/semantic-release/).

### One-time setup

1. Create an **npm access token** at [npmjs.com → Access Tokens](https://www.npmjs.com/settings/~/tokens) (type: **Automation**)
2. Add it as a secret named `NPM_TOKEN` in your GitHub repo under **Settings → Secrets → Actions**
3. `GITHUB_TOKEN` is provided automatically — no action needed

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

### Requirements

- Node.js 20+ (see `.nvmrc`)
- npm

### Setup

```sh
git clone https://github.com/jeportie/create-checks.git
cd create-checks
npm install
```

### Run tests

```sh
npm test                  # all tests (30 integration tests)
npm run test:integration  # integration tests only
npm run test:coverage     # with coverage report
```

### Test a local build

```sh
mkdir /tmp/my-test-project
cd /tmp/my-test-project
npm init -y
node /path/to/create-checks/src/index.js
```

To test non-interactively:

```sh
VITEST_PRESET=coverage NO_INSTALL=1 node /path/to/create-checks/src/index.js
```

### Project structure

```
create-checks/
├── src/
│   ├── index.js                          # CLI entrypoint (#!/usr/bin/env node)
│   └── templates/
│       ├── eslint.config.js              # copied into the user's project
│       ├── prettier.config.js
│       ├── .editorconfig
│       ├── .eslintignore                 # dist, node_modules, package-lock.json, coverage
│       ├── .prettierignore              # dist, node_modules, package-lock.json, coverage
│       ├── .gitignore                   # node_modules, dist, coverage, .env*, *.log
│       ├── tsconfig.base.json
│       ├── tsconfig.json                # includes src, test, __tests__
│       ├── vitest.config.native.ts      # resolve alias + test:unit/integration
│       └── vitest.config.coverage.ts    # + coverage block and test:coverage
├── __tests__/
│   └── integration/
│       └── index.int.test.js            # 30 integration tests
├── .github/workflows/
│   ├── pull-request-checks.yml
│   └── semantic-release.yml
├── release.config.mjs                   # semantic-release configuration
└── package.json
```

---

## License

MIT
