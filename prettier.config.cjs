/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
module.exports = {
  plugins: ['prettier-plugin-organize-imports'],
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  bracketSameLine: false,
  bracketSpacing: true,
  arrowParens: 'always', // Better for TS when you want to add a type to a parameter.
  requirePragma: false,
  insertPragma: false,
  proseWrap: 'never',
};
