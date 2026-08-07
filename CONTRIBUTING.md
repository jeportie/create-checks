# Contributing to tskickstart

Thank you for your interest in contributing. This document explains how the project is structured, how to add features, and what's expected in a pull request.

---

## Getting started

### Prerequisites

- Node.js 22+ — use [mise](https://mise.jdx.dev/), [nvm](https://github.com/nvm-sh/nvm), or [fnm](https://github.com/Schniz/fnm)
- npm

### Setup

```sh
git clone https://github.com/jeportie/tskickstart.git
cd tskickstart
npm install
```

This installs dev dependencies and runs `husky` to set up git hooks automatically.

---

## Project structure

```
src/
  index.js                            # CLI entrypoint (#!/usr/bin/env node)
  prompts/
    project-type.js                   # "What are you building?" prompt
    common.js                         # Shared prompts (linter, vitest, husky, CI/CD, secrets)
    backend.js                        # Backend prompts (framework, Docker, Zod, database)
    frontend.js                       # Frontend-specific prompts
    cli.js                            # CLI prompts (framework, name, semantic-release)
    npm-lib.js                        # npm-lib prompts (semantic-release, package manager)
    app.js                            # Mobile app prompts (workflow, testing)
    database.js                       # Database engine + ORM prompts
    cicd.js                           # CI/CD pipeline prompt
    playwright.js                     # "Set up Playwright?" prompt
  generators/
    common.js                         # Shared config generation (all project types)
    backend.js                        # Server, Docker, database templates
    frontend.js                       # React + Vite + Tailwind generation
    cli.js                            # bin wiring, command templates
    npm-lib.js                        # tsup, exports, semantic-release setup
    app.js                            # Expo + React Native generation
    database.js                       # Database scaffold (engine + ORM combos)
    cicd.js                           # GitHub Actions CI workflow
    playwright.js                     # Playwright config and spec generation
  templates/
    common/                           # Shared templates (eslint, prettier, biome, tsconfig, husky)
    backend/                          # Server, Docker templates
    frontend/                         # React starter (components, tests, configs)
    cli/                              # Command and test templates per framework
    npm-lib/                          # tsup config, CI/semantic-release workflows
    app/                              # Expo starter (screens, navigation, configs)
    database/                         # DB templates: drizzle/, prisma/, mongoose/, raw/, redis/
    playwright/                       # Playwright config and example specs
  utils/
    file-system.js                    # copyIfMissing, templatePath helpers
    install.js                        # npm install logic with dependency selection
    scripts.js                        # buildScripts, orderScripts, orderPackageKeys
    readme.js                         # Full README generation per project type
    prompt.js                         # Inquirer wrapper with cancel handling
    wizard.js                         # Multi-step wizard with back navigation
    spinner.js                        # Animated terminal spinner

tests/
  integration/
    index.int.test.js                 # Core scaffold tests (all types)
    backend.int.test.js               # Backend-specific (framework, Docker, DB)
    frontend.int.test.js              # Frontend-specific (React, Vite, Tailwind)
    cli.int.test.js                   # CLI-specific (commander, inquirer, clack)
    npm-lib.int.test.js               # npm-lib-specific (tsup, semantic-release)
    app.int.test.js                   # Mobile app (Expo, Jest, Detox)
    database.int.test.js              # Database scaffold (all engine+ORM combos)
    database-boundary.int.test.js     # DB is backend-only capability
    cicd.int.test.js                  # CI/CD workflow generation
    biome.int.test.js                 # Biome linter alternative
    readme.int.test.js                # README generation assertions
    cspell.int.test.js                # CSpell word list generation
    playwright.int.test.js            # Playwright scaffold
    prompt-back.int.test.js           # Back navigation in wizard
    prompts-defaults.int.test.js      # Default prompt values
    secrets.int.test.js               # Secret capture and .env bootstrap
    spinner.int.test.js               # Spinner animation
  unit/
    install.int.test.js               # Install utility tests
```

---

## How the CLI works

The CLI follows a pipeline: **prompts → generators → templates**.

1. `src/index.js` calls the project-type prompt, then type-specific prompts, then common prompts
2. Answers flow into `generateCommon()` which handles shared setup (configs, scripts, deps)
3. Type-specific generators (`generateBackend()`, `generateFrontend()`, etc.) scaffold additional files
4. `buildScripts()` in `src/utils/scripts.js` assembles the `package.json` scripts section
5. `writeReadme()` in `src/utils/readme.js` generates a context-aware README

---

## Making changes

### Adding a new template file

1. Add the file to the appropriate `src/templates/<type>/` directory
2. Add a copy/generate call in the matching `src/generators/<type>.js`
3. Add a test assertion in `tests/integration/<type>.int.test.js`

Example — adding a config to the backend type:

```js
// src/generators/backend.js
await copyIfMissing(backendTemplatePath('new-config.json'), path.join(cwd, 'new-config.json'), 'new-config.json');
```

```js
// tests/integration/backend.int.test.js
it('creates new-config.json', () => {
  expect(existsSync(join(tmpDir, 'new-config.json'))).toBe(true);
});
```

### Adding a new injected script

Scripts are built in `src/utils/scripts.js` inside the `buildScripts()` function:

```js
// src/utils/scripts.js
if (someCondition) {
  pkg.scripts['new:script'] = 'some-command';
}
```

Add the script name to the `scriptOrder` array if it should appear in a specific position. Add a test:

```js
expect(pkg.scripts).toHaveProperty('new:script', 'some-command');
```

### Changing what gets npm-installed

Dependencies are managed in `src/utils/install.js` inside the `installDeps()` function. Dev dependencies go in `devDeps`, production dependencies go in `prodDeps`. Both are conditional on `answers` from the prompts.

### Adding a new project type

1. Create `src/prompts/<type>.js` — export an `ask<Type>Questions()` function
2. Create `src/generators/<type>.js` — export a `generate<Type>()` function
3. Create `src/templates/<type>/` — template files
4. Wire the type into `src/prompts/project-type.js` and `src/index.js`
5. Add install logic in `src/utils/install.js`
6. Add scripts in `src/utils/scripts.js`
7. Add README generation in `src/utils/readme.js`
8. Create `tests/integration/<type>.int.test.js`

---

## Running tests

```sh
npm test                  # run all tests once
npm run test:coverage     # run with coverage report
npm run test:integration  # integration tests only
```

Tests use [Vitest](https://vitest.dev/). Integration tests spawn `src/index.js` as a subprocess in a temporary directory with `NO_INSTALL=1` to skip `npm install` (for speed). The temp directory is cleaned up after each test.

---

## Code style

This project uses ESLint and Prettier for its own source code.

```sh
npm run lint      # check for lint errors
npm run format    # auto-fix formatting
```

The pre-commit hook runs both automatically via `lint-staged`.

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

---

## Pull request checklist

Before opening a PR:

- [ ] `npm test` passes with no failures
- [ ] `npm run lint` passes with no errors
- [ ] New behavior is covered by a test
- [ ] Commit messages follow Conventional Commits format
- [ ] If you added a template file, confirm it is inside `src/` (which is included in `"files"`)

---

## How releases work

You do not need to do anything to release. Merging a PR to `main` triggers the `semantic-release.yml` workflow, which:

1. Analyses commit history since the last git tag
2. Determines the version bump (`feat` → minor, `fix` → patch, breaking → major)
3. Publishes to npm using the `NPM_TOKEN` secret
4. Creates a GitHub Release with auto-generated notes
5. Tags the commit (`v1.2.3`)

Do not manually edit the `version` field in `package.json`.
