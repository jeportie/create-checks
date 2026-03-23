# ESLint Rules Reference

Rules enforced by `tskickstart`. All rules apply to TypeScript projects using ESLint flat config.

---

## Base Configs (inherited)

### `eslint.configs.recommended`

Core JavaScript rules. Key rules included:

- `no-unused-vars` — variables must be used
- `no-undef` — no references to undeclared variables
- `no-console` — warns on console usage
- `eqeqeq` — require `===` over `==`

### `tseslint.configs.recommendedTypeChecked`

TypeScript rules requiring type information:

- `@typescript-eslint/no-explicit-any` — forbid `any`
- `@typescript-eslint/no-floating-promises` — awaited promises must be handled
- `@typescript-eslint/no-misused-promises` — no promises in boolean conditions
- `@typescript-eslint/await-thenable` — only await actual promises
- `@typescript-eslint/no-unsafe-*` — family of rules preventing unsafe type usage

### `tseslint.configs.stylisticTypeChecked`

TypeScript stylistic consistency:

- `@typescript-eslint/consistent-type-imports` — prefer `import type`
- `@typescript-eslint/prefer-nullish-coalescing` — prefer `??` over `||`
- `@typescript-eslint/prefer-optional-chain` — prefer `a?.b` over `a && a.b`
- `@typescript-eslint/array-type` — consistent array type notation

---

## Import Plugin (`eslint-plugin-import`)

| Rule                              | Behavior                                              |
| --------------------------------- | ----------------------------------------------------- |
| `import/first`                    | All imports must appear before any other code         |
| `import/no-cycle`                 | No circular dependencies between modules              |
| `import/no-self-import`           | A file cannot import itself                           |
| `import/no-unresolved`            | Import paths must resolve to real files               |
| `import/no-useless-path-segments` | No redundant path segments (`./foo/../bar` → `./bar`) |
| `import/order`                    | Enforces import group ordering (see below)            |

### `import/order` groups (top → bottom)

```
builtin      →  node:fs, node:path
external     →  react, lodash
internal     →  @/components, @/utils
parent       →  ../foo
sibling      →  ./bar
index        →  ./
type         →  import type { Foo }
```

- Groups separated by a blank line
- Alphabetically sorted within each group
- `sort-imports` is disabled to avoid conflict with this rule

---

## Stylistic (`@stylistic/eslint-plugin`)

| Rule                | Behavior                                                                        |
| ------------------- | ------------------------------------------------------------------------------- |
| `@stylistic/quotes` | Single quotes required; double quotes allowed only to avoid escaping (`"it's"`) |

---

## General Rules

| Rule | Behavior |
| --- | --- |
| `sort-imports` | **Off** — handled by `import/order` |
| `spaced-comment` | Line comments need a space (`// foo`); block comments allow `/*!` markers for license headers |
| `@typescript-eslint/no-unused-vars` | Error on unused variables; names prefixed with `_` are exempt |

---

## Test File Overrides

Applies to: `**/tests/**/*.{ts,tsx}`, `**/*.test.{ts,tsx}`, `**/*.spec.{ts,tsx}`

| Rule                                         | Relaxed to                                          |
| -------------------------------------------- | --------------------------------------------------- |
| `@typescript-eslint/no-explicit-any`         | Off — mocks and stubs often require `any`           |
| `@typescript-eslint/no-unsafe-assignment`    | Off — untyped mock return values                    |
| `@typescript-eslint/no-unsafe-member-access` | Off — accessing `.mock.calls` etc. on untyped mocks |
| `@typescript-eslint/no-unsafe-call`          | Off — calling untyped mock functions                |

---

## Config File Overrides

Applies to: `*.config.{js,mjs,cjs}`, `**/*.config.{js,mjs,cjs}`

`tseslint.configs.disableTypeChecked` — disables all rules requiring type information, because config files are often outside the `tsconfig.json` scope.

---

## Prettier (last)

`eslint-config-prettier` disables all ESLint formatting rules that would conflict with Prettier output. Must always be the last entry in the config.

> Pinned to `^9.1.0` — v10 is ESM-only and breaks Neovim's ESLint language server which uses CommonJS `require()` internally.

---

## CSpell Variant (`eslintCspell.config.js`)

When **cspell** is selected during setup, `eslintCspell.config.js` is used instead of the base config. It is identical except it adds a `@cspell` plugin block:

```js
import cspellPlugin from '@cspell/eslint-plugin';

// added between the Stylistic and General Rules sections:
{
  plugins: { '@cspell': cspellPlugin },
  rules: {
    '@cspell/spellchecker': ['warn', { autoFix: true }],
  },
},
```

| Rule                   | Behavior                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `@cspell/spellchecker` | Warns on misspelled words inline in ESLint output; `autoFix: true` enables IDE quick-fixes |

Words added to `cspell.json` (the `words` array) are automatically whitelisted across both ESLint and the standalone `cspell lint` command.
