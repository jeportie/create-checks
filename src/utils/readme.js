import fs from 'fs-extra';
import { execa } from 'execa';
import path from 'node:path';
import pc from 'picocolors';

import { prompt } from './prompt.js';

function codeBlock(language, content) {
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

const backendFrameworkMeta = {
  hono: {
    label: 'Hono',
    docs: 'https://hono.dev/',
    runtime: 'Node.js',
    devWatch: 'tsx watch',
    routeExample: "app.get('/users', (c) => c.json([{ id: '1', name: 'Alice' }]));",
    middlewareExample:
      "app.use('*', async (c, next) => {\n  console.log(`${c.req.method} ${c.req.url}`);\n  await next();\n});",
    testExample:
      "import { describe, expect, it } from 'vitest';\nimport app from '../../src/index.js';\n\ndescribe('GET /health', () => {\n  it('returns ok status', async () => {\n    const res = await app.request('/health');\n    expect(res.status).toBe(200);\n    expect(await res.json()).toEqual({ status: 'ok' });\n  });\n});",
  },
  fastify: {
    label: 'Fastify',
    docs: 'https://fastify.dev/',
    runtime: 'Node.js',
    devWatch: 'tsx watch',
    routeExample: "app.get('/users', async () => [{ id: '1', name: 'Alice' }]);",
    middlewareExample:
      "app.addHook('onRequest', async (request) => {\n  console.log(`${request.method} ${request.url}`);\n});",
    testExample:
      "import { describe, expect, it } from 'vitest';\nimport app from '../../src/index.js';\n\ndescribe('GET /health', () => {\n  it('returns ok status', async () => {\n    const res = await app.inject({ method: 'GET', url: '/health' });\n    expect(res.statusCode).toBe(200);\n    expect(res.json()).toEqual({ status: 'ok' });\n  });\n});",
  },
  express: {
    label: 'Express',
    docs: 'https://expressjs.com/',
    runtime: 'Node.js',
    devWatch: 'tsx watch',
    routeExample: "app.get('/users', (_req, res) => res.json([{ id: '1', name: 'Alice' }]));",
    middlewareExample: 'app.use((req, _res, next) => {\n  console.log(`${req.method} ${req.url}`);\n  next();\n});',
    testExample:
      "import request from 'supertest';\nimport { describe, expect, it } from 'vitest';\n\nimport app from '../../src/index.js';\n\ndescribe('GET /health', () => {\n  it('returns ok status', async () => {\n    const res = await request(app).get('/health');\n    expect(res.status).toBe(200);\n    expect(res.body).toEqual({ status: 'ok' });\n  });\n});",
  },
  elysia: {
    label: 'Elysia',
    docs: 'https://elysiajs.com/',
    runtime: 'Bun',
    devWatch: 'bun --watch',
    routeExample: "app.get('/users', () => [{ id: '1', name: 'Alice' }]);",
    middlewareExample:
      'app.onBeforeHandle(({ request }) => {\n  console.log(`${request.method} ${new URL(request.url).pathname}`);\n});',
    testExample:
      "import { describe, expect, it } from 'vitest';\nimport app from '../../src/index.js';\n\ndescribe('GET /health', () => {\n  it('returns ok status', async () => {\n    const res = await app.handle(new Request('http://localhost/health'));\n    expect(res.status).toBe(200);\n    expect(await res.json()).toEqual({ status: 'ok' });\n  });\n});",
  },
};

const backendDatabaseEngineMeta = {
  postgresql: {
    label: 'PostgreSQL',
    dockerImage: 'postgres:16-alpine',
    dockerPort: '5432',
    defaultUrl: 'postgresql://postgres:postgres@localhost:5432/app',
    credentials: [
      ['POSTGRES_USER', 'postgres'],
      ['POSTGRES_PASSWORD', 'postgres'],
      ['POSTGRES_DB', 'app'],
    ],
  },
  mysql: {
    label: 'MySQL',
    dockerImage: 'mysql:8',
    dockerPort: '3306',
    defaultUrl: 'mysql://root:root@localhost:3306/app',
    credentials: [
      ['MYSQL_ROOT_PASSWORD', 'root'],
      ['MYSQL_DATABASE', 'app'],
    ],
  },
  mariadb: {
    label: 'MariaDB',
    dockerImage: 'mariadb:11',
    dockerPort: '3306',
    defaultUrl: 'mysql://root:root@localhost:3306/app',
    credentials: [
      ['MARIADB_ROOT_PASSWORD', 'root'],
      ['MARIADB_DATABASE', 'app'],
    ],
  },
  sqlite: {
    label: 'SQLite',
    dockerImage: null,
    dockerPort: null,
    defaultUrl: 'file:./dev.db',
    credentials: [],
  },
  mongodb: {
    label: 'MongoDB',
    dockerImage: 'mongo:7',
    dockerPort: '27017',
    defaultUrl: 'mongodb://localhost:27017/app',
    credentials: [],
  },
};

const backendOrmMeta = {
  none: {
    label: 'Raw SQL',
    snapshotLabel: 'Raw driver + SQL migrations',
    dbCommands: [['`npm run db:migrate`', 'Apply SQL migrations from `src/db/migrations/`']],
  },
  drizzle: {
    label: 'Drizzle',
    snapshotLabel: '[Drizzle ORM](https://orm.drizzle.team/)',
    dbCommands: [
      ['`npm run db:generate`', 'Generate migration SQL from schema changes'],
      ['`npm run db:migrate`', 'Apply pending migrations'],
      ['`npm run db:studio`', 'Open Drizzle Studio'],
    ],
  },
  prisma: {
    label: 'Prisma',
    snapshotLabel: '[Prisma](https://www.prisma.io/)',
    dbCommands: [
      ['`npm run db:generate`', 'Generate Prisma client'],
      ['`npm run db:migrate`', 'Run Prisma migrations'],
      ['`npm run db:studio`', 'Open Prisma Studio'],
    ],
  },
  mongoose: {
    label: 'Mongoose',
    snapshotLabel: '[Mongoose](https://mongoosejs.com/)',
    dbCommands: [],
  },
};

function parseEnvExample(content) {
  if (!content) return {};

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'))
    .reduce((acc, line) => {
      const [key, ...rest] = line.split('=');
      if (!key) return acc;
      acc[key] = rest.join('=');
      return acc;
    }, {});
}

function quoteDefaultValue(value) {
  if (value === undefined || value === null || value === '') {
    return '(empty)';
  }
  return `\`${value}\``;
}

function getBackendFrameworkInfo(framework) {
  return backendFrameworkMeta[framework] ?? backendFrameworkMeta.hono;
}

function getBackendEngineInfo(engine) {
  return backendDatabaseEngineMeta[engine] ?? backendDatabaseEngineMeta.postgresql;
}

function getBackendOrmInfo(orm) {
  return backendOrmMeta[orm] ?? backendOrmMeta.none;
}

function getDatabaseShellDescription(engine) {
  if (engine === 'postgresql') return 'Open a `psql` shell';
  if (engine === 'mysql' || engine === 'mariadb') return 'Open a `mysql` shell';
  if (engine === 'sqlite') return 'Open a `sqlite3` shell';
  return 'Open a `mongosh` shell';
}

function getDatabaseWorkflowCommand(engine, orm) {
  if (orm === 'drizzle') return 'npm run db:generate && npm run db:migrate';
  if (orm === 'prisma') return 'npm run db:generate && npm run db:migrate';
  if (orm === 'none') return 'npm run db:migrate';
  if (orm === 'mongoose') return 'npm run dev';
  if (engine === 'mongodb') return 'npm run dev';
  return 'npm run db:migrate';
}

function getTestingStackLabel(answers) {
  if (answers.vitestPreset === 'native' || answers.vitestPreset === 'coverage') {
    return 'Vitest';
  }
  return 'No test framework configured';
}

function getQualityStackLabel(answers) {
  const tools = ['TypeScript (strict)'];
  if (answers.linter === 'biome') {
    tools.push('Biome');
  } else {
    tools.push('ESLint', 'Prettier');
  }

  if (answers.lintOption?.includes('cspell')) tools.push('CSpell');
  if (answers.lintOption?.includes('secretlint')) tools.push('Secretlint');
  if (answers.lintOption?.includes('commitlint')) tools.push('Commitlint');

  return tools.join(', ');
}

function joinHumanList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function getBackendIntro(answers, framework, engineInfo) {
  const stackBits = [`powered by ${framework.label}`];

  if (answers.setupDatabase) {
    let dbLabel = engineInfo.label;
    if (answers.databaseOrm === 'drizzle') dbLabel += ' (via Drizzle ORM)';
    if (answers.databaseOrm === 'prisma') dbLabel += ' (via Prisma)';
    if (answers.databaseOrm === 'mongoose') dbLabel += ' (via Mongoose)';
    if (answers.databaseOrm === 'none') dbLabel += ' (via raw SQL driver)';
    stackBits.push(`backed by ${dbLabel}`);
  }

  if (answers.setupRedis) {
    stackBits.push('Redis (via ioredis)');
  }

  if (answers.integrationPreset === 'better-auth') {
    stackBits.push('Better Auth wiring for authentication');
  }

  const intro = `A TypeScript API server ${joinHumanList(stackBits)}.`;

  const infraBits = [`The project runs on ${framework.runtime}`];
  if (answers.setupDocker) infraBits.push('is containerized with Docker Compose');
  infraBits.push('comes pre-configured with quality gates');
  if (answers.setupPrecommit) infraBits.push('pre-commit hooks');
  if (answers.setupCicd) infraBits.push('CI/CD workflows');

  return `${intro} ${joinHumanList(infraBits)}.`;
}

function renderBackendProjectSnapshot(answers, framework, engineInfo, ormInfo) {
  const rows = ['| Item | Value |', '| --- | --- |', '| Project type | Backend API |'];

  rows.push(`| Framework | [${framework.label}](${framework.docs}) |`);

  if (answers.setupDatabase) {
    const ormLabel = answers.databaseOrm === 'none' ? 'Raw SQL' : ormInfo.snapshotLabel;
    rows.push(`| Database | ${engineInfo.label} + ${ormLabel} |`);
  }

  if (answers.setupRedis) {
    rows.push('| Cache | Redis + [ioredis](https://github.com/redis/ioredis) |');
  }

  if (answers.integrationPreset === 'better-auth') {
    rows.push('| Authentication | [Better Auth](https://www.better-auth.com/) |');
  }

  rows.push(`| Testing | ${getTestingStackLabel(answers)} |`);
  rows.push(`| Quality | ${getQualityStackLabel(answers)} |`);

  if (answers.setupDocker) {
    rows.push('| Containerization | Docker + Docker Compose |');
  }

  if (answers.setupCicd) {
    rows.push('| CI/CD | GitHub Actions |');
  }

  return rows.join('\n');
}

function renderBackendPrerequisites(answers, framework) {
  const lines = [];

  if (framework.runtime === 'Bun') {
    lines.push('- [Bun](https://bun.sh/) v1+ (see `.mise.toml` for pinned version)');
  } else {
    lines.push('- [Node.js](https://nodejs.org/) v22+ (see `.mise.toml` for pinned version)');
  }

  lines.push('- [mise](https://mise.jdx.dev/) (recommended for tool version management)');

  if (answers.setupDocker) {
    lines.push('- [Docker](https://www.docker.com/) and Docker Compose');
  }

  return lines.join('\n');
}

function renderBackendGettingStarted(answers, engineInfo) {
  const lines = [];
  const workflowCommand = getDatabaseWorkflowCommand(answers.databaseEngine, answers.databaseOrm);

  lines.push('### 1. Clone and install\n');
  lines.push(codeBlock('bash', 'mise install\nnpm install'));

  lines.push('\n### 2. Set up environment variables\n');
  lines.push(codeBlock('bash', 'cp .env.example .env'));
  lines.push('The defaults are ready for local development.');

  if (answers.setupDocker) {
    lines.push('\n### 3. Start the full stack with Docker\n');
    lines.push(codeBlock('bash', 'npm run docker:up'));
    lines.push('This builds the app image and starts all configured services.');

    if (answers.setupDatabase && engineInfo.dockerImage) {
      const localDevCommands = ['npm run docker:db:up'];
      if (answers.databaseOrm !== 'mongoose') {
        localDevCommands.push(workflowCommand);
      }
      localDevCommands.push('npm run dev');

      lines.push('\n### 4. Or: local app runtime + Docker services\n');
      lines.push(codeBlock('bash', localDevCommands.join('\n')));
    }
  } else {
    const localOnly = [];
    if (answers.setupDatabase && answers.databaseOrm !== 'mongoose') {
      localOnly.push(workflowCommand);
    }
    localOnly.push('npm run dev');

    lines.push('\n### 3. Start in development mode\n');
    lines.push(codeBlock('bash', localOnly.join('\n')));
  }

  lines.push('\n### 5. Verify\n');
  lines.push(codeBlock('bash', 'curl http://localhost:3000/health\ncurl http://localhost:3000/'));

  return lines.join('\n\n');
}

function renderBackendDockerSection(answers, engineInfo) {
  if (!answers.setupDocker) return '';

  const serviceRows = [
    '| Service | Image | Port | Purpose |',
    '| --- | --- | --- | --- |',
    '| `app` | Built from `./Dockerfile` | 3000 | API server |',
  ];

  if (answers.setupDatabase && engineInfo.dockerImage) {
    serviceRows.push(
      `| \`db\` | \`${engineInfo.dockerImage}\` | ${engineInfo.dockerPort} | ${engineInfo.label} database |`,
    );
  }

  if (answers.setupRedis) {
    serviceRows.push('| `redis` | `redis:7-alpine` | 6379 | Redis cache |');
  }

  const commandRows = [
    '| Command | Description |',
    '| --- | --- |',
    '| `npm run docker:up` | Build and start all services |',
    '| `npm run docker:down` | Stop all services |',
    '| `npm run docker:logs` | Tail service logs |',
    '| `npm run docker:build` | Build images without starting |',
  ];

  if (answers.setupDatabase && engineInfo.dockerImage) {
    commandRows.push('| `npm run docker:db:up` | Start database service only |');
    commandRows.push('| `npm run docker:db:down` | Stop database service |');
    commandRows.push('| `npm run docker:db:logs` | Tail database logs |');
    commandRows.push('| `npm run docker:db:shell` | Open database shell |');
    commandRows.push('| `npm run docker:db:migrate` | Run migration command |');
  }

  const lines = [];
  lines.push('The project uses Docker Compose to orchestrate services:\n');
  lines.push(serviceRows.join('\n'));
  lines.push('\n### Docker commands\n');
  lines.push(commandRows.join('\n'));
  lines.push('\n### Dockerfile\n');
  lines.push(
    [
      'The Dockerfile uses a multi-stage build:',
      '',
      '1. **base** — `node:22-slim` and `/app` workdir',
      '2. **deps** — install production dependencies only (`npm ci --omit=dev`)',
      '3. **build** — install full dependencies and compile TypeScript',
      '4. **runtime** — copy production dependencies + `dist/`, expose port `3000`',
    ].join('\n'),
  );

  if (answers.setupDatabase && engineInfo.credentials.length > 0) {
    const credentialRows = ['\n### Default database credentials', '', '| Variable | Default |', '| --- | --- |'];
    for (const [key, value] of engineInfo.credentials) {
      credentialRows.push(`| \`${key}\` | \`${value}\` |`);
    }
    credentialRows.push(`| Connection string | \`${engineInfo.defaultUrl}\` |`);
    lines.push(credentialRows.join('\n'));
  }

  return lines.join('\n\n');
}

function renderBackendDatabaseSection(answers, engineInfo, ormInfo) {
  if (!answers.setupDatabase) return '';

  const headingOrmLabel = answers.databaseOrm === 'none' ? 'Raw SQL' : ormInfo.label;
  const lines = [];

  lines.push(`## Database (${engineInfo.label} + ${headingOrmLabel})`);
  lines.push('\n### Configuration\n');
  lines.push(
    `Database configuration is centralized in \`src/db/config.ts\` via \`getDatabaseUrl()\`${
      answers.databaseEngine === 'sqlite' ? ' and `getSqliteFilePath()`.' : '.'
    }`,
  );

  if (answers.databaseOrm === 'drizzle' && answers.databaseEngine === 'postgresql') {
    lines.push('\n### Schema\n');
    lines.push(
      codeBlock(
        'ts',
        "import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';\n\nexport const users = pgTable('users', {\n  id: serial('id').primaryKey(),\n  email: text('email').notNull().unique(),\n  createdAt: timestamp('created_at').defaultNow().notNull(),\n});",
      ),
    );
    lines.push('The schema lives in `src/db/schema.ts` and the client is exported from `src/db/index.ts`.');
  } else if (answers.databaseOrm === 'drizzle') {
    lines.push('\n### Schema\n');
    lines.push('Drizzle schema definitions are in `src/db/schema.ts` and database access is in `src/db/index.ts`.');
  } else if (answers.databaseOrm === 'prisma') {
    lines.push('\n### Schema\n');
    lines.push(
      'Prisma schema is generated in `prisma/schema.prisma` and the client is exported from `src/db/index.ts`.',
    );
  } else if (answers.databaseOrm === 'mongoose') {
    lines.push('\n### Models\n');
    lines.push('Mongoose models are created in `src/db/models/` and connection wiring is in `src/db/index.ts`.');
  } else {
    lines.push('\n### Migrations\n');
    lines.push('Raw SQL migrations live in `src/db/migrations/` and are applied by `src/db/migrate.ts`.');
  }

  lines.push('\n### Commands\n');
  const commandRows = ['| Command | Description |', '| --- | --- |'];
  for (const [command, description] of ormInfo.dbCommands) {
    commandRows.push(`| ${command} | ${description} |`);
  }
  commandRows.push(`| \`npm run db:shell\` | ${getDatabaseShellDescription(answers.databaseEngine)} |`);
  lines.push(commandRows.join('\n'));

  if (answers.databaseOrm !== 'mongoose') {
    lines.push('\n### Typical workflow\n');
    if (answers.databaseOrm === 'drizzle') {
      lines.push(
        codeBlock(
          'bash',
          '# 1. Edit schema in src/db/schema.ts\nnpm run db:generate\nnpm run db:migrate\nnpm run db:studio',
        ),
      );
    } else if (answers.databaseOrm === 'prisma') {
      lines.push(codeBlock('bash', 'npm run db:generate\nnpm run db:migrate\nnpm run db:studio'));
    } else {
      lines.push(codeBlock('bash', 'npm run db:migrate'));
    }
  }

  return lines.join('\n');
}

function renderBackendRedisSection(answers) {
  if (!answers.setupRedis) return '';

  return [
    '## Redis',
    '',
    'The Redis client is created in `src/redis/index.ts` using `REDIS_URL` (defaults to `redis://localhost:6379`).',
    '',
    codeBlock(
      'ts',
      "import { redis, checkRedisConnection } from './src/redis/index.js';\n\nawait checkRedisConnection();\nawait redis.set('key', 'value');\nconst value = await redis.get('key');",
    ),
  ].join('\n');
}

function renderBackendAuthSection(answers) {
  if (answers.integrationPreset !== 'better-auth') return '';

  return [
    '## Authentication (Better Auth)',
    '',
    'Starter wiring is generated in `src/integrations/better-auth.ts`:',
    '',
    codeBlock(
      'ts',
      "import { getBetterAuthConfig } from './integrations/better-auth.js';\n\nconst config = getBetterAuthConfig();\n// => { baseUrl: 'http://localhost:3000', secret: '' }",
    ),
    '',
    '| Variable | Purpose | Default |',
    '| --- | --- | --- |',
    '| `BETTER_AUTH_URL` | Base URL for auth callbacks | `http://localhost:3000` |',
    '| `BETTER_AUTH_SECRET` | Signing secret for tokens/sessions | (empty) |',
    '',
    'Generate a strong local secret with:',
    '',
    codeBlock('bash', 'openssl rand -base64 32'),
    '',
    'See the [Better Auth documentation](https://www.better-auth.com/docs) for complete integration guides.',
  ].join('\n');
}

function collectBackendEnvRows(answers, envMap, engineInfo) {
  const rows = [];

  if (answers.setupDatabase) {
    rows.push({
      variable: 'DATABASE_URL',
      purpose: `${engineInfo.label} connection string`,
      defaultValue: envMap.DATABASE_URL ?? engineInfo.defaultUrl,
    });
  }

  if (answers.setupRedis) {
    rows.push({
      variable: 'REDIS_URL',
      purpose: 'Redis connection string',
      defaultValue: envMap.REDIS_URL ?? 'redis://localhost:6379',
    });
  }

  if (answers.integrationPreset === 'better-auth') {
    rows.push({
      variable: 'BETTER_AUTH_URL',
      purpose: 'Better Auth base URL',
      defaultValue: envMap.BETTER_AUTH_URL ?? 'http://localhost:3000',
    });
    rows.push({
      variable: 'BETTER_AUTH_SECRET',
      purpose: 'Better Auth signing secret',
      defaultValue: envMap.BETTER_AUTH_SECRET ?? '',
    });
  }

  rows.push({
    variable: 'NODE_ENV',
    purpose: 'Runtime environment',
    defaultValue: envMap.NODE_ENV ?? 'development',
  });
  rows.push({
    variable: 'PORT',
    purpose: 'Server listen port',
    defaultValue: envMap.PORT ?? '3000',
  });

  return rows;
}

function renderBackendEnvSection(answers, engineInfo) {
  const envMap = parseEnvExample(answers._envExample ?? '');
  const rows = collectBackendEnvRows(answers, envMap, engineInfo);
  const table = ['| Variable | Purpose | Default |', '| --- | --- | --- |'];

  for (const row of rows) {
    table.push(`| \`${row.variable}\` | ${row.purpose} | ${quoteDefaultValue(row.defaultValue)} |`);
  }

  const validationSummary =
    answers.setupZod !== false
      ? 'Environment variables are validated at startup via Zod in `src/env.ts`.'
      : 'Environment variables are read from `process.env` in `src/env.ts`.';

  return [
    '## Environment Variables',
    '',
    'Copy `.env.example` to `.env` and adjust values as needed.',
    '',
    ...table,
    '',
    validationSummary,
  ].join('\n');
}

function renderBackendDevelopmentSection(answers, framework) {
  return [
    '## Development',
    '',
    codeBlock('bash', 'npm run dev'),
    '',
    `Starts the server with ${framework.devWatch}.`,
    '',
    '### Adding a route',
    '',
    codeBlock('ts', framework.routeExample),
    '',
    '### Adding middleware',
    '',
    codeBlock('ts', framework.middlewareExample),
    '',
    '### Adding an environment variable',
    '',
    answers.setupZod !== false
      ? '1. Add it to the Zod schema in `src/env.ts`\n2. Add it to `.env.example`\n3. Import `env` where needed'
      : '1. Add it in `src/env.ts`\n2. Add it to `.env.example`\n3. Read from `process.env` where needed',
    '',
    '### Testing endpoints with curl',
    '',
    codeBlock(
      'bash',
      'curl -s http://localhost:3000/health | jq\ncurl -s -X POST http://localhost:3000/users -H \'Content-Type: application/json\' -d \'{"name": "Bob"}\'',
    ),
  ].join('\n');
}

function renderBackendTestingSection(answers, framework) {
  if (answers.vitestPreset !== 'native' && answers.vitestPreset !== 'coverage') {
    return ['## Testing', '', 'No test framework configured.'].join('\n');
  }

  const commands = ['npm test', 'npm run test:unit', 'npm run test:integration'];
  if (answers.vitestPreset === 'coverage') {
    commands.push('npm run test:coverage');
  }

  return [
    '## Testing',
    '',
    codeBlock('bash', commands.join('\n')),
    '',
    'Example test pattern:',
    '',
    codeBlock('ts', framework.testExample),
  ].join('\n');
}

function renderBackendQualitySection(answers) {
  const checks = [
    answers.linter === 'biome' ? 'biome format --write .' : 'prettier . --write',
    answers.linter === 'biome' ? 'biome check .' : 'eslint .',
    'tsc --noEmit',
  ];

  if (answers.lintOption?.includes('cspell')) checks.push('cspell lint .');
  if (answers.lintOption?.includes('secretlint')) checks.push('secretlint **/*');
  if (answers.vitestPreset === 'native' || answers.vitestPreset === 'coverage') checks.push('vitest --run');

  const lines = ['## Quality Checks', '', codeBlock('bash', 'npm run check'), '', '`npm run check` runs:'];
  checks.forEach((check, index) => {
    lines.push(`${index + 1}. \`${check}\``);
  });

  if (answers.setupPrecommit) {
    lines.push('', '### Pre-commit hooks', '');
    lines.push('- `pre-commit`: lint-staged + typecheck + tests');
    if (answers.lintOption?.includes('commitlint')) {
      lines.push('- `commit-msg`: commitlint validation for Conventional Commits');
    }
  }

  return lines.join('\n');
}

function renderBackendBuildDeploySection(answers) {
  const lines = ['## Build and Deploy', '', '### Build', '', codeBlock('bash', 'npm run build\nnpm start')];

  if (answers.setupCicd) {
    lines.push('', '### CI/CD', '');
    lines.push('| Workflow | Trigger | Steps |');
    lines.push('| --- | --- | --- |');
    lines.push('| `ci.yml` | Pull request | Install, run `npm run check` |');
  }

  return lines.join('\n');
}

function renderBackendProjectStructure(answers) {
  const lines = [
    '## Project Structure',
    '',
    '```',
    'src/',
    '  index.ts                # Server entry and routes',
    '  env.ts                  # Runtime configuration',
  ];

  if (answers.setupDatabase) {
    lines.push('  db/');
    lines.push('    index.ts              # Database client/connection');
    lines.push('    config.ts             # getDatabaseUrl() helpers');
    if (answers.databaseOrm === 'drizzle') {
      lines.push('    schema.ts             # Drizzle schema definitions');
    }
    if (answers.databaseOrm === 'none') {
      lines.push('    migrate.ts            # Raw SQL migration runner');
      lines.push('    migrations/           # SQL migration files');
    }
  }

  if (answers.setupRedis) {
    lines.push('  redis/');
    lines.push('    index.ts              # ioredis client and ping helper');
  }

  if (answers.integrationPreset === 'better-auth') {
    lines.push('  integrations/');
    lines.push('    better-auth.ts        # Better Auth config reader');
  }

  lines.push('tests/');
  lines.push('  unit/');
  lines.push('    server.unit.test.ts   # Framework route unit tests');

  if (answers.setupDatabase) {
    lines.push('    db-config.unit.test.ts # Database config starter test');
    lines.push('  integration/');
    lines.push('    db-connectivity.int.test.ts # Database connectivity starter test');
  }

  if (answers.setupCicd) {
    lines.push('.github/');
    lines.push('  workflows/');
    lines.push('    ci.yml                # Pull request quality gate');
  }

  if (answers.setupPrecommit) {
    lines.push('.husky/');
    lines.push('  pre-commit              # lint-staged + typecheck + tests');
    if (answers.lintOption?.includes('commitlint')) {
      lines.push('  commit-msg              # commitlint validation');
    }
  }

  if (answers.setupDocker) {
    lines.push('Dockerfile                # Multi-stage production image');
    lines.push('docker-compose.yml        # Local service orchestration');
  }

  if (answers.setupDatabase && answers.databaseOrm === 'drizzle') {
    lines.push('drizzle.config.ts         # Drizzle CLI config');
  }

  if (answers.vitestPreset) {
    lines.push('vitest.config.ts          # Vitest config');
  }

  if (answers.linter === 'biome') {
    lines.push('biome.json                # Biome config');
  } else {
    lines.push('eslint.config.js          # ESLint config');
    lines.push('prettier.config.js        # Prettier config');
  }

  lines.push('tsconfig.json             # TypeScript config');
  lines.push('```');

  if (answers.setupDatabase && answers.databaseOrm === 'prisma') {
    lines.push('', '`prisma/schema.prisma` contains Prisma schema definitions.');
  }

  return lines.join('\n');
}

function renderBackendScriptsReference(answers, engineInfo) {
  const rows = ['## Scripts Reference', '', '| Script | Description |', '| --- | --- |'];

  rows.push('| `npm run dev` | Start backend dev server with hot reload |');
  rows.push('| `npm run build` | Compile TypeScript output |');
  rows.push('| `npm start` | Run compiled build |');
  rows.push('| `npm run check` | Run full quality gate |');
  rows.push(`| \`npm run format\` | Format code with ${answers.linter === 'biome' ? 'Biome' : 'Prettier'} |`);
  rows.push(`| \`npm run lint\` | Lint with ${answers.linter === 'biome' ? 'Biome' : 'ESLint'} |`);
  rows.push('| `npm run typecheck` | Run TypeScript type checks |');

  if (answers.lintOption?.includes('cspell')) rows.push('| `npm run spellcheck` | Spell-check project files |');
  if (answers.lintOption?.includes('secretlint')) rows.push('| `npm run secretlint` | Scan for accidental secrets |');

  if (answers.vitestPreset === 'native' || answers.vitestPreset === 'coverage') {
    rows.push('| `npm test` | Run all tests |');
    rows.push('| `npm run test:unit` | Run unit tests only |');
    rows.push('| `npm run test:integration` | Run integration tests only |');
    if (answers.vitestPreset === 'coverage') {
      rows.push('| `npm run test:coverage` | Run tests with coverage |');
    }
  }

  if (answers.setupDatabase) {
    if (answers.databaseOrm === 'drizzle') {
      rows.push('| `npm run db:generate` | Generate Drizzle migrations |');
      rows.push('| `npm run db:migrate` | Apply Drizzle migrations |');
      rows.push('| `npm run db:studio` | Open Drizzle Studio |');
    } else if (answers.databaseOrm === 'prisma') {
      rows.push('| `npm run db:generate` | Generate Prisma client |');
      rows.push('| `npm run db:migrate` | Apply Prisma migrations |');
      rows.push('| `npm run db:studio` | Open Prisma Studio |');
    } else if (answers.databaseOrm === 'none') {
      rows.push('| `npm run db:migrate` | Apply SQL migrations |');
    }

    rows.push(`| \`npm run db:shell\` | ${getDatabaseShellDescription(answers.databaseEngine)} |`);
  }

  if (answers.setupDocker) {
    rows.push('| `npm run docker:up` | Build and start Docker services |');
    rows.push('| `npm run docker:down` | Stop Docker services |');
    rows.push('| `npm run docker:logs` | Tail Docker logs |');
    rows.push('| `npm run docker:build` | Build Docker images |');

    if (answers.setupDatabase && engineInfo.dockerImage) {
      rows.push('| `npm run docker:db:up` | Start database service only |');
      rows.push('| `npm run docker:db:down` | Stop database service |');
      rows.push('| `npm run docker:db:logs` | Tail database logs |');
      rows.push('| `npm run docker:db:shell` | Open database shell in container |');
      rows.push('| `npm run docker:db:migrate` | Run migration command in local context |');
    }
  }

  return rows.join('\n');
}

function renderBackendTools(answers, framework) {
  const tools = ['## Tools', ''];

  tools.push(`- **[${framework.label}](${framework.docs})** — backend web framework`);

  if (answers.setupDatabase) {
    const engine = getBackendEngineInfo(answers.databaseEngine).label;
    if (answers.databaseOrm === 'drizzle') {
      tools.push(`- **[Drizzle ORM](https://orm.drizzle.team/)** — type-safe ${engine} access`);
    } else if (answers.databaseOrm === 'prisma') {
      tools.push(`- **[Prisma](https://www.prisma.io/)** — ${engine} ORM and migrations`);
    } else if (answers.databaseOrm === 'mongoose') {
      tools.push('- **[Mongoose](https://mongoosejs.com/)** — MongoDB ODM');
    } else {
      tools.push(`- **${engine} driver** — direct SQL access`);
    }
  }

  if (answers.setupRedis) {
    tools.push('- **[ioredis](https://github.com/redis/ioredis)** — Redis client');
  }

  if (answers.integrationPreset === 'better-auth') {
    tools.push('- **[Better Auth](https://www.better-auth.com/)** — authentication framework');
  }

  if (answers.setupZod !== false) {
    tools.push('- **[Zod](https://zod.dev/)** — environment variable validation');
  }

  tools.push('- **[TypeScript](https://www.typescriptlang.org/)** — strict type checking');

  if (answers.linter === 'biome') {
    tools.push('- **[Biome](https://biomejs.dev/)** — linting and formatting');
  } else {
    tools.push('- **[ESLint](https://eslint.org/)** + **[Prettier](https://prettier.io/)** — linting and formatting');
  }

  if (answers.vitestPreset === 'native' || answers.vitestPreset === 'coverage') {
    tools.push('- **[Vitest](https://vitest.dev/)** — test runner');
  }

  if (answers.lintOption?.includes('cspell')) tools.push('- **[CSpell](https://cspell.org/)** — spell checking');
  if (answers.lintOption?.includes('secretlint')) {
    tools.push('- **[Secretlint](https://github.com/secretlint/secretlint)** — secret detection');
  }
  if (answers.lintOption?.includes('commitlint')) {
    tools.push('- **[Commitlint](https://commitlint.js.org/)** — conventional commit enforcement');
  }

  if (answers.setupPrecommit) {
    tools.push('- **[Husky](https://typicode.github.io/husky/)** — Git hooks');
  }

  if (answers.setupDocker) {
    tools.push('- **[Docker](https://www.docker.com/)** — containerized development');
  }

  tools.push('- **[mise](https://mise.jdx.dev/)** — tool version management');

  return tools.join('\n');
}

// ---------------------------------------------------------------------------
// Backend — Implementation Workflow + Tutorial
// ---------------------------------------------------------------------------

function renderBackendImplementationWorkflow(answers, framework) {
  const fwLabel = framework.label;

  return [
    '## Implementation Workflow',
    '',
    `1. **Start the dev server** — run \`npm run dev\`. The server starts with ${framework.devWatch} and reloads on every save. Test it with:`,
    '',
    codeBlock('bash', 'curl -s http://localhost:3000/health | jq'),
    '',
    `2. **Add a route** — create the handler directly in \`src/index.ts\` or split into a separate route file. Follow the ${fwLabel} pattern:`,
    '',
    codeBlock('ts', framework.routeExample),
    '',
    `3. **Write a failing test first** — create a test file in \`tests/unit/\` (e.g. \`users.unit.test.ts\`). Use the ${fwLabel} test pattern and assert the expected response, then run \`npm run test:unit\` to confirm the test fails.`,
    '',
    `4. **Implement until tests pass** — fill in the route handler until \`npm run test:unit\` goes green. Verify with curl in a second terminal — the dev server picks up saved changes immediately.`,
    '',
    '5. **Run the full quality gate before commit**:',
    '',
    codeBlock('bash', 'npm run check    # format, lint, typecheck, spellcheck, secretlint, tests'),
    '',
    'Commit using the conventional format enforced by commitlint:',
    '',
    codeBlock('bash', 'git commit -m "feat(api): add users endpoint"'),
  ].join('\n');
}

function renderBackendTutorial(answers, framework) {
  const sections = [];

  sections.push(`## Backend Tutorial

Three progressive tutorials that build on this project. Each one introduces a real pattern you will use when building APIs on top of this starter.`);

  // Tutorial 1: CRUD endpoint with TDD
  sections.push(getBackendTutorial1(answers, framework));

  // Tutorial 2: Middleware
  sections.push(getBackendTutorial2(answers, framework));

  // Tutorial 3: Environment validation
  sections.push(getBackendTutorial3(answers));

  return sections.join('\n\n---\n\n');
}

function getBackendTutorial1(answers, framework) {
  const routeExamples = {
    hono: {
      empty: `app.get('/users', (c) => {\n  return c.json([]); // start empty — tests will drive the implementation\n});`,
      full: `const users = [\n  { id: '1', name: 'Alice' },\n  { id: '2', name: 'Bob' },\n];\n\napp.get('/users', (c) => c.json(users));\n\napp.get('/users/:id', (c) => {\n  const user = users.find((u) => u.id === c.req.param('id'));\n  if (!user) return c.json({ error: 'Not found' }, 404);\n  return c.json(user);\n});`,
      test: `import { describe, expect, it } from 'vitest';\nimport app from '../../src/index.js';\n\ndescribe('GET /users', () => {\n  it('returns a list of users', async () => {\n    const res = await app.request('/users');\n    expect(res.status).toBe(200);\n    const body = await res.json();\n    expect(body).toEqual(expect.arrayContaining([\n      expect.objectContaining({ id: '1', name: 'Alice' }),\n    ]));\n  });\n});\n\ndescribe('GET /users/:id', () => {\n  it('returns a single user', async () => {\n    const res = await app.request('/users/1');\n    expect(res.status).toBe(200);\n    expect(await res.json()).toEqual({ id: '1', name: 'Alice' });\n  });\n\n  it('returns 404 for unknown user', async () => {\n    const res = await app.request('/users/999');\n    expect(res.status).toBe(404);\n  });\n});`,
    },
    fastify: {
      empty: `app.get('/users', async () => {\n  return []; // start empty — tests will drive the implementation\n});`,
      full: `const users = [\n  { id: '1', name: 'Alice' },\n  { id: '2', name: 'Bob' },\n];\n\napp.get('/users', async () => users);\n\napp.get('/users/:id', async (request, reply) => {\n  const user = users.find((u) => u.id === request.params.id);\n  if (!user) return reply.status(404).send({ error: 'Not found' });\n  return user;\n});`,
      test: `import { describe, expect, it } from 'vitest';\nimport app from '../../src/index.js';\n\ndescribe('GET /users', () => {\n  it('returns a list of users', async () => {\n    const res = await app.inject({ method: 'GET', url: '/users' });\n    expect(res.statusCode).toBe(200);\n    const body = res.json();\n    expect(body).toEqual(expect.arrayContaining([\n      expect.objectContaining({ id: '1', name: 'Alice' }),\n    ]));\n  });\n});\n\ndescribe('GET /users/:id', () => {\n  it('returns a single user', async () => {\n    const res = await app.inject({ method: 'GET', url: '/users/1' });\n    expect(res.statusCode).toBe(200);\n    expect(res.json()).toEqual({ id: '1', name: 'Alice' });\n  });\n\n  it('returns 404 for unknown user', async () => {\n    const res = await app.inject({ method: 'GET', url: '/users/999' });\n    expect(res.statusCode).toBe(404);\n  });\n});`,
    },
    express: {
      empty: `app.get('/users', (_req, res) => {\n  res.json([]); // start empty — tests will drive the implementation\n});`,
      full: `const users = [\n  { id: '1', name: 'Alice' },\n  { id: '2', name: 'Bob' },\n];\n\napp.get('/users', (_req, res) => res.json(users));\n\napp.get('/users/:id', (req, res) => {\n  const user = users.find((u) => u.id === req.params.id);\n  if (!user) return res.status(404).json({ error: 'Not found' });\n  return res.json(user);\n});`,
      test: `import request from 'supertest';\nimport { describe, expect, it } from 'vitest';\n\nimport app from '../../src/index.js';\n\ndescribe('GET /users', () => {\n  it('returns a list of users', async () => {\n    const res = await request(app).get('/users');\n    expect(res.status).toBe(200);\n    expect(res.body).toEqual(expect.arrayContaining([\n      expect.objectContaining({ id: '1', name: 'Alice' }),\n    ]));\n  });\n});\n\ndescribe('GET /users/:id', () => {\n  it('returns a single user', async () => {\n    const res = await request(app).get('/users/1');\n    expect(res.status).toBe(200);\n    expect(res.body).toEqual({ id: '1', name: 'Alice' });\n  });\n\n  it('returns 404 for unknown user', async () => {\n    const res = await request(app).get('/users/999');\n    expect(res.status).toBe(404);\n  });\n});`,
    },
    elysia: {
      empty: `app.get('/users', () => {\n  return []; // start empty — tests will drive the implementation\n});`,
      full: `const users = [\n  { id: '1', name: 'Alice' },\n  { id: '2', name: 'Bob' },\n];\n\napp.get('/users', () => users);\n\napp.get('/users/:id', ({ params, set }) => {\n  const user = users.find((u) => u.id === params.id);\n  if (!user) {\n    set.status = 404;\n    return { error: 'Not found' };\n  }\n  return user;\n});`,
      test: `import { describe, expect, it } from 'vitest';\nimport app from '../../src/index.js';\n\ndescribe('GET /users', () => {\n  it('returns a list of users', async () => {\n    const res = await app.handle(new Request('http://localhost/users'));\n    expect(res.status).toBe(200);\n    const body = await res.json();\n    expect(body).toEqual(expect.arrayContaining([\n      expect.objectContaining({ id: '1', name: 'Alice' }),\n    ]));\n  });\n});\n\ndescribe('GET /users/:id', () => {\n  it('returns a single user', async () => {\n    const res = await app.handle(new Request('http://localhost/users/1'));\n    expect(res.status).toBe(200);\n    expect(await res.json()).toEqual({ id: '1', name: 'Alice' });\n  });\n\n  it('returns 404 for unknown user', async () => {\n    const res = await app.handle(new Request('http://localhost/users/999'));\n    expect(res.status).toBe(404);\n  });\n});`,
    },
  };

  const fw = answers.backendFramework || 'hono';
  const ex = routeExamples[fw] || routeExamples.hono;

  return `### Tutorial 1: Build a users endpoint with TDD

A read-only \`/users\` endpoint that returns a list and supports lookup by ID. This tutorial walks through the full red-green-refactor cycle with ${framework.label}.

#### Step 1 — Start with an empty route

Add to \`src/index.ts\`:

${codeBlock('ts', ex.empty)}

#### Step 2 — Write failing tests

Create \`tests/unit/users.unit.test.ts\`:

${codeBlock('ts', ex.test)}

Run the tests — the list test passes (empty array) but the detail tests fail:

${codeBlock('bash', 'npm run test:unit')}

#### Step 3 — Implement until green

Update the routes in \`src/index.ts\`:

${codeBlock('ts', ex.full)}

Run again — all tests pass:

${codeBlock('bash', 'npm run test:unit')}

#### Step 4 — Verify with curl

${codeBlock('bash', 'curl -s http://localhost:3000/users | jq\ncurl -s http://localhost:3000/users/1 | jq\ncurl -s http://localhost:3000/users/999 | jq')}

**What you learned**: ${framework.label} route handlers with path parameters, HTTP status codes for not-found, the framework-specific test pattern for request/response assertions.`;
}

function getBackendTutorial2(answers, framework) {
  const middlewareExamples = {
    hono: {
      code: `import { createMiddleware } from 'hono/factory';\n\nexport const requestLogger = createMiddleware(async (c, next) => {\n  const start = Date.now();\n  await next();\n  const ms = Date.now() - start;\n  console.log(\`\${c.req.method} \${c.req.url} \${c.res.status} \${ms}ms\`);\n});`,
      wire: `import { requestLogger } from './middleware/logger.js';\n\napp.use('*', requestLogger);`,
      test: `import { Hono } from 'hono';\nimport { describe, expect, it, vi } from 'vitest';\n\nimport { requestLogger } from '../../src/middleware/logger.js';\n\ndescribe('requestLogger middleware', () => {\n  it('logs method, url, status, and duration', async () => {\n    const spy = vi.spyOn(console, 'log');\n    const app = new Hono();\n    app.use('*', requestLogger);\n    app.get('/test', (c) => c.text('ok'));\n\n    await app.request('/test');\n\n    expect(spy).toHaveBeenCalledWith(\n      expect.stringMatching(/GET.*\\/test.*200.*\\d+ms/),\n    );\n  });\n});`,
    },
    fastify: {
      code: `import type { FastifyInstance } from 'fastify';\n\nexport function requestLogger(app: FastifyInstance): void {\n  app.addHook('onResponse', async (request, reply) => {\n    const ms = reply.elapsedTime.toFixed(0);\n    console.log(\`\${request.method} \${request.url} \${reply.statusCode} \${ms}ms\`);\n  });\n}`,
      wire: `import { requestLogger } from './middleware/logger.js';\n\nrequestLogger(app);`,
      test: `import Fastify from 'fastify';\nimport { describe, expect, it, vi } from 'vitest';\n\nimport { requestLogger } from '../../src/middleware/logger.js';\n\ndescribe('requestLogger middleware', () => {\n  it('logs method, url, status, and duration', async () => {\n    const spy = vi.spyOn(console, 'log');\n    const app = Fastify();\n    requestLogger(app);\n    app.get('/test', async () => 'ok');\n\n    await app.inject({ method: 'GET', url: '/test' });\n\n    expect(spy).toHaveBeenCalledWith(\n      expect.stringMatching(/GET.*\\/test.*200.*\\d+ms/),\n    );\n  });\n});`,
    },
    express: {
      code: `import type { NextFunction, Request, Response } from 'express';\n\nexport function requestLogger(req: Request, res: Response, next: NextFunction): void {\n  const start = Date.now();\n  res.on('finish', () => {\n    const ms = Date.now() - start;\n    console.log(\`\${req.method} \${req.url} \${res.statusCode} \${ms}ms\`);\n  });\n  next();\n}`,
      wire: `import { requestLogger } from './middleware/logger.js';\n\napp.use(requestLogger);`,
      test: `import express from 'express';\nimport request from 'supertest';\nimport { describe, expect, it, vi } from 'vitest';\n\nimport { requestLogger } from '../../src/middleware/logger.js';\n\ndescribe('requestLogger middleware', () => {\n  it('logs method, url, status, and duration', async () => {\n    const spy = vi.spyOn(console, 'log');\n    const app = express();\n    app.use(requestLogger);\n    app.get('/test', (_req, res) => res.send('ok'));\n\n    await request(app).get('/test');\n\n    expect(spy).toHaveBeenCalledWith(\n      expect.stringMatching(/GET.*\\/test.*200.*\\d+ms/),\n    );\n  });\n});`,
    },
    elysia: {
      code: `import { Elysia } from 'elysia';\n\nexport const requestLogger = new Elysia({ name: 'requestLogger' })\n  .onAfterResponse(({ request, set }) => {\n    console.log(\`\${request.method} \${new URL(request.url).pathname} \${set.status || 200}\`);\n  });`,
      wire: `import { requestLogger } from './middleware/logger.js';\n\napp.use(requestLogger);`,
      test: `import { Elysia } from 'elysia';\nimport { describe, expect, it, vi } from 'vitest';\n\nimport { requestLogger } from '../../src/middleware/logger.js';\n\ndescribe('requestLogger middleware', () => {\n  it('logs method and url', async () => {\n    const spy = vi.spyOn(console, 'log');\n    const app = new Elysia()\n      .use(requestLogger)\n      .get('/test', () => 'ok');\n\n    await app.handle(new Request('http://localhost/test'));\n\n    expect(spy).toHaveBeenCalledWith(\n      expect.stringMatching(/GET.*\\/test/),\n    );\n  });\n});`,
    },
  };

  const fw = answers.backendFramework || 'hono';
  const ex = middlewareExamples[fw] || middlewareExamples.hono;

  return `### Tutorial 2: Add request logging middleware

A middleware that logs every request with method, URL, status code, and duration. This introduces the ${framework.label} middleware pattern and how to test it in isolation.

#### Step 1 — Create the middleware

Create \`src/middleware/logger.ts\`:

${codeBlock('ts', ex.code)}

#### Step 2 — Write a test

Create \`tests/unit/logger.unit.test.ts\`:

${codeBlock('ts', ex.test)}

#### Step 3 — Wire it into the app

In \`src/index.ts\`:

${codeBlock('ts', ex.wire)}

Start the server and hit any endpoint — you will see log lines like \`GET /health 200 3ms\`.

**What you learned**: ${framework.label} middleware pattern, testing middleware in isolation with a minimal app instance, \`expect.stringMatching\` for flexible log assertions.`;
}

function getBackendTutorial3(answers) {
  const zodExample = answers.setupZod !== false;

  if (zodExample) {
    return `### Tutorial 3: Add a validated environment variable

Add a new \`API_KEY\` variable with Zod validation. This ensures the server fails fast on startup if the variable is missing or invalid.

#### Step 1 — Add the variable to the Zod schema

Update \`src/env.ts\`:

${codeBlock(
  'ts',
  `import { z } from 'zod';\n\nconst schema = z.object({\n  PORT: z.coerce.number().default(3000),\n  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),\n  API_KEY: z.string().min(1, 'API_KEY is required'),\n});\n\nexport const env = schema.parse(process.env);`,
)}

#### Step 2 — Add it to .env.example

${codeBlock('bash', 'echo "API_KEY=your-api-key-here" >> .env.example')}

Copy to your local env:

${codeBlock('bash', 'echo "API_KEY=dev-key-123" >> .env')}

#### Step 3 — Write a test

Create \`tests/unit/env.unit.test.ts\`:

${codeBlock(
  'ts',
  `import { describe, expect, it } from 'vitest';\nimport { z } from 'zod';\n\nconst schema = z.object({\n  API_KEY: z.string().min(1, 'API_KEY is required'),\n});\n\ndescribe('env validation', () => {\n  it('accepts a valid API_KEY', () => {\n    const result = schema.safeParse({ API_KEY: 'abc123' });\n    expect(result.success).toBe(true);\n  });\n\n  it('rejects an empty API_KEY', () => {\n    const result = schema.safeParse({ API_KEY: '' });\n    expect(result.success).toBe(false);\n  });\n\n  it('rejects a missing API_KEY', () => {\n    const result = schema.safeParse({});\n    expect(result.success).toBe(false);\n  });\n});`,
)}

#### Step 4 — Use it in a route

${codeBlock(
  'ts',
  `import { env } from './env.js';\n\n// inside a route handler:\nconsole.log('API key loaded:', env.API_KEY.slice(0, 4) + '...');`,
)}

