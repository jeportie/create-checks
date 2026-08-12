/**
 * E2E install matrix.
 *
 * Each *dimension* maps a short LABEL to a partial env object. A *combination* is
 * one label picked per dimension, merged with the group's `fixed` env and
 * `PROJECT_TYPE`. Groups are a union of small cartesian products so we get broad
 * coverage of the promptless (env-var) surface without a full-cartesian blow-up.
 *
 * The env-var names mirror the CLI's promptless interface (src/prompts/*.js).
 * The engine/ORM pairs mirror `ormChoicesByEngine` in src/prompts/database.js.
 */

const linter = { eslint: { LINTER: 'eslint' }, biome: { LINTER: 'biome' }, oxlint: { LINTER: 'oxlint' } };

// engine + ORM pairs (ORM choices are constrained by engine — see src/prompts/database.js)
const dbPairs = {
  'pg-none': { DB_ENGINE: 'postgresql', DB_ORM: 'none' },
  'pg-drizzle': { DB_ENGINE: 'postgresql', DB_ORM: 'drizzle' },
  'pg-prisma': { DB_ENGINE: 'postgresql', DB_ORM: 'prisma' },
  'mysql-none': { DB_ENGINE: 'mysql', DB_ORM: 'none' },
  'mysql-drizzle': { DB_ENGINE: 'mysql', DB_ORM: 'drizzle' },
  'mysql-prisma': { DB_ENGINE: 'mysql', DB_ORM: 'prisma' },
  'mariadb-none': { DB_ENGINE: 'mariadb', DB_ORM: 'none' },
  'mariadb-drizzle': { DB_ENGINE: 'mariadb', DB_ORM: 'drizzle' },
  'mariadb-prisma': { DB_ENGINE: 'mariadb', DB_ORM: 'prisma' },
  'sqlite-none': { DB_ENGINE: 'sqlite', DB_ORM: 'none' },
  'sqlite-drizzle': { DB_ENGINE: 'sqlite', DB_ORM: 'drizzle' },
  'sqlite-prisma': { DB_ENGINE: 'sqlite', DB_ORM: 'prisma' },
  'mongo-mongoose': { DB_ENGINE: 'mongodb', DB_ORM: 'mongoose' },
};

/**
 * Tier-1 groups. Kept deliberately bounded: type-specific structural axes are
 * varied fully; the heavy common toggles live in a single dedicated group.
 */
export const GROUPS = [
  {
    id: 'npm-lib',
    type: 'npm-lib',
    dims: {
      linter,
      pkg: { npm: { PKG_MANAGER: 'npm' }, pnpm: { PKG_MANAGER: 'pnpm' } },
      release: { 'sr-off': { SEMANTIC_RELEASE: '0' }, 'sr-on': { SEMANTIC_RELEASE: '1' } },
    },
  },
  {
    id: 'cli',
    type: 'cli',
    dims: {
      linter,
      framework: {
        commander: { CLI_FRAMEWORK: 'commander' },
        inquirer: { CLI_FRAMEWORK: 'inquirer' },
        clack: { CLI_FRAMEWORK: 'clack' },
      },
      release: { 'sr-off': { SEMANTIC_RELEASE: '0' }, 'sr-on': { SEMANTIC_RELEASE: '1' } },
    },
  },
  {
    id: 'frontend',
    type: 'frontend',
    dims: {
      linter,
      e2e: { 'pw-off': { PLAYWRIGHT: '0' }, 'pw-on': { PLAYWRIGHT: '1' } },
    },
  },
  {
    id: 'electron',
    type: 'electron',
    dims: {
      linter,
      vitest: {
        'v-none': { VITEST_PRESET: 'none' },
        'v-native': { VITEST_PRESET: 'native' },
        'v-coverage': { VITEST_PRESET: 'coverage' },
      },
    },
  },
  {
    id: 'app',
    type: 'app',
    dims: {
      linter,
      workflow: { managed: { EXPO_WORKFLOW: 'managed' }, bare: { EXPO_WORKFLOW: 'bare' } },
      jest: { 'jest-off': { APP_JEST: '0' }, 'jest-on': { APP_JEST: '1' } },
      detox: { 'detox-off': { APP_DETOX: '0' }, 'detox-on': { APP_DETOX: '1' } },
    },
  },
  {
    id: 'backend-core',
    type: 'backend',
    fixed: { SETUP_DATABASE: '0' },
    dims: {
      linter,
      framework: {
        hono: { BACKEND_FRAMEWORK: 'hono' },
        fastify: { BACKEND_FRAMEWORK: 'fastify' },
        express: { BACKEND_FRAMEWORK: 'express' },
        elysia: { BACKEND_FRAMEWORK: 'elysia' },
      },
      zod: { 'zod-off': { BACKEND_ZOD: '0' }, 'zod-on': { BACKEND_ZOD: '1' } },
      docker: { 'docker-off': { DOCKER: '0' }, 'docker-on': { DOCKER: '1' } },
    },
  },
  {
    id: 'backend-db',
    type: 'backend',
    fixed: { BACKEND_FRAMEWORK: 'hono', DOCKER: '1', SETUP_DATABASE: '1' },
    dims: {
      linter,
      db: dbPairs,
      redis: { 'redis-off': { SETUP_REDIS: '0' }, 'redis-on': { SETUP_REDIS: '1' } },
    },
  },
  {
    id: 'backend-integration',
    type: 'backend',
    fixed: {
      BACKEND_FRAMEWORK: 'hono',
      SETUP_DATABASE: '1',
      DB_ENGINE: 'postgresql',
      DB_ORM: 'drizzle',
      SETUP_REDIS: '0',
    },
    dims: {
      linter,
      preset: { 'better-auth': { INTEGRATION_PRESET: 'better-auth' } },
    },
  },
  {
    id: 'common-toggles',
    type: 'npm-lib',
    dims: {
      vitest: {
        'v-none': { VITEST_PRESET: 'none' },
        'v-native': { VITEST_PRESET: 'native' },
        'v-coverage': { VITEST_PRESET: 'coverage' },
      },
      lintopts: {
        'lo-none': {},
        'lo-cspell': { LINT_OPTIONS: 'cspell' },
        'lo-all': { LINT_OPTIONS: 'cspell,secretlint,commitlint' },
      },
      precommit: {
        husky: { SETUP_PRECOMMIT: '1' },
        hk: { SETUP_PRECOMMIT: 'hk' },
        nohusky: { SETUP_PRECOMMIT: '0' },
      },
      cicd: { 'cicd-off': { SETUP_CICD: '0' }, 'cicd-on': { SETUP_CICD: '1' } },
    },
  },
];

