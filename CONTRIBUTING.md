# Contributing to create-checks

Thank you for your interest in contributing. This document explains how the project is structured, how to add features, and what's expected in a pull request.

---

## Getting started

### Prerequisites

- Node.js 20+ — use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) with `.nvmrc`
- npm

### Setup

```sh
git clone https://github.com/jeportie/create-checks.git
cd create-checks
npm install
```

This installs dev dependencies and runs `husky` to set up git hooks automatically.

---

## Project structure

```
src/
  index.js              # CLI entrypoint — the only file that runs when a user calls the tool
  templates/
    eslint.config.js    # Template copied into the user's project
    prettier.config.js  # Template copied into the user's project

__tests__/
  integration/
    index.int.test.js   # Integration tests — spawn the CLI in a tmp dir, assert file output

.github/workflows/
  pull-request-checks.yml   # Lint + test on every PR
  semantic-release.yml      # Auto-publish on push to main

release.config.mjs          # semantic-release plugin configuration
commitlint.config.js        # Commit message rules
lint-staged.config.mjs      # What runs on pre-commit (eslint, prettier, cspell, secretlint)
```

---

## Making changes

### Adding a new template file

1. Add the file to `src/templates/`
2. Add a `fs.copyFile(...)` call in `src/index.js` to copy it into `cwd`
3. Add a test assertion in `__tests__/integration/index.int.test.js` that checks the file exists

Example — adding a `.editorconfig` template:

```js
// src/index.js
await fs.copyFile(path.join(__dirname, 'templates/.editorconfig'), path.join(cwd, '.editorconfig'));
```

```js
// __tests__/integration/index.int.test.js
it('copies .editorconfig to the target directory', () => {
  // ...
  expect(existsSync(join(tmpDir, '.editorconfig'))).toBe(true);
});
```

### Adding a new injected script

Scripts are merged into the user's `package.json` in the `UPDATE package.json` section of `src/index.js`:

```js
pkg.scripts = {
  ...pkg.scripts, // preserve the user's existing scripts
  lint: 'eslint .',
  format: 'prettier . --write',
  // add your new script here
};
```

Add a corresponding test assertion:

```js
expect(pkg.scripts).toHaveProperty('your-script', 'your-command');
```

### Changing what gets npm-installed

The `npm install -D ...` call in `src/index.js` controls which packages are added to the user's project. Add or remove packages from that array.

---

## Running tests

```sh
npm test                  # run all tests once
npm run test:coverage     # run with coverage report
npm run test:integration  # integration tests only
```

Tests use [Vitest](https://vitest.dev/). Integration tests spawn `src/index.js` as a subprocess in a temporary directory with `NO_INSTALL=1` to skip the actual `npm install` step (for speed). The temp directory is cleaned up after each test.

---

## Code style

This project eats its own cooking — it uses ESLint and Prettier for its own source code.

```sh
npm run lint      # check for lint errors
npm run format    # auto-fix formatting
```

The pre-commit hook runs both automatically via `lint-staged`. You should not need to run them manually unless you want early feedback.

---

## Commit message format

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) enforced by `commitlint`. Every commit message must follow this format:

```
<type>(<optional scope>): <description>
```

| Type       | When to use                                  |
| ---------- | -------------------------------------------- |
| `feat`     | A new feature or behavior                    |
| `fix`      | A bug fix                                    |
| `docs`     | Documentation only                           |
| `test`     | Adding or fixing tests                       |
| `refactor` | Code restructuring without changing behavior |
| `chore`    | Maintenance tasks (deps, config, ci)         |
| `ci`       | Changes to GitHub Actions workflows          |
| `style`    | Formatting, whitespace (no logic change)     |

**Why this matters:** `semantic-release` reads these commit messages to determine the next version number and generate the changelog. A `feat` triggers a minor bump, a `fix` triggers a patch bump, a `feat!` or `BREAKING CHANGE:` in the footer triggers a major bump.

Examples:

```
feat: add --skip-install flag for offline environments
fix: resolve template path on Windows when using spaces in path
docs: add CONTRIBUTING.md
test: add assertion for .editorconfig copy
chore: upgrade eslint to v9.10
```

---

## Pull request checklist

Before opening a PR:

- [ ] `npm test` passes with no failures
- [ ] `npm run lint` passes with no errors
- [ ] New behavior is covered by a test
- [ ] Commit messages follow Conventional Commits format
- [ ] If you added a template file, it is also listed in `.npmignore` exclusions **if it should not be shipped**, or confirmed to be in `src/` (which is included in `"files"`)

---

## How releases work

You do not need to do anything to release. Merging a PR to `main` triggers the `semantic-release.yml` workflow, which:

1. Analyses commit history since the last git tag
2. Determines the version bump (`feat` → minor, `fix` → patch, breaking → major)
3. Publishes to npm using the `NPM_TOKEN` secret
4. Creates a GitHub Release with auto-generated notes
5. Tags the commit (`v1.2.3`)

Do not manually edit the `version` field in `package.json`.