**What you learned**: Zod schema validation for environment variables, fail-fast startup on missing config, testing validation logic with \`safeParse\`, keeping secrets out of logs with \`slice\`.`;
  }

  return `### Tutorial 3: Add a validated environment variable

Add a new \`API_KEY\` variable with runtime validation. This ensures the server fails fast on startup if the variable is missing.

#### Step 1 — Add the variable to env.ts

Update \`src/env.ts\`:

${codeBlock(
  'ts',
  `function requireEnv(key: string): string {\n  const value = process.env[key];\n  if (!value) throw new Error(\`Missing required env var: \${key}\`);\n  return value;\n}\n\nexport const env = {\n  PORT: Number(process.env.PORT) || 3000,\n  API_KEY: requireEnv('API_KEY'),\n};`,
)}

#### Step 2 — Add it to .env.example

${codeBlock('bash', 'echo "API_KEY=your-api-key-here" >> .env.example')}

Copy to your local env:

${codeBlock('bash', 'echo "API_KEY=dev-key-123" >> .env')}

#### Step 3 — Write a test

Create \`tests/unit/env.unit.test.ts\`:

${codeBlock(
  'ts',
  `import { describe, expect, it } from 'vitest';\n\ndescribe('requireEnv', () => {\n  it('throws for missing variable', () => {\n    const original = process.env.API_KEY;\n    delete process.env.API_KEY;\n    expect(() => require('../../src/env.js')).toThrow('Missing required env var');\n    process.env.API_KEY = original;\n  });\n});`,
)}

**What you learned**: Runtime environment validation, fail-fast startup on missing config, testing env validation by manipulating \`process.env\`.`;
}