function cartesian(dims) {
  const entries = Object.entries(dims);
  let acc = [[]];
  for (const [dim, choices] of entries) {
    const next = [];
    for (const picks of acc) {
      for (const [label, env] of Object.entries(choices)) {
        next.push([...picks, { dim, label, env }]);
      }
    }
    acc = next;
  }
  return acc;
}

/** Enumerate every Tier-1 combination from the given groups. */
export function enumerate(groups = GROUPS) {
  const combos = [];
  for (const group of groups) {
    for (const picks of cartesian(group.dims)) {
      const env = { PROJECT_TYPE: group.type, ...(group.fixed || {}) };
      for (const pick of picks) Object.assign(env, pick.env);
      const labels = picks.map((pick) => pick.label);
      combos.push({
        id: [group.id, ...labels].join('/'),
        group: group.id,
        type: group.type,
        labels,
        env,
      });
    }
  }
  return combos;
}

/** Core files a scaffold of each type must produce (conservative, extend after first run). */
export const MANIFESTS = {
  common: ['README.md'],
  'npm-lib': ['tsup.config.ts'],
  cli: ['src/index.ts', 'tsup.config.ts'],
  backend: ['src/index.ts', 'tsconfig.json'],
  frontend: ['vite.config.ts', 'src/main.tsx'],
  app: ['app.json', 'src/App.tsx'],
  electron: ['electron.vite.config.ts', 'src/main/index.ts'],
};

export const LINTER_FILES = { eslint: 'eslint.config.js', biome: 'biome.json', oxlint: '.oxlintrc.json' };

// Some files are conditional on env toggles rather than always present for a
// type, so they cannot live in the static MANIFESTS. electron ships renderer
// vitest files only when a preset is selected (no preset ⇒ they must be absent).
export function expectedFiles(combo) {
  const files = [...MANIFESTS.common, ...(MANIFESTS[combo.type] || [])];
  if (combo.type === 'electron' && ['native', 'coverage'].includes(combo.env.VITEST_PRESET)) {
    files.push('vitest.config.ts', 'tests/setup.ts', 'tests/unit/App.unit.test.tsx');
  }
  return files;
}

function verifyCombo(type, name, env) {
  // Verify combos model realistic installs. The cli/backend/frontend templates
  // always emit a vitest test file, so default VITEST_PRESET=native unless the
  // combo overrides it. (app uses jest, not vitest.)
  const withDefaults =
    type !== 'app' && env.VITEST_PRESET === undefined ? { VITEST_PRESET: 'native', ...env } : env;
  return {
    id: `verify/${type}/${name}`,
    group: `verify/${type}`,
    type,
    labels: [type, name],
    env: { PROJECT_TYPE: type, ...withDefaults },
  };
}

/**
 * Tier-2 curated subset: each framework / ORM / linter represented at least once.
 * Real install + `npm run check` (+ build). Kept small — real installs are slow.
 */
