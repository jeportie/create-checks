const LOCK_FILES = /package-lock\.json|pnpm-lock\.yaml|yarn\.lock/;

export default {
  '*.{js,mjs,cjs}': ['eslint --fix', 'vitest related --run --exclude "**/*.int.test.js"'],
  '*.{js,mjs,cjs,json,yml,yaml,md}': ['prettier --write --ignore-unknown'],
  '*': (files) => {
    const spellable = files.filter((f) => !LOCK_FILES.test(f));
    return [
      `cspell lint --no-progress --no-summary --no-must-find-files ${spellable.join(' ')}`,
      `secretlint ${files.join(' ')}`,
    ];
  },
};