function generateBackendReadme(answers) {
  const pkg = answers._pkgName || 'my-project';
  const framework = getBackendFrameworkInfo(answers.backendFramework ?? 'hono');
  const engineInfo = getBackendEngineInfo(answers.databaseEngine ?? 'postgresql');
  const ormInfo = getBackendOrmInfo(answers.databaseOrm ?? 'none');

  const sections = [];
  sections.push(
    `# ${pkg}\n\n> A backend API scaffolded with [tskickstart](https://github.com/jeportie/tskickstart).\n\n${getBackendIntro(answers, framework, engineInfo)}`,
  );
  sections.push(`## Project Snapshot\n\n${renderBackendProjectSnapshot(answers, framework, engineInfo, ormInfo)}`);
  sections.push(`## Prerequisites\n\n${renderBackendPrerequisites(answers, framework)}`);
  sections.push(`## Getting Started\n\n${renderBackendGettingStarted(answers, engineInfo)}`);

  const dockerSection = renderBackendDockerSection(answers, engineInfo);
  if (dockerSection) sections.push(`## Docker\n\n${dockerSection}`);

  const databaseSection = renderBackendDatabaseSection(answers, engineInfo, ormInfo);
  if (databaseSection) sections.push(databaseSection);

  const redisSection = renderBackendRedisSection(answers);
  if (redisSection) sections.push(redisSection);

  const authSection = renderBackendAuthSection(answers);
  if (authSection) sections.push(authSection);

  sections.push(renderBackendEnvSection(answers, engineInfo));
  sections.push(renderBackendDevelopmentSection(answers, framework));
  sections.push(renderBackendImplementationWorkflow(answers, framework));
  sections.push(renderBackendTutorial(answers, framework));
  sections.push(renderBackendTestingSection(answers, framework));
  sections.push(renderBackendQualitySection(answers));
  sections.push(renderBackendBuildDeploySection(answers));
  sections.push(renderBackendProjectStructure(answers));
  sections.push(renderBackendScriptsReference(answers, engineInfo));
  sections.push(renderBackendTools(answers, framework));

  return sections.join('\n\n---\n\n') + '\n';
}

function getProjectTitle(answers) {
  const { projectType } = answers;
  const titles = {
    frontend: 'Frontend Application',
    backend: 'Backend API',
    cli: 'CLI Tool',
    'npm-lib': 'NPM Library',
    app: 'Mobile Application',
  };
  return titles[projectType] || 'Project';
}

function getPrimaryFramework(answers) {
  const { projectType, backendFramework, cliFramework } = answers;

  if (projectType === 'frontend') return 'React + Vite + Tailwind CSS';
  if (projectType === 'backend') {
    const fw = { hono: 'Hono', fastify: 'Fastify', express: 'Express', elysia: 'Elysia (Bun)' };
    return fw[backendFramework] || 'Hono';
  }
  if (projectType === 'cli') {
    const fw = { commander: 'Commander.js', inquirer: 'Inquirer.js', clack: '@clack/prompts' };
    return fw[cliFramework] || 'Commander.js';
  }
  if (projectType === 'npm-lib') return 'TypeScript library + tsup';
  if (projectType === 'app') return 'React Native + Expo';

  return 'TypeScript';
}

function getTestStack(answers) {
  const { projectType, vitestPreset, setupPlaywright, setupAppJest, setupAppDetox } = answers;
  const tests = [];

  if (projectType === 'app') {
    if (setupAppJest) tests.push('Jest');
    if (setupAppDetox) tests.push('Detox');
  } else {
    if (vitestPreset === 'native' || vitestPreset === 'coverage') tests.push('Vitest');
    if (setupPlaywright) tests.push('Playwright');
  }

  return tests.length > 0 ? tests.join(' + ') : 'No test framework configured';
}

function getQualityStack(answers) {
  const { lintOption = [] } = answers;
  const tools = answers.linter === 'biome' ? ['TypeScript', 'Biome'] : ['TypeScript', 'ESLint', 'Prettier'];
  if (lintOption.includes('cspell')) tools.push('CSpell');
  if (lintOption.includes('secretlint')) tools.push('Secretlint');
  if (lintOption.includes('commitlint')) tools.push('Commitlint');
  return tools.join(', ');
}