export const VERIFY = [
  verifyCombo('npm-lib', 'eslint-npm-coverage', {
    LINTER: 'eslint',
    PKG_MANAGER: 'npm',
    SEMANTIC_RELEASE: '0',
    VITEST_PRESET: 'coverage',
    LINT_OPTIONS: 'cspell,secretlint,commitlint',
  }),
  verifyCombo('npm-lib', 'biome-sr', { LINTER: 'biome', PKG_MANAGER: 'npm', SEMANTIC_RELEASE: '1' }),
  verifyCombo('npm-lib', 'oxlint-npm', { LINTER: 'oxlint', PKG_MANAGER: 'npm', SEMANTIC_RELEASE: '0' }),
  verifyCombo('cli', 'commander', { LINTER: 'eslint', CLI_FRAMEWORK: 'commander', SEMANTIC_RELEASE: '0', VITEST_PRESET: 'native' }),
  verifyCombo('cli', 'inquirer', { LINTER: 'eslint', CLI_FRAMEWORK: 'inquirer', SEMANTIC_RELEASE: '0' }),
  verifyCombo('cli', 'clack-biome', { LINTER: 'biome', CLI_FRAMEWORK: 'clack', SEMANTIC_RELEASE: '0' }),
  verifyCombo('frontend', 'eslint', { LINTER: 'eslint', PLAYWRIGHT: '0', VITEST_PRESET: 'native' }),
  verifyCombo('frontend', 'biome', { LINTER: 'biome', PLAYWRIGHT: '0' }),
  verifyCombo('app', 'managed-jest', { LINTER: 'eslint', EXPO_WORKFLOW: 'managed', APP_JEST: '1', APP_DETOX: '0' }),
  verifyCombo('backend', 'hono', {
    LINTER: 'eslint',
    BACKEND_FRAMEWORK: 'hono',
    BACKEND_ZOD: '1',
    DOCKER: '0',
    SETUP_DATABASE: '0',
    VITEST_PRESET: 'native',
  }),
  verifyCombo('backend', 'hono-hk', { LINTER: 'eslint', BACKEND_FRAMEWORK: 'hono', SETUP_PRECOMMIT: 'hk', VITEST_PRESET: 'native' }),
  verifyCombo('backend', 'fastify', { LINTER: 'eslint', BACKEND_FRAMEWORK: 'fastify', BACKEND_ZOD: '1', DOCKER: '0', SETUP_DATABASE: '0' }),
  verifyCombo('backend', 'express', { LINTER: 'eslint', BACKEND_FRAMEWORK: 'express', BACKEND_ZOD: '1', DOCKER: '0', SETUP_DATABASE: '0' }),
  verifyCombo('backend', 'elysia', { LINTER: 'eslint', BACKEND_FRAMEWORK: 'elysia', BACKEND_ZOD: '1', DOCKER: '0', SETUP_DATABASE: '0' }),
  verifyCombo('backend', 'pg-drizzle-redis', {
    LINTER: 'eslint',
    BACKEND_FRAMEWORK: 'hono',
    SETUP_DATABASE: '1',
    DB_ENGINE: 'postgresql',
    DB_ORM: 'drizzle',
    SETUP_REDIS: '1',
    DOCKER: '1',
  }),
  verifyCombo('backend', 'pg-prisma', {
    LINTER: 'eslint',
    BACKEND_FRAMEWORK: 'hono',
    SETUP_DATABASE: '1',
    DB_ENGINE: 'postgresql',
    DB_ORM: 'prisma',
    SETUP_REDIS: '0',
    DOCKER: '1',
  }),
  verifyCombo('backend', 'sqlite-none', {
    LINTER: 'eslint',
    BACKEND_FRAMEWORK: 'hono',
    SETUP_DATABASE: '1',
    DB_ENGINE: 'sqlite',
    DB_ORM: 'none',
    SETUP_REDIS: '0',
    DOCKER: '0',
  }),
  verifyCombo('backend', 'mongo-mongoose', {
    LINTER: 'eslint',
    BACKEND_FRAMEWORK: 'hono',
    SETUP_DATABASE: '1',
    DB_ENGINE: 'mongodb',
    DB_ORM: 'mongoose',
    SETUP_REDIS: '0',
    DOCKER: '1',
  }),
  verifyCombo('electron', 'oxlint', { LINTER: 'oxlint', VITEST_PRESET: 'none' }),
  verifyCombo('electron', 'eslint', { LINTER: 'eslint', VITEST_PRESET: 'none' }),
  verifyCombo('electron', 'vitest', { LINTER: 'oxlint', VITEST_PRESET: 'native' }),
  verifyCombo('electron', 'coverage', { LINTER: 'oxlint', VITEST_PRESET: 'coverage' }),
];
