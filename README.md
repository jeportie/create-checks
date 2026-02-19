# npm-package-starter

## What is this?

A simple scaffolding tool for creating a new project to be published to npm.  
It provides a build command that will compile your code to a CommonJS Node target, allowing named imports for CommonJS packages inside ESM files.  
The package contains a simple "hello world" based on TypeScript, tested through Vitest and linted with ESLint, Prettier, Secretlint, Cspell, and CommitLint.  
It also provides a Husky pre-commit hook to run some linting based on prettier and eslint and run tests, so you can simply `git add` and `git commit` without worrying about anything else.

## Local development

Please make sure you have [`Node.js`](https://nodejs.org/) and [`pnpm`](https://pnpm.io/) installed.

### Node.js

You can use either `fnm` or `nvm` to install the version of Node defined in the [`.nvmrc`](.nvmrc) file.

- [Fast Node Manager (fnm)](https://github.com/Schniz/fnm)
  - `brew install fnm`
  - `fnm use`
- [Node Version Manager (nvm)](https://github.com/nvm-sh/nvm)
  - `brew install nvm`
  - `nvm use`

### PNPM

```sh
corepack enable
```

_Note:_ If you already have `pnpm` installed via `brew` or `npm i -g`, you should remove those versions as they are not needed anymore. Corepack will handle installing the correct version for you.

_Warning:_ If you get `command not found` when trying to run `corepack`, you probably didn't use `fnm`/`nvm` to install Node. The preferred fix is to use one of those tools to manage your installed Node versions. If you don't want to use them, you will need to install [`corepack`](https://github.com/nodejs/corepack) manually.

- `npm install -g corepack`

## How To Install?

```bash
git clone git://github.com/mjwheatley/npm-package-starter.git package_name
cd npm-package-starter
pnpm install
npx husky install
```

## What do you mean by `allowing named imports from CommonJS`?

If you try to run `npm run build` you will be able to import the `sayHello` function from the `index.js` file, both via `require` and `import` syntax.

### Importing via `require`

```js
const { sayHello } = require('my-package');
```

### Importing via `import`

```js
import { sayHello } from 'my-package';
```

# Why did you build it?

I got tired of copying and pasting the same files over and over again.  
This is a simple tool to create a new project with the basic files needed to publish to npm.

# How can I personalize it?

You can change the `package.json` file to your liking, bringing your own package name and description.

- Update package `name`
- Update package `description`
- Update `repository.url`
- Update `author`
- Update `exports` to represent your package's individual file exports

# What's Inside?

- Typescript
- Vitest
- Eslint
- Prettier
- Husky
- Commitlint
- Secretlint
- Cspell
- Semantic Release

# How to push and release an update?

Merge or push changes to the `main` branch to trigger the `semantic-release` GitHub workflow.

If you are publishing to the public NPM registry, create an `NPM_TOKEN` secret in your GitHub repository with your NPM token.

Commitlint will enforce [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) so `semantic-release` can automatically version your package.

# How to run tests?

```bash
pnpm test
```