function hasCheckScriptTests(answers) {
  const { projectType, vitestPreset, setupAppJest } = answers;
  if (projectType === 'app') return Boolean(setupAppJest);
  return vitestPreset === 'native' || vitestPreset === 'coverage';
}

function getProjectSnapshot(answers) {
  const rows = [
    '| Item | Value |',
    '| --- | --- |',
    `| Project type | ${getProjectTitle(answers)} |`,
    `| Primary stack | ${getPrimaryFramework(answers)} |`,
    `| Testing stack | ${getTestStack(answers)} |`,
    `| Quality stack | ${getQualityStack(answers)} |`,
  ];

  if (answers.setupSemanticRelease) {
    rows.push('| Release automation | semantic-release |');
  }

  return rows.join('\n');
}

// ---------------------------------------------------------------------------
// 1. Mode-specific rich introduction
// ---------------------------------------------------------------------------

function getIntroduction(answers) {
  const { projectType, backendFramework, cliFramework, setupSemanticRelease } = answers;

  if (projectType === 'backend') {
    const fwNames = { hono: 'Hono', fastify: 'Fastify', express: 'Express', elysia: 'Elysia' };
    const fwName = fwNames[backendFramework] || 'Hono';
    const runtime = backendFramework === 'elysia' ? 'Bun' : 'Node.js';
    const watchTool = backendFramework === 'elysia' ? 'Bun' : 'tsx watch';
    return (
      `This is a TypeScript API server powered by ${fwName}. It comes pre-configured with a health endpoint, ` +
      `environment validation via Zod, and hot-reload development via ${watchTool}. ` +
      `The project runs on ${runtime} and is ready to serve requests out of the box ` +
      `\u2014 start the server and test endpoints with curl immediately. ` +
      `Route handlers, middleware, and configuration are organized for maintainability as the API grows.`
    );
  }

  if (projectType === 'frontend') {
    return (
      `This is a modern React single-page application built with Vite and Tailwind CSS v4. ` +
      `It uses a component-driven architecture with fast hot module replacement for instant feedback during development. ` +
      `The project includes a Welcome page to get you started, pre-configured testing with Vitest and Testing Library, ` +
      `and a quality toolchain that catches issues before they reach production.`
    );
  }

  if (projectType === 'cli') {
    const fwNames = { commander: 'Commander.js', inquirer: 'Inquirer.js', clack: '@clack/prompts' };
    const fwName = fwNames[cliFramework] || 'Commander.js';
    const releaseNote = setupSemanticRelease
      ? `Versioning and npm publishing are fully automated via semantic-release — just follow conventional commits and merge to \`main\`.`
      : `Add new commands, wire up options and arguments, then ship with a single \`npm publish\`.`;
    return (
      `This is a Node.js command-line tool built with ${fwName}. ` +
      `It includes a working example command, a build pipeline via tsup, and is ready for npm publishing. ` +
      `The entry point has a shebang line for direct execution after global install. ` +
      releaseNote
    );
  }

  if (projectType === 'npm-lib') {
    return (
      `This is a TypeScript library designed for publishing to npm. ` +
      `It produces dual CJS/ESM output via tsup with automatic declaration file generation. ` +
      `The package.json exports field is pre-configured for modern module resolution, ` +
      `so consumers get the right format whether they \`import\` or \`require\` your library.`
    );
  }

  if (projectType === 'app') {
    return (
      `This is a React Native mobile application built with Expo. ` +
      `It includes React Navigation v7 for screen management, a welcome screen to get you started immediately, ` +
      `and a quality toolchain that keeps your code clean as the app grows. ` +
      `Scan the QR code with Expo Go to see changes on a real device in seconds.`
    );
  }

  return 'A TypeScript project scaffolded with tskickstart.';
}

