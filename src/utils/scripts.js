export function orderScripts(scripts) {
  const scriptOrder = [
    'test',
    'check',
    'format',
    'lint',
    'typecheck',
    'spellcheck',
    'secretlint',
    'prepare',
    'test:unit',
    'test:integration',
    'test:coverage',
    'test:e2e',
    'test:e2e:ui',
    'test:e2e:build',
    'build',
    'dev',
    'preview',
    'start',
    'android',
    'ios',
  ];

  const ordered = {};
  for (const key of scriptOrder) {
    if (key in scripts) ordered[key] = scripts[key];
  }
  for (const key of Object.keys(scripts)) {
    if (!(key in ordered)) ordered[key] = scripts[key];
  }
  return ordered;
}

export function orderPackageKeys(pkg) {
  const topLevelOrder = [
    'name',
    'description',
    'version',
    'author',
    'license',
    'keywords',
    'type',
    'main',
    'module',
    'types',
    'bin',
    'exports',
    'files',
    'scripts',
    'devDependencies',
    'dependencies',
  ];

  const organized = {};
  for (const key of topLevelOrder) {
    if (key in pkg) organized[key] = pkg[key];
  }
  for (const key of Object.keys(pkg)) {
    if (!topLevelOrder.includes(key) && key !== 'lint-staged') {
      organized[key] = pkg[key];
    }
  }
  if (pkg['lint-staged']) organized['lint-staged'] = pkg['lint-staged'];
  return organized;
}

export function buildScripts(pkg, answers) {
  const {
    lintOption = [],
    vitestPreset,
    setupPrecommit = true,
    authorName,
    projectType,
    setupPlaywright = false,
  } = answers;

  const checkParts = ['npm run format', 'npm run lint', 'npm run typecheck'];
  if (lintOption.includes('cspell')) checkParts.push('npm run spellcheck');
  if (lintOption.includes('secretlint')) checkParts.push('npm run secretlint');
  if (vitestPreset === 'native' || vitestPreset === 'coverage') checkParts.push('npm run test');
  if (projectType === 'app') checkParts.push('npm run test');

  pkg.scripts = {
    ...pkg.scripts,
    check: checkParts.join(' && '),
    format: 'prettier . --write',
    lint: 'eslint .',
    typecheck: projectType === 'frontend' ? 'tsc -b' : 'tsc --noEmit',
  };

  if (lintOption.includes('cspell')) {
    pkg.scripts.spellcheck = 'cspell lint .';
  }

  if (lintOption.includes('secretlint')) {
    pkg.scripts.secretlint = 'secretlint **/*';
  }

  if (setupPrecommit) {
    pkg.scripts.prepare = 'husky';
  }

  if (vitestPreset === 'native' || vitestPreset === 'coverage') {
    pkg.scripts.test = 'vitest --run';
    pkg.scripts['test:unit'] = 'vitest unit --run';
    pkg.scripts['test:integration'] = 'vitest int --run';
  }

  if (vitestPreset === 'coverage') {
    pkg.scripts['test:coverage'] = 'vitest --coverage --run';
  }

  if (projectType === 'frontend') {
    pkg.scripts.dev = 'vite';
    pkg.scripts.build = 'tsc -b && vite build';
    pkg.scripts.preview = 'vite preview';
  }

  if (projectType === 'npm-lib') {
    pkg.scripts.build = 'tsup';
  }

  if (projectType === 'cli') {
    pkg.scripts.build = 'tsup';
    pkg.scripts.dev = 'tsx src/index.ts';
    pkg.scripts.start = 'node dist/index.cjs';
  }

  if (projectType === 'backend') {
    if (answers.backendFramework === 'elysia') {
      pkg.scripts.dev = 'bun run --watch src/index.ts';
      pkg.scripts.build = 'bun build src/index.ts --outdir dist';
      pkg.scripts.start = 'bun dist/index.js';
    } else {
      pkg.scripts.dev = 'tsx watch src/index.ts';
      pkg.scripts.build = 'tsc';
      pkg.scripts.start = 'node dist/index.js';
    }
  }

  if (projectType === 'app') {
    pkg.scripts.start = 'expo start';
    pkg.scripts.android = 'expo run:android';
    pkg.scripts.ios = 'expo run:ios';
    pkg.scripts.test = 'jest';
    pkg.scripts['test:e2e:build'] = 'detox build --configuration ios.sim.debug';
    pkg.scripts['test:e2e'] = 'detox test --configuration ios.sim.debug';
    pkg.scripts.typecheck = 'tsc --noEmit';
  }

  if (setupPlaywright) {
    pkg.scripts['test:e2e'] = 'npx playwright test';
    pkg.scripts['test:e2e:ui'] = 'npx playwright test --ui';
  }

  if (setupPrecommit) {
    const lintStagedCmds = ['npm run format', 'npm run lint'];
    if (lintOption.includes('cspell')) lintStagedCmds.push('npm run spellcheck');
    if (lintOption.includes('secretlint')) lintStagedCmds.push('npm run secretlint');
    pkg['lint-staged'] = { '**/*': lintStagedCmds };
  }

  if (authorName && !pkg.author) pkg.author = authorName;
  if (!pkg.license) pkg.license = 'MIT';
  if (!pkg.keywords) pkg.keywords = [];
  if (
    !['frontend', 'npm-lib', 'cli', 'backend', 'app'].includes(projectType) &&
    (!pkg.main || pkg.main === 'index.js')
  ) {
    pkg.main = 'src/main.ts';
  }

  pkg.scripts = orderScripts(pkg.scripts);
  return pkg;
}