function getPrerequisites(answers) {
  const { projectType, backendFramework } = answers;
  const lines = [];

  if (projectType === 'backend' && backendFramework === 'elysia') {
    lines.push('- [Bun](https://bun.sh/) (see `.mise.toml` for pinned version)');
  } else {
    lines.push('- [Node.js](https://nodejs.org/) v22+ (see `.mise.toml` for pinned version)');
  }

  lines.push('- [mise](https://mise.jdx.dev/) (recommended for tool version management)');

  if (projectType === 'app') {
    lines.push('- [Expo CLI](https://docs.expo.dev/get-started/installation/)');
    lines.push('- iOS Simulator (macOS) or Android Emulator');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 2. Getting Started deep-dive
// ---------------------------------------------------------------------------

function getGettingStarted(answers) {
  const { projectType, backendFramework } = answers;
  const lines = [];

  lines.push('Install tool versions and dependencies:\n');
  lines.push(codeBlock('bash', 'mise install\nnpm install'));

  if (projectType === 'backend') {
    const port = '3000';
    lines.push(`\nStart the development server:\n`);
    lines.push(codeBlock('bash', 'npm run dev'));
    if (backendFramework === 'elysia') {
      lines.push(`\nThe Elysia server starts with Bun in watch mode. Test the health endpoint:\n`);
    } else {
      lines.push(`\nThe server starts with hot-reload via tsx watch. Test the health endpoint:\n`);
    }
    lines.push(codeBlock('bash', `curl http://localhost:${port}/health`));
    lines.push(`\nYou should see a JSON response confirming the server is running.`);
  }

  if (projectType === 'frontend') {
    lines.push(`\nStart the development server:\n`);
    lines.push(codeBlock('bash', 'npm run dev'));
    lines.push(
      `\nOpen http://localhost:5173 in your browser. You will see the Welcome page with hot module replacement \u2014 edits to components appear instantly without a full page reload.`,
    );
  }

  if (projectType === 'cli') {
    lines.push(`\nRun the example command to verify the setup:\n`);
    lines.push(codeBlock('bash', 'npm run dev -- hello World'));
    lines.push(`\nThe \`--\` passes arguments through to the CLI. You should see a greeting printed to the terminal.`);
  }

  if (projectType === 'npm-lib') {
    lines.push(`\nBuild the library to verify the setup:\n`);
    lines.push(codeBlock('bash', 'npm run build'));
    lines.push(`\nThis produces CJS and ESM bundles in \`dist/\` with TypeScript declaration files.`);
  }

  if (projectType === 'app') {
    lines.push(`\nStart the Expo development server:\n`);
    lines.push(codeBlock('bash', 'npm start'));
    lines.push(
      `\nScan the QR code with Expo Go on your phone, or press \`i\` to open the iOS simulator / \`a\` for the Android emulator. You will see the Welcome screen.`,
    );
  }

  lines.push(`\nVerify everything works with the full quality gate:\n`);
  lines.push(codeBlock('bash', 'npm run check'));

  return lines.join('\n');
}

function getDevelopment(answers) {
  const { projectType, backendFramework } = answers;

  if (projectType === 'frontend') {
    return '```bash\nnpm run dev\n```\n\nOpens the Vite dev server with hot module replacement.';
  }
  if (projectType === 'backend') {
    if (backendFramework === 'elysia') {
      return '```bash\nnpm run dev\n```\n\nStarts the Elysia server with Bun in watch mode.';
    }
    return '```bash\nnpm run dev\n```\n\nStarts the server with `tsx watch` for hot reload.';
  }
  if (projectType === 'cli') {
    return '```bash\nnpm run dev\n```\n\nRuns the CLI directly with `tsx` (no build step needed).';
  }
  if (projectType === 'app') {
    return '```bash\nnpm start\n```\n\nStarts the Expo development server. Scan the QR code with Expo Go or press `i` for iOS / `a` for Android.';
  }
  return '```bash\nnpm run dev\n```';
}

function getBuild(answers) {
  const { projectType } = answers;

  if (projectType === 'frontend') {
    return '```bash\nnpm run build\n```\n\nType-checks and builds for production with Vite. Output in `dist/`.';
  }
  if (projectType === 'backend') {
    return '```bash\nnpm run build\n```\n\nCompiles TypeScript to `dist/`. Run with `npm start`.';
  }
  if (projectType === 'cli' || projectType === 'npm-lib') {
    return '```bash\nnpm run build\n```\n\nBundles with tsup. Output in `dist/`.';
  }
  if (projectType === 'app') {
    return '```bash\nnpx expo run:ios\nnpx expo run:android\n```\n\nBuilds and runs the native app locally.';
  }
  return '';
}

function getTesting(answers) {
  const { projectType, vitestPreset, setupPlaywright, setupAppJest, setupAppDetox } = answers;
  const lines = [];

  if (projectType === 'app') {
    if (setupAppJest) {
      lines.push('```bash\nnpm test\n```\n\nRuns unit tests with Jest + React Native Testing Library.');
    }
    if (setupAppDetox) {
      lines.push(
        '```bash\nnpm run test:e2e:build   # Build the app for testing\nnpm run test:e2e         # Run Detox E2E tests\n```',
      );
    }
    return lines.join('\n\n') || 'No test framework configured.';
  }

  if (vitestPreset === 'native' || vitestPreset === 'coverage') {
    lines.push('```bash\nnpm test              # Run all tests\nnpm run test:unit     # Unit tests only\n```');
    if (vitestPreset === 'coverage') {
      lines.push('```bash\nnpm run test:coverage  # With coverage report\n```');
    }
  }

  if (setupPlaywright) {
    lines.push(
      '```bash\nnpm run test:e2e       # Run Playwright E2E tests\nnpm run test:e2e:ui    # Interactive UI mode\n```',
    );
  }

  return lines.join('\n\n') || 'No test framework configured.';
}

// ---------------------------------------------------------------------------
// 3. Deep project structure
// ---------------------------------------------------------------------------

function getProjectStructure(answers) {
  const { projectType, setupDocker, setupZod } = answers;

  if (projectType === 'frontend') {
    return `\`\`\`
src/
  main.tsx         # React entry point \u2014 renders App into #root with StrictMode
  App.tsx          # Router setup \u2014 defines routes using React Router
  Welcome.tsx      # Welcome page component \u2014 the landing page you see on first run
                   # Replace this with your own pages. Add new routes in App.tsx
  index.css        # Tailwind CSS v4 entry \u2014 @import "tailwindcss" is all you need
tests/
  unit/            # Component unit tests with @testing-library/react
  integration/     # Integration tests for multi-component flows
\`\`\``;
  }

  if (projectType === 'backend') {
    const lines = ['```'];
    lines.push('src/');
    lines.push('  index.ts         # Server entry point \u2014 creates the app, registers routes, starts listening');
    lines.push('                   # Includes a GET /health and GET / endpoint out of the box');
    lines.push('                   # To add routes: define handlers and register them on the app instance');
    if (setupZod !== false) {
      lines.push('  env.ts           # Environment validation using Zod \u2014 validates PORT and NODE_ENV at startup');
      lines.push('                   # Add new env vars here: define them in the schema, then import `env` anywhere');
    } else {
      lines.push('  env.ts           # Environment configuration \u2014 reads PORT and NODE_ENV from process.env');
    }
    lines.push('tests/');
    lines.push('  unit/');
    lines.push('    server.unit.test.ts  # Unit tests for route handlers');
    if (setupDocker) {
      lines.push('Dockerfile         # Multi-stage production build');
      lines.push('docker-compose.yml # Container orchestration for app + optional DB services');
    }
    lines.push('```');
    return lines.join('\n');
  }

  if (projectType === 'cli') {
    return `\`\`\`
src/
  index.ts         # CLI entry point with #!/usr/bin/env node shebang
                   # Defines the program and registers commands
                   # Includes a working "hello" command as a starting point
  commands/
    hello.ts       # Example command handler \u2014 add new commands following this pattern
tests/
  unit/            # Unit tests for command handlers
\`\`\``;
  }

  if (projectType === 'npm-lib') {
    return `\`\`\`
src/
  main.ts          # Library entry point \u2014 export your public API from here
                   # tsup reads this as the entry to produce CJS + ESM bundles
test/
  main.test.ts     # Tests for your library's public API
tsup.config.ts     # Build configuration \u2014 dual format, declaration files
\`\`\``;
  }

  if (projectType === 'app') {
    return `\`\`\`
src/
  App.tsx           # Root component \u2014 wraps everything in NavigationContainer + QueryClientProvider
  screens/
    HomeScreen.tsx  # Welcome screen \u2014 displayed after app launch
                    # Add new screens here, then register them in navigation/index.tsx
  navigation/
    index.tsx       # Stack navigator \u2014 defines screen routes and navigation options
                    # To add a screen: import it and add a Stack.Screen entry
tests/
  unit/             # Jest unit tests with @testing-library/react-native
  e2e/              # Detox E2E tests \u2014 test real device interactions
\`\`\``;
  }

  return '';
}

// ---------------------------------------------------------------------------
// 4. Mode-contextualized Tool Playbooks
// ---------------------------------------------------------------------------

function getTypescriptPlaybook(answers) {
  const { projectType } = answers;

  const contextMap = {
    backend:
      'TypeScript is configured in strict mode. In this backend project, it catches type mismatches in route handlers, middleware chains, and environment config before runtime. The `tsconfig.json` targets Node.js with ES modules.\n\n' +
      'Use cases:\n' +
      '- Validate route handler signatures and response shapes\n' +
      '- Enforce environment variable types at compile time\n' +
      '- Catch async errors in middleware before they become runtime crashes',
    frontend:
      'TypeScript is configured in strict mode with JSX support. In this React project, it validates component props, hook usage, and event handlers at compile time. The `tsconfig.json` is split into app and node configs for optimal checking.\n\n' +
      'Use cases:\n' +
      '- Validate component props and prevent missing or wrong-type props\n' +
      '- Catch stale closure bugs in useEffect dependencies\n' +
      '- Ensure event handler signatures match DOM events',
    cli:
      'TypeScript is configured in strict mode. For this CLI tool, it ensures command option types, argument parsing, and output formatting are correct before building. The compiled output is a single CJS bundle.\n\n' +
      'Use cases:\n' +
      '- Validate command handler function signatures\n' +
      '- Enforce option types match their usage\n' +
      '- Catch file system and I/O errors at compile time',
    'npm-lib':
      'TypeScript is configured in strict mode with declaration file generation. For this library, it ensures your public API surface is type-safe and produces `.d.ts` files so consumers get full IntelliSense.\n\n' +
      'Use cases:\n' +
      '- Guarantee exported function signatures are correct\n' +
      '- Generate declaration files automatically via tsup\n' +
      '- Catch breaking API changes before publishing',
    app:
      'TypeScript is configured in strict mode with React Native and JSX support. In this mobile project, it validates component props, navigation route params, and hook usage across screens.\n\n' +
      'Use cases:\n' +
      '- Validate screen component props and navigation params\n' +
      '- Catch incorrect hook usage in React Native components\n' +
      '- Enforce type-safe API response handling',
  };

  const context = contextMap[projectType] || contextMap.backend;

  return `### TypeScript\n\n${context}\n\n${codeBlock(
    'ts',
    'type User = { id: string; name: string };\n\nexport function formatUser(user: User): string {\n  return `${user.name} (${user.id})`;\n}',
  )}`;
}

function getEslintPlaybook(answers) {
  const { projectType } = answers;

  if (answers.linter === 'biome') {
    return `### Biome\n\nBiome replaces ESLint + Prettier with a single fast toolchain for linting and formatting.\n\n${codeBlock('bash', 'npm run lint\nnpm run format')}`;
  }

  const contextMap = {
    backend:
      'ESLint is configured with TypeScript-aware rules. In this backend project, it catches common API mistakes like unhandled promise rejections in route handlers, missing error middleware, and unsafe type assertions.',
    frontend:
      'ESLint includes React-specific plugins (react-hooks, react-refresh). It enforces Rules of Hooks, prevents stale closures in effects, and validates that components are safe for hot module replacement.',
    cli: 'ESLint is configured for Node.js CLI development with TypeScript-aware rules. It catches common mistakes like missing error handling in file operations and enforces consistent patterns across command handlers.',
    'npm-lib':
      'ESLint is configured with TypeScript-aware rules optimized for library development. It enforces consistent exports, catches unsafe type assertions, and keeps the public API surface clean.',
    app: 'ESLint includes React Native and React Hooks plugins. It enforces Rules of Hooks, catches React Native-specific issues, and validates component patterns across screens.',
  };

  const context = contextMap[projectType] || contextMap.backend;

  return `### ESLint + Prettier\n\n${context}\n\nPrettier keeps formatting automatic and low-friction \u2014 no debates about style, just consistent code.\n\n${codeBlock('bash', 'npm run lint\nnpm run format')}`;
}

function getVitestPlaybook(answers) {
  const { projectType } = answers;

  const contextMap = {
    backend: {
      desc: 'Vitest is configured for fast test execution with TypeScript support. In this backend project, use it to test route handlers, middleware logic, and environment validation.',
      cases:
        '- Test route handlers return correct status codes and JSON bodies\n' +
        '- Validate middleware chains process requests correctly\n' +
        '- Unit test environment parsing and validation logic',
      example:
        "import { describe, expect, it } from 'vitest';\n\ndescribe('GET /health', () => {\n  it('returns ok status', async () => {\n    const res = await app.request('/health');\n    expect(res.status).toBe(200);\n  });\n});",
    },
    frontend: {
      desc: 'Vitest is configured with jsdom and @testing-library/react for component testing. In this frontend project, use it to verify component rendering, user interactions, and hook behavior.',
      cases:
        '- Render components and assert DOM output\n' +
        '- Simulate user clicks, typing, and form submissions\n' +
        '- Test custom hooks in isolation with renderHook',
      example:
        "import { render, screen } from '@testing-library/react';\nimport { describe, expect, it } from 'vitest';\n\nimport { Welcome } from '../src/Welcome';\n\ndescribe('Welcome', () => {\n  it('renders heading', () => {\n    render(<Welcome />);\n    expect(screen.getByRole('heading')).toBeDefined();\n  });\n});",
    },
    cli: {
      desc: 'Vitest is configured for testing CLI command logic. In this project, use it to test command handlers, option parsing, and output formatting.',
      cases:
        '- Test command handlers return correct output\n' +
        '- Validate option parsing with different flag combinations\n' +
        '- Assert exit codes and error messages',
      example:
        "import { describe, expect, it } from 'vitest';\n\ndescribe('hello command', () => {\n  it('greets the user by name', () => {\n    expect(hello('World')).toBe('Hello World');\n  });\n});",
    },
    'npm-lib': {
      desc: "Vitest is configured for testing your library's public API. Use it to verify exported functions, edge cases, and type contracts.",
      cases:
        '- Test every exported function with representative inputs\n' +
        '- Cover edge cases: empty strings, nulls, large inputs\n' +
        '- Validate error messages for invalid arguments',
      example:
        "import { describe, expect, it } from 'vitest';\n\nimport { createSlug } from '../src/main';\n\ndescribe('createSlug', () => {\n  it('converts spaces to hyphens', () => {\n    expect(createSlug('Hello World')).toBe('hello-world');\n  });\n});",
    },
    app: {
      desc: 'Vitest is configured for fast unit tests alongside the Jest + React Native Testing Library setup.',
      cases:
        '- Test utility functions and helpers\n' +
        '- Validate data transformations\n' +
        '- Unit test non-component logic',
      example:
        "import { describe, expect, it } from 'vitest';\n\ndescribe('formatDate', () => {\n  it('formats ISO date to readable string', () => {\n    expect(formatDate('2024-01-15')).toBe('Jan 15, 2024');\n  });\n});",
    },
  };

  const ctx = contextMap[projectType] || contextMap.backend;

  return `### Vitest\n\n${ctx.desc}\n\nUse cases:\n${ctx.cases}\n\n${codeBlock('ts', ctx.example)}`;
}

function getToolPlaybooks(answers) {
  const {
    projectType,
    backendFramework,
    cliFramework,
    lintOption = [],
    vitestPreset,
    setupPlaywright,
    setupAppJest,
    setupAppDetox,
    setupZod,
    setupDocker,
    setupSemanticRelease,
  } = answers;

  const blocks = [];

  // TypeScript (mode-contextualized)
  blocks.push(getTypescriptPlaybook(answers));

  // ESLint + Prettier (mode-contextualized)
  blocks.push(getEslintPlaybook(answers));

  // Framework-specific playbooks
  if (projectType === 'frontend') {
    blocks.push(`### React + Vite + Tailwind CSS

This stack gives fast feedback loops, modern component composition, and utility-first styling.

Use cases:
- Build composable UI with reusable components
- Iterate quickly with Vite hot module replacement
- Style with utility classes instead of writing CSS files

${codeBlock(
  'tsx',
  'import { useState } from \'react\';\n\nexport function Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <button\n      className="rounded bg-blue-600 px-4 py-2 text-white"\n      onClick={() => setCount((n) => n + 1)}\n    >\n      Count: {count}\n    </button>\n  );\n}',
)}`);
  }

  if (projectType === 'backend') {
    const backendExamples = {
      hono: "import { Hono } from 'hono';\n\nconst app = new Hono();\napp.get('/health', (c) => c.json({ ok: true }));",
      fastify:
        "import Fastify from 'fastify';\n\nconst app = Fastify();\napp.get('/health', async () => ({ ok: true }));",
      express:
        "import express from 'express';\n\nconst app = express();\napp.get('/health', (_req, res) => res.json({ ok: true }));",
      elysia:
        "import { Elysia } from 'elysia';\n\nconst app = new Elysia();\napp.get('/health', () => ({ ok: true }));",
    };

    const backendLabels = {
      hono: 'Hono',
      fastify: 'Fastify',
      express: 'Express',
      elysia: 'Elysia',
    };

    blocks.push(`### ${backendLabels[backendFramework] || 'Hono'}

Use this framework block as the starting point for routes, middleware, and handlers.

Use cases:
- Add health and status endpoints
- Group domain routes by feature area
- Add middleware for logging, auth, and error handling

${codeBlock('ts', backendExamples[backendFramework] || backendExamples.hono)}`);

    if (setupZod !== false) {
      blocks.push(
        `### Zod

Use Zod in \`src/env.ts\` to validate runtime configuration at startup. Every environment variable is parsed and typed before the server starts \u2014 if a required variable is missing, the process exits immediately with a clear error.

Use cases:
- Fail fast when required environment variables are missing
- Keep runtime and compile-time assumptions aligned
- Add new config: define the field in the schema, then import \`env\` where needed

${codeBlock(
  'ts',
  "import { z } from 'zod';\n\nconst envSchema = z.object({\n  PORT: z.coerce.number().int().positive().default(3000),\n  DATABASE_URL: z.string().url(),\n});\n\nexport const env = envSchema.parse(process.env);",
)}`,
      );
    }
  }

  if (projectType === 'cli') {
    if (cliFramework === 'commander') {
      blocks.push(
        `### Commander.js

Commander is ideal for command + option based CLIs with subcommands. Each command gets its own handler with typed options.

Use cases:
- Build \`my-cli hello <name>\` style commands
- Add flags like \`--dry-run\` or \`--json\`
- Organize large CLIs with nested subcommands

${codeBlock(
  'ts',
  "program\n  .command('hello')\n  .description('Say hello')\n  .argument('[name]', 'name to greet', 'World')\n  .option('-u, --uppercase', 'uppercase output')\n  .action((name, options) => {\n    const value = options.uppercase ? name.toUpperCase() : name;\n    console.log(`Hello ${value}`);\n  });",
)}`,
      );
    }

    if (cliFramework === 'inquirer') {
      blocks.push(`### Inquirer.js

Inquirer is useful when your CLI is wizard-style and user-input-driven. It provides rich prompt types for interactive workflows.

Use cases:
- Interactive setup flows with validation
- Multi-step input collection
- Confirmation prompts before destructive actions

${codeBlock(
  'ts',
  "const { projectName } = await inquirer.prompt([{\n  type: 'input',\n  name: 'projectName',\n  message: 'Project name?',\n  validate: (input) => input.length > 0 || 'Name is required',\n}]);",
)}`);
    }

    if (cliFramework === 'clack') {
      blocks.push(`### @clack/prompts

Clack gives a modern, lightweight interactive CLI experience with beautiful terminal output.

Use cases:
- Friendly scaffolding and onboarding commands
- Input flows with polished spinners and progress
- Multi-step wizards with cancel handling

${codeBlock('ts', "import { text, confirm, spinner } from '@clack/prompts';\n\nconst name = await text({ message: 'What is your name?' });\nconst ready = await confirm({ message: 'Ready to proceed?' });")}`);
    }

    blocks.push(
      `### tsup

tsup builds the CLI into distributable files under \`dist/\`. It handles TypeScript compilation, bundling, and adds the shebang line automatically.

Use cases:
- Produce fast production builds from TypeScript
- Bundle dependencies for standalone distribution
- Generate the executable entry point with shebang

${codeBlock('bash', 'npm run build')}

To extend the build config, edit \`tsup.config.ts\`.`,
    );
  }

  if (projectType === 'npm-lib') {
    blocks.push(`### tsup

tsup produces dual-format package output for modern and legacy consumers. It reads \`src/main.ts\` as the entry and generates CJS, ESM, and declaration files.

Use cases:
- Emit both CJS and ESM builds for maximum compatibility
- Generate declaration files automatically
- Keep build config minimal while supporting complex setups

${codeBlock(
  'ts',
  "import { defineConfig } from 'tsup';\n\nexport default defineConfig({\n  entry: ['src/main.ts'],\n  format: ['cjs', 'esm'],\n  dts: true,\n});",
)}`);
  }

  if (projectType === 'app') {
    blocks.push(`### React Native + Expo

Expo accelerates mobile development while keeping a path to native customization. Use Expo Go for fast iteration, then eject to bare workflow when you need custom native modules.

Use cases:
- Build cross-platform UI with shared components
- Iterate with instant device preview via Expo Go
- Access native APIs through Expo SDK modules

${codeBlock('bash', 'npm start')}`);
  }

  // Vitest (mode-contextualized)
  if (vitestPreset === 'native' || vitestPreset === 'coverage') {
    blocks.push(getVitestPlaybook(answers));
  }

  if (setupPlaywright) {
    blocks.push(`### Playwright

Playwright adds browser-level confidence for critical user paths. It runs real browsers and can test across Chrome, Firefox, and Safari.

Use cases:
- Smoke tests for deployment safety
- End-to-end tests across multi-page user flows
- Visual regression testing

${codeBlock(
  'ts',
  "import { test, expect } from '@playwright/test';\n\ntest('home page renders', async ({ page }) => {\n  await page.goto('/');\n  await expect(page.getByRole('heading')).toBeVisible();\n});",
)}`);
  }

  if (setupAppJest) {
    blocks.push(`### Jest

Jest is the default test runner for React Native unit tests, paired with React Native Testing Library for component assertions.

Use cases:
- Component rendering and interaction verification
- Screen-level behavior testing
- Snapshot tests for UI stability

${codeBlock(
  'ts',
  "import { render, screen } from '@testing-library/react-native';\n\nimport { HomeScreen } from '../src/screens/HomeScreen';\n\ntest('renders welcome text', () => {\n  render(<HomeScreen />);\n  expect(screen.getByText('Welcome')).toBeTruthy();\n});",
)}`);
  }

  if (setupAppDetox) {
    blocks.push(`### Detox

Detox provides native-level E2E tests that run on real simulators and devices. It synchronizes with the app so tests are reliable without manual waits.

Use cases:
- Screen navigation and transition testing
- Device-level interaction flows (tap, scroll, swipe)
- Full user journey verification

${codeBlock('bash', 'npm run test:e2e:build\nnpm run test:e2e')}`);
  }

  if (lintOption.includes('cspell')) {
    blocks.push(`### CSpell

CSpell keeps docs, identifiers, and messages typo-free. Add project-specific terms to \`cspell.json\` so they pass the spell checker.

Use cases:
- Avoid typo churn in code review
- Protect generated docs from false spell failures
- Add domain-specific vocabulary once, use everywhere

${codeBlock('json', '{\n  "words": ["tskickstart", "domainTerm", "productName"]\n}')}`);
  }

  if (lintOption.includes('secretlint')) {
    blocks.push(`### Secretlint

Secretlint scans the repository for API keys, tokens, and other accidental secrets before they reach version control.

Use cases:
- Prevent committing sensitive credentials
- Add a safety net before pushes and PRs
- Catch leaked tokens in test fixtures

${codeBlock('bash', 'npm run secretlint')}`);
  }

  if (lintOption.includes('commitlint')) {
    blocks.push(`### Commitlint

Commitlint enforces predictable commit messages following the Conventional Commits standard. This enables automated changelogs and semantic versioning.

Use cases:
- Keep commit history searchable and structured
- Enable automated release note generation
- Enforce team-wide commit message conventions

${codeBlock('bash', 'git commit -m "feat(cli): add doctor command"')}`);
  }

  if (setupDocker) {
    blocks.push(
      `### Docker

Docker gives reproducible local environments and simpler onboarding. The Dockerfile uses a multi-stage build for small production images.

Use cases:
- Share the same runtime between developers
- Validate containerized startup before deployment
- Run the full stack locally with docker-compose

Use npm scripts to manage Docker services.

${codeBlock('bash', 'npm run docker:up')}`,
    );
  }

  if (setupSemanticRelease) {
    blocks.push(`### semantic-release

semantic-release automates versioning, changelog generation, and publish steps from commit history. It reads Conventional Commit messages to determine the next version.

Use cases:
- Publish reliably without manual version bumps
- Produce consistent release notes from Conventional Commits
- Automate npm publishing from CI

${codeBlock('bash', 'git commit -m "feat: add user-facing search command"\ngit commit -m "fix: handle empty input in parser"')}`);
  }

  return blocks.join('\n\n');
}

// ---------------------------------------------------------------------------
// 5. Common Tasks / How-To section
// ---------------------------------------------------------------------------

function getCommonTasks(answers) {
  const { projectType, backendFramework, cliFramework, setupDocker, setupZod, setupSemanticRelease } = answers;
  const sections = [];

  if (projectType === 'backend') {
    const fwLabel = { hono: 'Hono', fastify: 'Fastify', express: 'Express', elysia: 'Elysia' };
    const fwName = fwLabel[backendFramework] || 'Hono';

    // Add a new route
    const routeExamples = {
      hono: "app.get('/users', (c) => c.json([{ id: '1', name: 'Alice' }]));",
      fastify: "app.get('/users', async () => [{ id: '1', name: 'Alice' }]);",
      express: "app.get('/users', (_req, res) => res.json([{ id: '1', name: 'Alice' }]));",
      elysia: "app.get('/users', () => [{ id: '1', name: 'Alice' }]);",
    };

    sections.push(`### How to add a new route

Open \`src/index.ts\` and register a new ${fwName} route:

${codeBlock('ts', routeExamples[backendFramework] || routeExamples.hono)}

Then add a unit test in \`tests/unit/\` to verify the response status and body.`);

    // Add an environment variable
    if (setupZod !== false) {
      sections.push(`### How to add a new environment variable

1. Add the field to the Zod schema in \`src/env.ts\`:

${codeBlock('ts', 'const envSchema = z.object({\n  PORT: z.coerce.number().int().positive().default(3000),\n  DATABASE_URL: z.string().url(),  // <-- new variable\n});')}

2. Set the variable in your shell or \`.env\` file
3. Import \`env\` from \`./env.ts\` wherever you need it`);
    } else {
      sections.push(`### How to add a new environment variable

Add the variable to \`src/env.ts\` and read it from \`process.env\`. Set it in your shell or \`.env\` file before starting the server.`);
    }

    // Test with curl
    sections.push(`### How to test an endpoint with curl

${codeBlock('bash', 'curl -s http://localhost:3000/health | jq\ncurl -s http://localhost:3000/users | jq')}

Use \`-X POST\` with \`-d\` for POST requests:

${codeBlock('bash', 'curl -s -X POST http://localhost:3000/users -H \'Content-Type: application/json\' -d \'{"name": "Bob"}\'')}`);

    // Add middleware
    const mwExamples = {
      hono: "app.use('*', async (c, next) => {\n  console.log(`${c.req.method} ${c.req.url}`);\n  await next();\n});",
      fastify: "app.addHook('onRequest', async (request) => {\n  console.log(`${request.method} ${request.url}`);\n});",
      express: 'app.use((req, _res, next) => {\n  console.log(`${req.method} ${req.url}`);\n  next();\n});',
      elysia:
        'app.onBeforeHandle(({ request }) => {\n  console.log(`${request.method} ${new URL(request.url).pathname}`);\n});',
    };

    sections.push(`### How to add middleware

Register middleware in \`src/index.ts\`:

${codeBlock('ts', mwExamples[backendFramework] || mwExamples.hono)}`);

    // Docker
    if (setupDocker) {
      sections.push(`### How to run in Docker

${codeBlock('bash', 'npm run docker:up     # Start with build\nnpm run docker:logs   # Tail logs\nnpm run docker:down   # Stop services')}

`);
    }
  }

  if (projectType === 'frontend') {
    sections.push(`### How to add a new page

1. Create a component in \`src/\`, e.g. \`src/About.tsx\`:

${codeBlock('tsx', 'export function About() {\n  return <h1>About</h1>;\n}')}

2. Add a route in \`src/App.tsx\`:

${codeBlock('tsx', '<Route path="/about" element={<About />} />')}

3. Add a unit test in \`tests/unit/\` for the new component.`);

    sections.push(`### How to add a new component

Create the component in \`src/\` as a named export:

${codeBlock('tsx', "export function StatusBadge({ online }: { online: boolean }) {\n  return (\n    <span className={online ? 'text-green-600' : 'text-red-600'}>\n      {online ? 'Online' : 'Offline'}\n    </span>\n  );\n}")}

Import and use it in any page component.`);

    sections.push(`### How to style with Tailwind CSS

Use utility classes directly in JSX. Tailwind CSS v4 is configured via \`src/index.css\` \u2014 no \`tailwind.config.js\` needed.

${codeBlock('tsx', '<div className="flex items-center gap-4 rounded-lg bg-white p-6 shadow">\n  <h2 className="text-xl font-bold">Card Title</h2>\n</div>')}`);
  }

  if (projectType === 'cli') {
    if (cliFramework === 'commander') {
      sections.push(`### How to add a new command

1. Create a handler in \`src/commands/\`, e.g. \`src/commands/init.ts\`:

${codeBlock('ts', "export function runInit(options: { force?: boolean }) {\n  console.log(options.force ? 'Force init' : 'Init');\n}")}

2. Register it in \`src/index.ts\`:

${codeBlock('ts', "program\n  .command('init')\n  .description('Initialize a new project')\n  .option('-f, --force', 'overwrite existing files')\n  .action(runInit);")}

3. Add a unit test in \`tests/unit/\` for the handler logic.`);

      sections.push(`### How to add flags and options

${codeBlock('ts', "program\n  .command('build')\n  .option('-w, --watch', 'rebuild on file changes')\n  .option('-o, --output <dir>', 'output directory', 'dist')\n  .action((options) => {\n    console.log('Output:', options.output);\n    if (options.watch) console.log('Watching...');\n  });")}`);
    }

    if (cliFramework === 'inquirer') {
      sections.push(`### How to add a new command

Create a new async function that uses Inquirer prompts, then call it from the main entry point in \`src/index.ts\`.

${codeBlock('ts', "async function initCommand() {\n  const { name } = await inquirer.prompt([{\n    type: 'input',\n    name: 'name',\n    message: 'Project name?',\n  }]);\n  console.log(`Creating ${name}...`);\n}")}`);
    }

    if (cliFramework === 'clack') {
      sections.push(`### How to add a new command

Create a new async function with Clack prompts, then call it from the main entry point in \`src/index.ts\`.

${codeBlock('ts', "import { text, confirm } from '@clack/prompts';\n\nasync function initCommand() {\n  const name = await text({ message: 'Project name?' });\n  const proceed = await confirm({ message: 'Create project?' });\n  if (proceed) console.log(`Creating ${name}...`);\n}")}`);
    }

    sections.push(`### How to test the CLI locally

${codeBlock('bash', '# Run directly with tsx (development)\nnpm run dev -- hello World\n\n# Build and test the compiled output\nnpm run build\nnode dist/index.cjs hello World\n\n# Or link globally for testing\nnpm link\nmy-cli hello World')}`);

    sections.push(`### How to publish to npm

1. Update \`name\` and \`version\` in \`package.json\`
2. Build: \`npm run build\`
3. Test the built artifact: \`node dist/index.cjs --help\`
4. Publish: \`npm publish\`${setupSemanticRelease ? '\n\nWith semantic-release configured, publishing happens automatically from CI on merge to main.' : ''}`);
  }

  if (projectType === 'npm-lib') {
    sections.push(`### How to add a new export

Add your function or type to \`src/main.ts\`:

${codeBlock('ts', "export function slugify(input: string): string {\n  return input.trim().toLowerCase().replace(/\\s+/g, '-');\n}")}

Consumers will be able to import it: \`import { slugify } from 'your-package'\`.`);

    sections.push(`### How to test the library

Add tests in \`test/main.test.ts\` or create new test files in \`test/\`:

${codeBlock('bash', 'npm test              # Run all tests\nnpm run test:unit     # Unit tests only\nnpm run test:coverage # With coverage report')}`);

    sections.push(`### How to publish to npm

${
  setupSemanticRelease
    ? `With semantic-release configured, publishing is automated:

1. Write code and commit with Conventional Commits (\`feat:\`, \`fix:\`, etc.)
2. Push to main \u2014 CI determines the version bump and publishes automatically

For manual publishing:`
    : 'To publish manually:'
}

${codeBlock('bash', 'npm run build\nnpm publish')}`);

    sections.push(`### How to use from another project

After publishing, install and import:

${codeBlock('ts', "import { slugify } from 'your-package';\n\nconst slug = slugify('Hello World');  // 'hello-world'")}`);
  }

  if (projectType === 'app') {
    sections.push(`### How to add a new screen

1. Create a screen component in \`src/screens/\`, e.g. \`src/screens/ProfileScreen.tsx\`:

${codeBlock('tsx', "import { View, Text } from 'react-native';\n\nexport function ProfileScreen() {\n  return (\n    <View>\n      <Text>Profile</Text>\n    </View>\n  );\n}")}

2. Register it in \`src/navigation/index.tsx\`:

${codeBlock('tsx', '<Stack.Screen name="Profile" component={ProfileScreen} />')}

3. Add a unit test in \`tests/unit/\` for the new screen.`);

    sections.push(`### How to navigate between screens

Use the \`navigation\` prop or \`useNavigation\` hook:

${codeBlock('tsx', "import { useNavigation } from '@react-navigation/native';\n\nconst navigation = useNavigation();\nnavigation.navigate('Profile');")}`);

    sections.push(`### How to add a component

Create reusable components outside of \`screens/\`, e.g. \`src/components/Button.tsx\`:

${codeBlock('tsx', "import { Pressable, Text, StyleSheet } from 'react-native';\n\nexport function Button({ title, onPress }: { title: string; onPress: () => void }) {\n  return (\n    <Pressable style={styles.button} onPress={onPress}>\n      <Text style={styles.text}>{title}</Text>\n    </Pressable>\n  );\n}\n\nconst styles = StyleSheet.create({\n  button: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8 },\n  text: { color: 'white', textAlign: 'center', fontWeight: '600' },\n});")}`);

    sections.push(`### How to test on a device

${codeBlock('bash', '# Expo Go (fastest iteration)\nnpm start\n# Scan QR code with Expo Go app\n\n# iOS Simulator\nnpm run ios\n\n# Android Emulator\nnpm run android')}`);
  }

  return sections.join('\n\n');
}

// ---------------------------------------------------------------------------
// Remaining sections (preserved from original)
// ---------------------------------------------------------------------------

function getToolsSection(answers) {
  const {
    projectType,
    backendFramework,
    cliFramework,
    lintOption = [],
    vitestPreset,
    setupPlaywright,
    setupAppJest,
    setupAppDetox,
    setupZod,
    setupDocker,
    setupSemanticRelease,
  } = answers;
  const tools = [];

  if (projectType === 'frontend') tools.push('- **React** + **Vite** + **Tailwind CSS v4**');
  if (projectType === 'backend') {
    const fw = { hono: 'Hono', fastify: 'Fastify', express: 'Express', elysia: 'Elysia (Bun)' };
    tools.push(`- **${fw[backendFramework] || 'Hono'}** \u2014 HTTP framework`);
    if (setupZod !== false) {
      tools.push('- **Zod** \u2014 environment variable validation');
    }
  }
  if (projectType === 'cli') {
    const fw = { commander: 'Commander.js', inquirer: 'Inquirer.js', clack: '@clack/prompts' };
    tools.push(`- **${fw[cliFramework] || 'Commander.js'}** \u2014 CLI framework`);
    tools.push('- **tsup** \u2014 build tool');
  }
  if (projectType === 'npm-lib') {
    tools.push('- **tsup** \u2014 dual CJS/ESM build');
  }
  if (projectType === 'app') {
    tools.push('- **React Native** + **Expo**');
    tools.push('- **React Navigation** v7');
  }

  tools.push('- **TypeScript** \u2014 strict type checking');
  if (answers.linter === 'biome') {
    tools.push('- **Biome** \u2014 linting and formatting');
  } else {
    tools.push('- **ESLint** v9 + **Prettier** \u2014 code quality and formatting');
  }

  if (lintOption.includes('cspell')) tools.push('- **CSpell** \u2014 spell checking');
  if (lintOption.includes('secretlint')) tools.push('- **Secretlint** \u2014 secret detection');
  if (lintOption.includes('commitlint')) tools.push('- **Commitlint** \u2014 conventional commit enforcement');

  if (projectType === 'app') {
    if (setupAppJest) tools.push('- **Jest** + **React Native Testing Library** \u2014 unit tests');
    if (setupAppDetox) tools.push('- **Detox** \u2014 E2E testing');
  } else {
    if (vitestPreset) tools.push('- **Vitest** \u2014 test runner');
    if (setupPlaywright) tools.push('- **Playwright** \u2014 E2E testing');
  }

  if (setupDocker) tools.push('- **Docker** \u2014 containerized development');
  if (setupSemanticRelease) tools.push('- **semantic-release** \u2014 automated versioning and publishing');

  return tools.join('\n');
}

function getImplementationWorkflow(answers) {
  switch (answers.projectType) {
    case 'frontend':
      return getFrontendImplementationWorkflow();
    case 'cli':
      return getCliImplementationWorkflow(answers);
    case 'npm-lib':
      return getNpmLibImplementationWorkflow();
    case 'app':
      return getAppImplementationWorkflow(answers);
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Frontend — Implementation Workflow + Tutorial
// ---------------------------------------------------------------------------

function getFrontendImplementationWorkflow() {
  const sections = [];

  // Workflow steps
  sections.push(`1. **Start the dev server** — run \`npm run dev\` and open \`http://localhost:5173\`. Vite HMR is active so every saved change appears instantly in the browser.

2. **Create the component** — add a new \`.tsx\` file in \`src/\`. Follow the patterns in \`src/Welcome.tsx\`: default export, TypeScript props type, Tailwind utility classes for styling.

3. **Write a failing test first** — create a matching test file in \`tests/unit/\` (e.g. \`ComponentName.unit.test.tsx\`). Use \`render\` and \`screen\` from Testing Library to assert the expected behavior, then run \`npm run test:unit\` to confirm the test fails.

4. **Implement until tests pass** — fill in the component code until \`npm run test:unit\` goes green. Check the browser to verify visually — Vite HMR picks up saved changes immediately.

5. **Wire into the app and run the quality gate** — if it is a page, add a \`<Route>\` in \`src/App.tsx\`. If it is a shared component, import it in the page that needs it. Then run the full check:

${codeBlock('bash', 'npm run check    # format, lint, typecheck, spellcheck, secretlint, tests')}

Commit using the conventional format enforced by commitlint:

${codeBlock('bash', 'git commit -m "feat(ui): add NotificationBanner component"')}`);

  // Tutorial
  sections.push(`## Frontend Tutorial

Three progressive tutorials that build on this project. Each one introduces a real pattern you will use when building features on top of this starter.

### Tutorial 1: Build a NotificationBanner with TDD

A dismissible banner that accepts a message and a variant (\`"info"\` or \`"error"\`). This tutorial walks through the full red-green-refactor cycle.

#### Step 1 — Start with the props type and an empty component

Create \`src/NotificationBanner.tsx\`:

${codeBlock(
  'tsx',
  `import { useState } from 'react';

type NotificationBannerProps = {
  message: string;
  variant: 'info' | 'error';
};

export default function NotificationBanner({
  message,
  variant,
}: NotificationBannerProps) {
  return null; // start empty — tests will drive the implementation
}`,
)}

#### Step 2 — Write failing tests

Create \`tests/unit/NotificationBanner.unit.test.tsx\`:

${codeBlock(
  'tsx',
  `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NotificationBanner from '../../src/NotificationBanner';

describe('NotificationBanner', () => {
  it('renders the message', () => {
    render(<NotificationBanner message="Saved" variant="info" />);

    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('applies info styling for info variant', () => {
    render(<NotificationBanner message="Saved" variant="info" />);

    expect(screen.getByRole('alert')).toHaveClass('bg-blue-100');
  });

  it('applies error styling for error variant', () => {
    render(<NotificationBanner message="Failed" variant="error" />);

    expect(screen.getByRole('alert')).toHaveClass('bg-red-100');
  });

  it('hides when the close button is clicked', async () => {
    const user = userEvent.setup();
    render(<NotificationBanner message="Saved" variant="info" />);

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});`,
)}

Run the tests — all 4 should fail:

${codeBlock('bash', 'npm run test:unit')}

#### Step 3 — Implement until green

Update \`src/NotificationBanner.tsx\`:

${codeBlock(
  'tsx',
  `import { useState } from 'react';

type NotificationBannerProps = {
  message: string;
  variant: 'info' | 'error';
};

export default function NotificationBanner({
  message,
  variant,
}: NotificationBannerProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className={\`flex items-center justify-between rounded-lg px-4 py-3 \${
        variant === 'info'
          ? 'bg-blue-100 text-blue-900'
          : 'bg-red-100 text-red-900'
      }\`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="ml-4 font-bold hover:opacity-70"
        aria-label="Close"
      >
        &times;
      </button>
    </div>
  );
}`,
)}

Run again — all 4 pass:

${codeBlock('bash', 'npm run test:unit')}

#### Step 4 — Use it

Import the component in \`src/Welcome.tsx\` and place it above the counter card:

${codeBlock(
  'tsx',
  `import NotificationBanner from './NotificationBanner';

// inside the return, before the counter <div>:
<NotificationBanner message="Welcome to the app!" variant="info" />`,
)}

Check the browser at \`http://localhost:5173\` — the blue banner appears and dismisses on click.

**What you learned**: TypeScript props, conditional Tailwind classes, \`useState\` for UI state, \`aria-label\` for accessible button targeting in tests, \`queryByText\` for asserting element absence.

---

### Tutorial 2: Add an About page with routing

This project uses React Router v7 (\`react-router\` package). The existing route is defined in \`src/App.tsx\`. This tutorial adds a second page and wires up navigation between them.

#### Step 1 — Create the page component

Create \`src/About.tsx\`:

${codeBlock(
  'tsx',
  `export default function About() {
  return (
    <div className="min-h-screen bg-gray-200 text-black flex flex-col items-center font-sans">
      <h1 className="mt-16 text-4xl font-bold">About</h1>
      <p className="mt-4 max-w-md text-center text-gray-700">
        This project was scaffolded with tskickstart. It uses React, Vite, and
        Tailwind CSS v4.
      </p>
    </div>
  );
}`,
)}

The outer \`<div>\` mirrors the layout from \`Welcome.tsx\` for visual consistency.

#### Step 2 — Write a unit test

Create \`tests/unit/About.unit.test.tsx\`:

${codeBlock(
  'tsx',
  `import { render, screen } from '@testing-library/react';

import About from '../../src/About';

describe('About', () => {
  it('renders the heading', () => {
    render(<About />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'About',
    );
  });

  it('renders the description', () => {
    render(<About />);

    expect(
      screen.getByText(/scaffolded with tskickstart/i),
    ).toBeInTheDocument();
  });
});`,
)}

#### Step 3 — Register the route

Update \`src/App.tsx\`:

${codeBlock(
  'tsx',
  `import { BrowserRouter, Route, Routes } from 'react-router';

import About from './About';
import Welcome from './Welcome';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;`,
)}

#### Step 4 — Write a routing integration test

In unit tests you render a component directly. To test routing you need \`MemoryRouter\` — this is the key gotcha because \`BrowserRouter\` does not work in the Vitest/happy-dom test environment.

Create \`tests/integration/About.int.test.tsx\`:

${codeBlock(
  'tsx',
  `import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import About from '../../src/About';

describe('About page routing', () => {
  it('renders About when navigating to /about', () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <Routes>
          <Route path="/about" element={<About />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'About',
    );
  });
});`,
)}

#### Step 5 — Add navigation links

In \`src/Welcome.tsx\`, add a link to the About page. Import \`Link\` from \`react-router\`:

${codeBlock(
  'tsx',
  `import { Link } from 'react-router';

// inside the return, after the logos paragraph:
<Link
  to="/about"
  className="mt-2 text-blue-600 underline hover:text-blue-800"
>
  About this project
</Link>`,
)}

Add a matching link back in \`src/About.tsx\`:

${codeBlock(
  'tsx',
  `import { Link } from 'react-router';

// inside the return, after the <p>:
<Link to="/" className="mt-4 text-blue-600 underline hover:text-blue-800">
  Back to home
</Link>`,
)}

#### Step 6 — Write an E2E test

Create \`tests/e2e/about.spec.ts\`:

${codeBlock(
  'ts',
  `import { expect, test } from '@playwright/test';

test.describe('About page', () => {
  test('navigates to about page via link', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'About this project' }).click();
    await expect(
      page.getByRole('heading', { name: 'About' }),
    ).toBeVisible();
  });

  test('navigates back to home', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('link', { name: 'Back to home' }).click();
    await expect(
      page.getByRole('heading', { name: 'Vite + React + Tailwind' }),
    ).toBeVisible();
  });
});`,
)}

Run all tests:

${codeBlock('bash', 'npm run test:unit\nnpm run test:integration\nnpm run test:e2e')}

**What you learned**: Page layout consistency with Tailwind, React Router v7 route registration, \`MemoryRouter\` with \`initialEntries\` for test-time routing, \`Link\` for client-side navigation, Playwright E2E tests for cross-page flows.

---

### Tutorial 3: Fetch data with React Query

\`@tanstack/react-query\` is already installed in this project. This tutorial wires it up end-to-end: provider setup, custom hook, data-driven component, and tests with mocked fetch.

#### Step 1 — Add the QueryClientProvider

Update \`src/main.tsx\` to wrap the app with \`QueryClientProvider\`. Place it inside \`ErrorBoundary\` so query errors are caught, but around \`App\` so all routes have access:

${codeBlock(
  'tsx',
  `import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient();

export function AppSetup() {
  return (
    <StrictMode>
      <ErrorBoundary
        fallback={<p className="text-red-600">An Error has occurred.</p>}
      >
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<AppSetup />);`,
)}

#### Step 2 — Create a custom data-fetching hook

Create \`src/useUsers.ts\`:

${codeBlock(
  'ts',
  `import { useQuery } from '@tanstack/react-query';

type User = {
  id: number;
  name: string;
  email: string;
};

async function fetchUsers(): Promise<User[]> {
  const response = await fetch(
    'https://jsonplaceholder.typicode.com/users',
  );
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
}`,
)}

The \`queryKey\` is a stable array React Query uses for caching and refetching. The \`queryFn\` is a plain async function that returns data or throws.

#### Step 3 — Build the UserList component

Create \`src/UserList.tsx\`:

${codeBlock(
  'tsx',
  `import { useUsers } from './useUsers';

export default function UserList() {
  const { data: users, isLoading, error } = useUsers();

  if (isLoading) return <p>Loading users...</p>;
  if (error) return <p className="text-red-600">Error: {error.message}</p>;

  return (
    <ul className="mt-4 space-y-2">
      {users?.map((user) => (
        <li key={user.id} className="rounded-lg bg-white px-4 py-3 shadow">
          <span className="font-medium">{user.name}</span>
          <span className="ml-2 text-gray-500">{user.email}</span>
        </li>
      ))}
    </ul>
  );
}`,
)}

#### Step 4 — Test it

Create \`tests/unit/UserList.unit.test.tsx\`. The key pattern: wrap each test in a fresh \`QueryClientProvider\` with \`retry: false\` to avoid flaky retries, and mock \`fetch\` with \`vi.fn()\`:

${codeBlock(
  'tsx',
  `import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import UserList from '../../src/UserList';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('UserList', () => {
  it('shows loading state initially', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(<UserList />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('renders users after fetch', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: 1, name: 'Alice', email: 'alice@example.com' },
        ]),
    });

    render(<UserList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('shows error on fetch failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });

    render(<UserList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });
});`,
)}

#### Step 5 — Add a route and navigate to it

In \`src/App.tsx\`, add the route:

${codeBlock(
  'tsx',
  `import UserList from './UserList';

// inside <Routes>:
<Route path="/users" element={<UserList />} />`,
)}

Add a link in \`src/Welcome.tsx\`:

${codeBlock(
  'tsx',
  `<Link to="/users" className="mt-2 text-blue-600 underline hover:text-blue-800">
  View users
</Link>`,
)}

Visit \`http://localhost:5173/users\` — you will see a list of 10 users fetched from the JSONPlaceholder API, each in a white card with their name and email.

**What you learned**: Where to place \`QueryClientProvider\` relative to \`ErrorBoundary\`, separating fetch logic into a custom hook, the \`useQuery\` return shape (\`data\`, \`isLoading\`, \`error\`), testing async components with \`waitFor\`, mocking \`fetch\` with \`vi.fn()\`, creating a fresh \`QueryClient\` per test.`);

  return sections.join('\n\n---\n\n');
}

// ---------------------------------------------------------------------------
// CLI — Implementation Workflow + Tutorial
// ---------------------------------------------------------------------------

function getCliImplementationWorkflow(answers) {
  const { cliFramework } = answers;
  const sections = [];

  // Workflow steps
  sections.push(`1. **Run the CLI in dev mode** — use \`npm run dev\` to start with \`tsx watch\`. Every saved change reloads automatically so you can test commands instantly in a second terminal.

2. **Create the command handler** — add a new \`.ts\` file in \`src/commands/\`. Follow the patterns in \`src/commands/hello.ts\`: export a pure function that takes parsed arguments and does the work. Keep the handler logic separate from the CLI framework wiring.

3. **Write a failing test first** — create a matching test file in \`tests/unit/\` (e.g. \`greet.unit.test.ts\`). Test the handler function directly — spy on \`console.log\` with \`vi.spyOn\` to assert output, then run \`npm run test:unit\` to confirm the test fails.

4. **Implement until tests pass** — fill in the handler code until \`npm run test:unit\` goes green. Verify manually in the terminal: \`npm run dev -- <command> <args>\`.

5. **Wire into the entry point and run the quality gate** — register the command in \`src/index.ts\`, then run the full check:

${codeBlock('bash', 'npm run check    # format, lint, typecheck, spellcheck, secretlint, tests')}

Commit using the conventional format enforced by commitlint:

${codeBlock('bash', 'git commit -m "feat(cli): add greet command"')}`);

  // Framework-specific tutorial
  if (cliFramework === 'commander') {
    sections.push(getCommanderTutorial());
  } else if (cliFramework === 'inquirer') {
    sections.push(getInquirerTutorial());
  } else if (cliFramework === 'clack') {
    sections.push(getClackTutorial());
  }

  return sections.join('\n\n---\n\n');
}

function getCommanderTutorial() {
  return `## CLI Tutorial (Commander.js)

Three progressive tutorials that build on this project. Each one introduces a real pattern you will use when building CLI tools with Commander.js.

### Tutorial 1: Add a \`greet\` command with flags

A command that accepts a name argument and an optional \`--loud\` flag. This tutorial walks through the full handler-first TDD cycle.

#### Step 1 — Create the handler

Create \`src/commands/greet.ts\`:

${codeBlock(
  'ts',
  `export function greet(name: string, options: { loud?: boolean }): void {
  const message = \`Hello, \${name}!\`;
  console.log(options.loud ? message.toUpperCase() : message);
}`,
)}

#### Step 2 — Write failing tests

Create \`tests/unit/greet.unit.test.ts\`:

${codeBlock(
  'ts',
  `import { afterEach, describe, expect, it, vi } from 'vitest';

import { greet } from '../../src/commands/greet.js';

describe('greet command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs greeting with the given name', () => {
    const spy = vi.spyOn(console, 'log');
    greet('Alice', {});
    expect(spy).toHaveBeenCalledWith('Hello, Alice!');
  });

  it('shouts greeting when loud flag is set', () => {
    const spy = vi.spyOn(console, 'log');
    greet('Alice', { loud: true });
    expect(spy).toHaveBeenCalledWith('HELLO, ALICE!');
  });
});`,
)}

Run the tests — both should pass since the handler is already implemented:

${codeBlock('bash', 'npm run test:unit')}

#### Step 3 — Register the command

Update \`src/index.ts\` to add the command:

${codeBlock(
  'ts',
  `import { greet } from './commands/greet.js';

program
  .command('greet')
  .description('Greet someone by name')
  .argument('<name>', 'name to greet')
  .option('-l, --loud', 'shout the greeting')
  .action((name, options) => {
    greet(name, options);
  });`,
)}

#### Step 4 — Verify manually

${codeBlock('bash', 'npm run dev -- greet Alice\nnpm run dev -- greet Alice --loud')}

**What you learned**: Handler-first architecture (pure function tested in isolation), Commander argument and option syntax, \`vi.spyOn(console, 'log')\` for output assertions.

---

### Tutorial 2: Add a \`config\` command with subcommands

A command with \`config get <key>\` and \`config set <key> <value>\` subcommands. This introduces the nested command pattern.

#### Step 1 — Create the handler

Create \`src/commands/config.ts\`:

${codeBlock(
  'ts',
  `const store = new Map<string, string>();

export function configGet(key: string): void {
  const value = store.get(key);
  if (value === undefined) {
    console.error(\`Key "\${key}" not found\`);
    return;
  }
  console.log(value);
}

export function configSet(key: string, value: string): void {
  store.set(key, value);
  console.log(\`Set \${key} = \${value}\`);
}`,
)}

#### Step 2 — Write tests

Create \`tests/unit/config.unit.test.ts\`:

${codeBlock(
  'ts',
  `import { afterEach, describe, expect, it, vi } from 'vitest';

import { configGet, configSet } from '../../src/commands/config.js';

describe('config command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets and gets a value', () => {
    const logSpy = vi.spyOn(console, 'log');
    configSet('theme', 'dark');
    expect(logSpy).toHaveBeenCalledWith('Set theme = dark');

    configGet('theme');
    expect(logSpy).toHaveBeenCalledWith('dark');
  });

  it('prints error for missing key', () => {
    const errSpy = vi.spyOn(console, 'error');
    configGet('missing');
    expect(errSpy).toHaveBeenCalledWith('Key "missing" not found');
  });
});`,
)}

#### Step 3 — Register with nested commands

${codeBlock(
  'ts',
  `import { configGet, configSet } from './commands/config.js';

const config = program
  .command('config')
  .description('Manage configuration');

config
  .command('get')
  .argument('<key>', 'config key to read')
  .action((key) => configGet(key));

config
  .command('set')
  .argument('<key>', 'config key to write')
  .argument('<value>', 'value to set')
  .action((key, value) => configSet(key, value));`,
)}

**What you learned**: Nested Commander subcommands, in-memory store pattern for config, testing \`console.error\` for error paths.

---

### Tutorial 3: Add an \`init\` command with interactive prompts

Combine Commander for the command entry point with interactive prompts for user input. This is the typical pattern for scaffold-style CLI tools.

#### Step 1 — Create the handler

Create \`src/commands/init.ts\`:

${codeBlock(
  'ts',
  `import { input, confirm } from '@inquirer/prompts';

export async function init(): Promise<void> {
  const name = await input({
    message: 'Project name:',
    default: 'my-project',
  });

  const typescript = await confirm({
    message: 'Use TypeScript?',
    default: true,
  });

  console.log(\`Creating \${name} (TypeScript: \${typescript})\`);
}`,
)}

#### Step 2 — Write a test

Create \`tests/unit/init.unit.test.ts\`. Mock the prompt library to avoid interactive input in tests:

${codeBlock(
  'ts',
  `import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn().mockResolvedValue('demo'),
  confirm: vi.fn().mockResolvedValue(true),
}));

import { init } from '../../src/commands/init.js';

describe('init command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs project creation with answers', async () => {
    const spy = vi.spyOn(console, 'log');
    await init();
    expect(spy).toHaveBeenCalledWith('Creating demo (TypeScript: true)');
  });
});`,
)}

#### Step 3 — Register the command

${codeBlock(
  'ts',
  `import { init } from './commands/init.js';

program
  .command('init')
  .description('Initialize a new project')
  .action(() => init());`,
)}

**What you learned**: Mixing Commander with interactive prompts, mocking prompt libraries with \`vi.mock()\`, testing async command handlers.`;
}

function getInquirerTutorial() {
  return `## CLI Tutorial (Inquirer.js)

Three progressive tutorials that build on this project. Each one introduces a real pattern you will use when building interactive CLI tools with Inquirer.js.

### Tutorial 1: Add a name input with validation

A prompt that asks for a project name and validates it contains only lowercase letters, numbers, and hyphens.

#### Step 1 — Create the handler

Create \`src/commands/create.ts\`:

${codeBlock(
  'ts',
  `export function validateName(input: string): string | true {
  if (!/^[a-z0-9-]+$/.test(input)) {
    return 'Only lowercase letters, numbers, and hyphens allowed';
  }
  return true;
}

export function createProject(name: string): void {
  console.log(\`Creating project: \${name}\`);
}`,
)}

#### Step 2 — Write tests

Create \`tests/unit/create.unit.test.ts\`:

${codeBlock(
  'ts',
  `import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProject, validateName } from '../../src/commands/create.js';

describe('create command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts valid names', () => {
    expect(validateName('my-project')).toBe(true);
    expect(validateName('app123')).toBe(true);
  });

  it('rejects invalid names', () => {
    expect(validateName('My Project')).toEqual(expect.any(String));
    expect(validateName('foo_bar')).toEqual(expect.any(String));
  });

  it('logs project creation', () => {
    const spy = vi.spyOn(console, 'log');
    createProject('demo');
    expect(spy).toHaveBeenCalledWith('Creating project: demo');
  });
});`,
)}

#### Step 3 — Wire into the Inquirer flow

Update \`src/index.ts\` to add the prompt:

${codeBlock(
  'ts',
  `import inquirer from 'inquirer';

import { createProject, validateName } from './commands/create.js';

const { name } = await inquirer.prompt<{ name: string }>([
  {
    type: 'input',
    name: 'name',
    message: 'Project name:',
    default: 'my-project',
    validate: validateName,
  },
]);

createProject(name);`,
)}

**What you learned**: Extracting validation logic into testable pure functions, Inquirer \`validate\` callback, handler-first architecture.

---

### Tutorial 2: Add a multi-step wizard with list selection

A multi-prompt wizard that picks a language and a feature set, then scaffolds based on the choices.

#### Step 1 — Create the handler

Create \`src/commands/setup.ts\`:

${codeBlock(
  'ts',
  `export type SetupOptions = {
  language: 'typescript' | 'javascript';
  features: string[];
};

export function setup(options: SetupOptions): void {
  console.log(\`Language: \${options.language}\`);
  console.log(\`Features: \${options.features.join(', ') || 'none'}\`);
}`,
)}

#### Step 2 — Write tests

Create \`tests/unit/setup.unit.test.ts\`:

${codeBlock(
  'ts',
  `import { afterEach, describe, expect, it, vi } from 'vitest';

import { setup } from '../../src/commands/setup.js';

describe('setup command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs language and features', () => {
    const spy = vi.spyOn(console, 'log');
    setup({ language: 'typescript', features: ['linting', 'testing'] });
    expect(spy).toHaveBeenCalledWith('Language: typescript');
    expect(spy).toHaveBeenCalledWith('Features: linting, testing');
  });

  it('handles empty features', () => {
    const spy = vi.spyOn(console, 'log');
    setup({ language: 'javascript', features: [] });
    expect(spy).toHaveBeenCalledWith('Features: none');
  });
});`,
)}

#### Step 3 — Wire the prompts

${codeBlock(
  'ts',
  `import inquirer from 'inquirer';

import { setup } from './commands/setup.js';

const answers = await inquirer.prompt([
  {
    type: 'list',
    name: 'language',
    message: 'Language:',
    choices: ['typescript', 'javascript'],
  },
  {
    type: 'checkbox',
    name: 'features',
    message: 'Features:',
    choices: ['linting', 'testing', 'ci'],
  },
]);

setup(answers);`,
)}

**What you learned**: Inquirer \`list\` and \`checkbox\` prompt types, typed answer objects, testing handler logic without mocking prompts.

---

### Tutorial 3: Add output formatting with colors and tables

Add polished terminal output using \`picocolors\` for colors (already available) and a simple table layout.

#### Step 1 — Create the handler

Create \`src/commands/status.ts\`:

${codeBlock(
  'ts',
  `import pc from 'picocolors';

export type ServiceStatus = {
  name: string;
  running: boolean;
};

export function printStatus(services: ServiceStatus[]): void {
  console.log(pc.bold('Service Status'));
  console.log('─'.repeat(30));
  for (const svc of services) {
    const icon = svc.running ? pc.green('●') : pc.red('●');
    console.log(\`  \${icon} \${svc.name}\`);
  }
}`,
)}

#### Step 2 — Write tests

Create \`tests/unit/status.unit.test.ts\`:

${codeBlock(
  'ts',
  `import { afterEach, describe, expect, it, vi } from 'vitest';

import { printStatus } from '../../src/commands/status.js';

describe('status command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints service names', () => {
    const spy = vi.spyOn(console, 'log');
    printStatus([
      { name: 'api', running: true },
      { name: 'worker', running: false },
    ]);
    const output = spy.mock.calls.map((c) => c[0]).join('\\n');
    expect(output).toContain('api');
    expect(output).toContain('worker');
  });
});`,
)}

**What you learned**: \`picocolors\` for terminal colors, structured output formatting, testing formatted console output by joining spy calls.`;
}

function getClackTutorial() {
  return `## CLI Tutorial (@clack/prompts)

Three progressive tutorials that build on this project. Each one introduces a real pattern you will use when building interactive CLI tools with @clack/prompts.

### Tutorial 1: Add a \`create\` wizard with cancel handling

A multi-step wizard that asks for a project name and confirms creation. This tutorial introduces the critical \`isCancel()\` pattern.

#### Step 1 — Create the handler

Create \`src/commands/create.ts\`:

${codeBlock(
  'ts',
  `export function createProject(name: string): void {
  console.log(\`Creating project: \${name}\`);
}`,
)}

#### Step 2 — Write tests

Create \`tests/unit/create.unit.test.ts\`:

${codeBlock(
  'ts',
  `import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProject } from '../../src/commands/create.js';

describe('create command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs project creation', () => {
    const spy = vi.spyOn(console, 'log');
    createProject('demo');
    expect(spy).toHaveBeenCalledWith('Creating project: demo');
  });
});`,
)}

#### Step 3 — Wire the Clack flow

Update \`src/index.ts\`:

${codeBlock(
  'ts',
  `import { confirm, intro, isCancel, outro, text } from '@clack/prompts';

import { createProject } from './commands/create.js';

async function main(): Promise<void> {
  intro('Project Setup');

  const name = await text({
    message: 'Project name:',
    placeholder: 'my-project',
    defaultValue: 'my-project',
  });

  if (isCancel(name)) {
    outro('Cancelled.');
    process.exit(0);
  }

  const ok = await confirm({ message: \`Create "\${name}"?\` });

  if (isCancel(ok) || !ok) {
    outro('Cancelled.');
    process.exit(0);
  }

  createProject(name);
  outro('Done!');
}

void main();`,
)}

**What you learned**: \`isCancel()\` guard after every prompt, \`intro\`/\`outro\` for session framing, \`text\` with \`defaultValue\`.

---

### Tutorial 2: Add a selection step with \`select\`

Extend the wizard with a language choice using Clack's \`select\` prompt.

#### Step 1 — Create the handler

Create \`src/commands/setup.ts\`:

${codeBlock(
  'ts',
  `export type SetupOptions = {
  name: string;
  language: string;
};

export function setup(options: SetupOptions): void {
  console.log(\`Project: \${options.name} (\${options.language})\`);
}`,
)}

#### Step 2 — Write tests

Create \`tests/unit/setup.unit.test.ts\`:

${codeBlock(
  'ts',
  `import { afterEach, describe, expect, it, vi } from 'vitest';

import { setup } from '../../src/commands/setup.js';

describe('setup command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs project with language', () => {
    const spy = vi.spyOn(console, 'log');
    setup({ name: 'demo', language: 'TypeScript' });
    expect(spy).toHaveBeenCalledWith('Project: demo (TypeScript)');
  });
});`,
)}

#### Step 3 — Wire the select prompt

${codeBlock(
  'ts',
  `import { intro, isCancel, outro, select, text } from '@clack/prompts';

import { setup } from './commands/setup.js';

const name = await text({
  message: 'Project name:',
  placeholder: 'my-project',
  defaultValue: 'my-project',
});

if (isCancel(name)) {
  outro('Cancelled.');
  process.exit(0);
}

const language = await select({
  message: 'Language:',
  options: [
    { value: 'TypeScript', label: 'TypeScript' },
    { value: 'JavaScript', label: 'JavaScript' },
  ],
});

if (isCancel(language)) {
  outro('Cancelled.');
  process.exit(0);
}

setup({ name, language });`,
)}

**What you learned**: Clack \`select\` with \`options\` array (value/label pairs), chaining prompts with cancel guards.

---

### Tutorial 3: Add a spinner for long-running tasks

Use Clack's \`spinner\` to show progress during async operations.

#### Step 1 — Create the handler

Create \`src/commands/deploy.ts\`:

${codeBlock(
  'ts',
  `export async function deploy(target: string): Promise<void> {
  // simulate async work
  await new Promise((resolve) => setTimeout(resolve, 1500));
  console.log(\`Deployed to \${target}\`);
}`,
)}

#### Step 2 — Write a test

Create \`tests/unit/deploy.unit.test.ts\`:

${codeBlock(
  'ts',
  `import { afterEach, describe, expect, it, vi } from 'vitest';

import { deploy } from '../../src/commands/deploy.js';

describe('deploy command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs deployment target', async () => {
    const spy = vi.spyOn(console, 'log');
    await deploy('staging');
    expect(spy).toHaveBeenCalledWith('Deployed to staging');
  });
});`,
)}

#### Step 3 — Wire with spinner

${codeBlock(
  'ts',
  `import { spinner } from '@clack/prompts';

import { deploy } from './commands/deploy.js';

const s = spinner();
s.start('Deploying...');
await deploy('staging');
s.stop('Deployed!');`,
)}

**What you learned**: Clack \`spinner\` for visual progress, async handler patterns, testing async functions with \`await\`.`;
}

// ---------------------------------------------------------------------------
// NPM Library — Implementation Workflow + Tutorial
// ---------------------------------------------------------------------------

function getNpmLibImplementationWorkflow() {
  const sections = [];

  // Workflow steps
  sections.push(`1. **Start with the public API** — open \`src/main.ts\` and define the function signature you want consumers to call. Export only what should be public — keep internals in separate files that are not re-exported.

2. **Write a failing test first** — create a test file in \`tests/\` (e.g. \`tests/slugify.test.ts\`). Import the function from \`../src/main.ts\` and assert the expected behavior, then run \`npm run test:unit\` to confirm the test fails.

3. **Implement until tests pass** — fill in the function body until \`npm run test:unit\` goes green. Focus on the contract (inputs → outputs) — internal refactoring is free as long as the public API stays stable.

4. **Build and verify the output** — run \`npm run build\` and inspect the \`dist/\` directory. You should see CJS (\`.cjs\`), ESM (\`.js\`), and declaration (\`.d.ts\`) files. Make sure your new export appears in the built output.

5. **Run the full quality gate before commit**:

${codeBlock('bash', 'npm run check    # format, lint, typecheck, spellcheck, secretlint, tests')}

Commit using the conventional format enforced by commitlint:

${codeBlock('bash', 'git commit -m "feat: add slugify utility"')}`);

  // Tutorial
  sections.push(`## Library Tutorial

Three progressive tutorials that build on this project. Each one introduces a real pattern you will use when developing and publishing a TypeScript library.

### Tutorial 1: Add a \`slugify\` utility with TDD

A function that converts a string to a URL-friendly slug. This tutorial walks through the full red-green-refactor cycle for a library function.

#### Step 1 — Define the public API

Add the export to \`src/main.ts\`:

${codeBlock(
  'ts',
  `export function slugify(input: string): string {
  return ''; // start empty — tests will drive the implementation
}`,
)}

#### Step 2 — Write failing tests

Create \`tests/slugify.test.ts\`:

${codeBlock(
  'ts',
  `import { describe, expect, it } from 'vitest';

import { slugify } from '../src/main.js';

describe('slugify', () => {
  it('lowercases the input', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('foo bar baz')).toBe('foo-bar-baz');
  });

  it('removes special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('trims whitespace', () => {
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('foo---bar')).toBe('foo-bar');
  });
});`,
)}

Run the tests — all 5 should fail:

${codeBlock('bash', 'npm run test:unit')}

#### Step 3 — Implement until green

Update the function in \`src/main.ts\`:

${codeBlock(
  'ts',
  `export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\\s-]/g, '')
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-');
}`,
)}

Run again — all 5 pass:

${codeBlock('bash', 'npm run test:unit')}

#### Step 4 — Verify the build output

${codeBlock('bash', 'npm run build\nls dist/')}

Confirm \`slugify\` appears in \`dist/main.d.ts\`.

**What you learned**: Export-first API design, testing pure functions, verifying declaration files in the build output.

---

### Tutorial 2: Add a typed \`Result\` utility

A generic \`Result<T, E>\` type for type-safe error handling. This introduces exporting types alongside runtime functions.

#### Step 1 — Define the types and constructors

Create \`src/result.ts\`:

${codeBlock(
  'ts',
  `export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}`,
)}

Re-export from \`src/main.ts\`:

${codeBlock('ts', `export { err, ok } from './result.js';\nexport type { Result } from './result.js';`)}

#### Step 2 — Write tests

Create \`tests/result.test.ts\`:

${codeBlock(
  'ts',
  `import { describe, expect, it } from 'vitest';

import { err, ok } from '../src/main.js';

describe('Result', () => {
  it('creates an ok result', () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it('creates an error result', () => {
    const result = err('not found');
    expect(result).toEqual({ ok: false, error: 'not found' });
  });

  it('narrows types via ok flag', () => {
    const result = ok('hello');
    if (result.ok) {
      expect(result.value).toBe('hello');
    }
  });
});`,
)}

#### Step 3 — Build and verify types

${codeBlock('bash', 'npm run build\ncat dist/main.d.ts')}

Confirm the \`Result\` type and \`ok\`/\`err\` functions appear in the declaration file.

**What you learned**: Exporting types alongside runtime values, discriminated union pattern, re-exporting from a barrel file.

---

### Tutorial 3: Evolve the API without breaking consumers

Add an optional \`separator\` parameter to \`slugify\` while keeping the default behavior unchanged. This is the safe pattern for evolving a library API.

#### Step 1 — Extend the signature

Update \`slugify\` in \`src/main.ts\`:

${codeBlock(
  'ts',
  `export function slugify(input: string, separator = '-'): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\\s-]/g, '')
    .replace(/\\s+/g, separator)
    .replace(new RegExp(\`\${separator}+\`, 'g'), separator);
}`,
)}

#### Step 2 — Add tests for the new parameter

Add to \`tests/slugify.test.ts\`:

${codeBlock(
  'ts',
  `it('uses custom separator', () => {
  expect(slugify('hello world', '_')).toBe('hello_world');
});

it('defaults to hyphen separator', () => {
  expect(slugify('hello world')).toBe('hello-world');
});`,
)}

#### Step 3 — Verify backwards compatibility

All existing tests still pass because the new parameter is optional with a default value:

${codeBlock('bash', 'npm run test:unit')}

**What you learned**: Optional parameters with defaults for backwards-compatible API evolution, why existing tests are the safety net for refactoring.`);

  return sections.join('\n\n---\n\n');
}

// ---------------------------------------------------------------------------
// App (React Native) — Implementation Workflow + Tutorial
// ---------------------------------------------------------------------------

function getAppImplementationWorkflow(answers) {
  const { setupAppJest } = answers;
  const sections = [];

  const testCommand = setupAppJest ? 'npm test' : 'npm run test:unit';

  // Workflow steps
  sections.push(`1. **Start the dev server** — run \`npm start\` and scan the QR code with Expo Go on your device, or press \`i\` for the iOS simulator / \`a\` for Android emulator. Every saved change reloads automatically.

2. **Create the screen** — add a new \`.tsx\` file in \`src/screens/\`. Follow the patterns in \`src/screens/HomeScreen.tsx\`: default export, \`StyleSheet.create\` for styles, \`ScrollView\` or \`View\` as the root container.

3. **Write a failing test first** — create a matching test file in \`tests/unit/\` (e.g. \`ProfileScreen.unit.test.tsx\`). Use \`render\` and \`screen\` from \`@testing-library/react-native\` to assert the expected behavior, then run \`${testCommand}\` to confirm the test fails.

4. **Implement until tests pass** — fill in the screen code until \`${testCommand}\` goes green. Check the device/simulator to verify visually — Expo picks up saved changes immediately.

5. **Wire navigation and run the quality gate** — register the screen in \`src/navigation/index.tsx\` as a \`<Stack.Screen>\`. Then run the full check:

${codeBlock('bash', 'npm run check    # format, lint, typecheck, spellcheck, secretlint, tests')}

Commit using the conventional format enforced by commitlint:

${codeBlock('bash', 'git commit -m "feat(screens): add ProfileScreen"')}`);

  // Tutorial
  sections.push(`## Mobile App Tutorial

Three progressive tutorials that build on this project. Each one introduces a real pattern you will use when building features with React Native and Expo.

### Tutorial 1: Build a ProfileScreen with TDD

A screen that displays a user name and email. This tutorial walks through the screen-first TDD cycle.

#### Step 1 — Create the screen

Create \`src/screens/ProfileScreen.tsx\`:

${codeBlock(
  'tsx',
  `import { StyleSheet, Text, View } from 'react-native';

type ProfileScreenProps = {
  name?: string;
  email?: string;
};

export default function ProfileScreen({
  name = 'Guest',
  email = 'guest@example.com',
}: ProfileScreenProps) {
  return null; // start empty — tests will drive the implementation
}

const styles = StyleSheet.create({});`,
)}

#### Step 2 — Write failing tests

Create \`tests/unit/ProfileScreen.unit.test.tsx\`:

${codeBlock(
  'tsx',
  `import { render, screen } from '@testing-library/react-native';

import ProfileScreen from '../../src/screens/ProfileScreen';

describe('ProfileScreen', () => {
  it('renders the default name', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Guest')).toBeTruthy();
  });

  it('renders a custom name', () => {
    render(<ProfileScreen name="Alice" />);
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('renders the email', () => {
    render(<ProfileScreen email="alice@example.com" />);
    expect(screen.getByText('alice@example.com')).toBeTruthy();
  });
});`,
)}

Run the tests — all 3 should fail:

${codeBlock('bash', testCommand)}

#### Step 3 — Implement until green

Update \`src/screens/ProfileScreen.tsx\`:

${codeBlock(
  'tsx',
  `import { StyleSheet, Text, View } from 'react-native';

type ProfileScreenProps = {
  name?: string;
  email?: string;
};

export default function ProfileScreen({
  name = 'Guest',
  email = 'guest@example.com',
}: ProfileScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.email}>{email}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
});`,
)}

Run again — all 3 pass:

${codeBlock('bash', testCommand)}

**What you learned**: Screen component with typed props and defaults, \`StyleSheet.create\` for styles, \`@testing-library/react-native\` for rendering and assertions.

---

### Tutorial 2: Add navigation between screens

Wire \`ProfileScreen\` into the navigator and add a button on \`HomeScreen\` to navigate to it. This introduces the \`useNavigation\` hook.

#### Step 1 — Register the screen

Update \`src/navigation/index.tsx\`:

${codeBlock(
  'tsx',
  `import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}`,
)}

#### Step 2 — Add a navigation button

In \`src/screens/HomeScreen.tsx\`, add a button that navigates to Profile. Import \`useNavigation\`:

${codeBlock(
  'tsx',
  `import { useNavigation } from '@react-navigation/native';

// inside HomeScreen, before the closing </View>:
const navigation = useNavigation();

<Pressable
  style={styles.button}
  onPress={() => navigation.navigate('Profile')}
  accessibilityRole="button"
  accessibilityLabel="Go to profile"
>
  <Text style={styles.buttonText}>View Profile</Text>
</Pressable>`,
)}

#### Step 3 — Write a navigation test

Create \`tests/unit/Navigation.unit.test.tsx\`:

${codeBlock(
  'tsx',
  `import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';

import { RootNavigator } from '../../src/navigation/index';

describe('Navigation', () => {
  it('renders HomeScreen by default', () => {
    render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>,
    );
    expect(screen.getByText('Welcome to Your App')).toBeTruthy();
  });
});`,
)}

**What you learned**: Stack navigator screen registration, \`useNavigation\` for programmatic navigation, wrapping navigators in \`NavigationContainer\` for tests.

---

### Tutorial 3: Build a shared Card component

A reusable \`Card\` component used across multiple screens. This introduces the \`src/components/\` pattern for shared UI.

#### Step 1 — Create the component

Create \`src/components/Card.tsx\`:

${codeBlock(
  'tsx',
  `import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type CardProps = {
  title: string;
  children: ReactNode;
};

export default function Card({ title, children }: CardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
});`,
)}

#### Step 2 — Write tests

Create \`tests/unit/Card.unit.test.tsx\`:

${codeBlock(
  'tsx',
  `import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import Card from '../../src/components/Card';

describe('Card', () => {
  it('renders the title', () => {
    render(
      <Card title="Stats">
        <Text>Content</Text>
      </Card>,
    );
    expect(screen.getByText('Stats')).toBeTruthy();
  });

  it('renders children', () => {
    render(
      <Card title="Stats">
        <Text>Hello from inside</Text>
      </Card>,
    );
    expect(screen.getByText('Hello from inside')).toBeTruthy();
  });
});`,
)}

#### Step 3 — Use it in a screen

Import the Card in \`src/screens/HomeScreen.tsx\`:

${codeBlock(
  'tsx',
  `import Card from '../components/Card';

// replace the counter <View> with:
<Card title="Counter">
  <Pressable
    style={styles.button}
    onPress={() => setCount((prev) => prev + 1)}
  >
    <Text style={styles.buttonText}>count is {count}</Text>
  </Pressable>
</Card>`,
)}

**What you learned**: Shared component architecture with \`src/components/\`, \`children\` prop with \`ReactNode\` type, reusing components across screens, \`StyleSheet\` elevation for Android shadow.`);

  return sections.join('\n\n---\n\n');
}

function getTestingWorkflow(answers) {
  const { projectType, vitestPreset, setupPlaywright, setupAppJest, setupAppDetox } = answers;
  const sections = [
    '1. **Run tests closest to your change first** (unit > integration > e2e).',
    '2. **Keep tests behavior-focused**: assert outputs, side effects, and user-visible outcomes rather than implementation details.',
  ];

  if (projectType === 'app') {
    if (setupAppJest) {
      sections.push(`3. **Unit tests (Jest)**\n\n${codeBlock('bash', 'npm test')}`);
    }
    if (setupAppDetox) {
      sections.push(`4. **E2E tests (Detox)**\n\n${codeBlock('bash', 'npm run test:e2e:build\nnpm run test:e2e')}`);
    }
  } else {
    if (vitestPreset === 'native' || vitestPreset === 'coverage') {
      sections.push(
        `3. **Core test loop (Vitest)**\n\n${codeBlock('bash', 'npm test\nnpm run test:unit\nnpm run test:integration')}`,
      );
    }

    if (vitestPreset === 'coverage') {
      sections.push(`4. **Coverage checks**\n\n${codeBlock('bash', 'npm run test:coverage')}`);
    }

    if (setupPlaywright) {
      sections.push(`5. **E2E checks (Playwright)**\n\n${codeBlock('bash', 'npm run test:e2e')}`);
    }
  }

  sections.push(`6. **Run the release gate before opening a PR**\n\n${codeBlock('bash', 'npm run check')}`);

  return sections.join('\n\n');
}

function getQualityChecksDescription(answers) {
  const checks = ['formatting', 'linting', 'type checking'];
  if (answers.lintOption?.includes('cspell')) checks.push('spell checking');
  if (answers.lintOption?.includes('secretlint')) checks.push('secret scanning');
  if (hasCheckScriptTests(answers)) checks.push('tests');

  if (checks.length === 1) return checks[0];
  if (checks.length === 2) return `${checks[0]} and ${checks[1]}`;
  return `${checks.slice(0, -1).join(', ')}, and ${checks.at(-1)}`;
}

function getScriptsTable(answers) {
  const {
    projectType,
    vitestPreset,
    setupPlaywright,
    setupAppJest,
    setupAppDetox,
    setupDocker,
    lintOption = [],
    linter = 'eslint',
  } = answers;
  const rows = [];

  rows.push('| Script | Description |');
  rows.push('| --- | --- |');
  rows.push('| `npm run check` | Run all quality checks |');
  rows.push(`| \`npm run format\` | Format code with ${linter === 'biome' ? 'Biome' : 'Prettier'} |`);
  rows.push(`| \`npm run lint\` | Lint with ${linter === 'biome' ? 'Biome' : 'ESLint'} |`);
  rows.push('| `npm run typecheck` | Type-check with TypeScript |');

  if (lintOption.includes('cspell')) rows.push('| `npm run spellcheck` | Check spelling |');
  if (lintOption.includes('secretlint')) rows.push('| `npm run secretlint` | Scan for secrets |');

  if (projectType === 'app') {
    if (setupAppJest) rows.push('| `npm test` | Run Jest unit tests |');
    if (setupAppDetox) {
      rows.push('| `npm run test:e2e` | Run Detox E2E tests |');
      rows.push('| `npm run test:e2e:build` | Build for E2E testing |');
    }
    rows.push('| `npm start` | Start Expo dev server |');
    rows.push('| `npm run android` | Run on Android |');
    rows.push('| `npm run ios` | Run on iOS |');
  } else {
    if (vitestPreset) {
      rows.push('| `npm test` | Run all tests |');
      rows.push('| `npm run test:unit` | Run unit tests |');
      rows.push('| `npm run test:integration` | Run integration tests |');
    }
    if (vitestPreset === 'coverage') rows.push('| `npm run test:coverage` | Tests with coverage |');
    if (setupPlaywright) {
      rows.push('| `npm run test:e2e` | Run Playwright E2E tests |');
      rows.push('| `npm run test:e2e:ui` | Playwright interactive mode |');
    }
    if (['frontend', 'backend', 'cli'].includes(projectType)) {
      rows.push('| `npm run dev` | Start development server |');
    }
    if (['frontend', 'backend', 'cli', 'npm-lib'].includes(projectType)) {
      rows.push('| `npm run build` | Build for production |');
    }
    if (projectType === 'backend' && setupDocker) {
      rows.push('| `npm run docker:up` | Start Docker services with build |');
      rows.push('| `npm run docker:down` | Stop Docker services |');
      rows.push('| `npm run docker:logs` | Tail Docker service logs |');
      rows.push('| `npm run docker:build` | Build Docker services |');
    }
  }

  return rows.join('\n');
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function generateReadme(answers) {
  if (answers.projectType === 'backend') {
    return generateBackendReadme(answers);
  }

  const pkg = answers._pkgName || 'my-project';

  const sections = [];

  // Title + rich introduction
  const title = getProjectTitle(answers);
  sections.push(
    `# ${pkg}\n\n> A ${title.toLowerCase()} scaffolded with [tskickstart](https://github.com/jeportie/tskickstart).\n\n${getIntroduction(answers)}`,
  );

  sections.push(`## Project Snapshot\n\n${getProjectSnapshot(answers)}`);

  sections.push(`## Prerequisites\n\n${getPrerequisites(answers)}`);

  // Getting Started (replaces Quick Start)
  sections.push(`## Getting Started\n\n${getGettingStarted(answers)}`);

  sections.push(`## Development\n\n${getDevelopment(answers)}`);

  const build = getBuild(answers);
  if (build) sections.push(`## Build\n\n${build}`);

  sections.push(`## Implementation Workflow\n\n${getImplementationWorkflow(answers)}`);

  sections.push(`## Testing\n\n${getTesting(answers)}`);

  sections.push(`## Testing Workflow\n\n${getTestingWorkflow(answers)}`);

  sections.push(
    `## Quality Checks\n\n${codeBlock('bash', 'npm run check')}\n\nRuns ${getQualityChecksDescription(answers)} in sequence.`,
  );

  // Deep project structure
  sections.push(`## Project Structure\n\n${getProjectStructure(answers)}`);

  // Common Tasks (new section)
  sections.push(`## Common Tasks\n\n${getCommonTasks(answers)}`);

  sections.push(`## Tools\n\n${getToolsSection(answers)}`);

  // Mode-contextualized tool playbooks
  sections.push(`## Tool Playbooks\n\n${getToolPlaybooks(answers)}`);

  sections.push(`## Scripts Reference\n\n${getScriptsTable(answers)}`);

  return sections.join('\n\n---\n\n') + '\n';
}

export async function writeReadme(answers, cwd) {
  const readmePath = path.join(cwd, 'README.md');
  if (await fs.pathExists(readmePath)) {
    return false;
  }

  const readmeAnswers = { ...answers };

  const pkgPath = path.join(cwd, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    readmeAnswers._pkgName = pkg.name || 'my-project';
    readmeAnswers._scripts = pkg.scripts ?? {};
  }

  const envPath = path.join(cwd, '.env.example');
  if (await fs.pathExists(envPath)) {
    readmeAnswers._envExample = await fs.readFile(envPath, 'utf-8');
  }

  const content = generateReadme(readmeAnswers);
  await fs.writeFile(readmePath, content);
  return true;
}

async function renderReadmeInTerminal(readmePath) {
  const renderers = [
    { command: 'glow', args: [readmePath] },
    { command: 'mdcat', args: [readmePath] },
    { command: 'bat', args: ['--paging=never', '--style=plain', '--language=markdown', readmePath] },
  ];

  for (const renderer of renderers) {
    try {
      await execa(renderer.command, renderer.args, { stdio: 'inherit' });
      return renderer.command;
    } catch {
      // Try next renderer.
    }
  }

  return null;
}

export async function offerReadmePreview(cwd) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return;

  const readmePath = path.join(cwd, 'README.md');
  if (!(await fs.pathExists(readmePath))) return;

  const { showReadme } = await prompt([
    {
      type: 'confirm',
      name: 'showReadme',
      message: 'Do you want to preview README.md in the terminal now?',
      default: true,
    },
  ]);

  if (!showReadme) return;

  console.log(pc.cyan('\n📘 README.md preview\n'));
  const renderer = await renderReadmeInTerminal(readmePath);

  if (renderer) {
    console.log(pc.dim(`\n(rendered with ${renderer})\n`));
    return;
  }

  // Fallback: raw output with install hint
  const content = await fs.readFile(readmePath, 'utf-8');
  console.log(content);
  console.log(pc.dim('\nTip: install glow for a richer README preview.\n'));
}
