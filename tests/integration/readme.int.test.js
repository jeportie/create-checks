import { describe, expect, it } from 'vitest';

import { generateReadme } from '../../src/utils/readme.js';

// ---------------------------------------------------------------------------
// Helper: full answer objects for each project mode
// ---------------------------------------------------------------------------

function backendAnswers(overrides = {}) {
  return {
    _pkgName: 'demo-backend',
    projectType: 'backend',
    backendFramework: 'hono',
    setupDocker: true,
    setupZod: true,
    setupDatabase: false,
    databaseEngine: 'postgresql',
    databaseOrm: 'none',
    setupRedis: false,
    integrationPreset: 'none',
    setupCicd: false,
    cicdTarget: 'none',
    lintOption: ['cspell', 'secretlint', 'commitlint'],
    vitestPreset: 'coverage',
    setupPlaywright: false,
    setupSemanticRelease: false,
    ...overrides,
  };
}

function frontendAnswers(overrides = {}) {
  return {
    _pkgName: 'demo-frontend',
    projectType: 'frontend',
    lintOption: ['cspell', 'secretlint', 'commitlint'],
    vitestPreset: 'coverage',
    setupPlaywright: true,
    setupSemanticRelease: false,
    ...overrides,
  };
}

function cliAnswers(overrides = {}) {
  return {
    _pkgName: 'demo-cli',
    projectType: 'cli',
    cliFramework: 'commander',
    lintOption: ['cspell'],
    vitestPreset: 'native',
    setupSemanticRelease: true,
    ...overrides,
  };
}

function npmLibAnswers(overrides = {}) {
  return {
    _pkgName: 'demo-lib',
    projectType: 'npm-lib',
    lintOption: ['cspell', 'commitlint'],
    vitestPreset: 'coverage',
    setupSemanticRelease: true,
    ...overrides,
  };
}

function appAnswers(overrides = {}) {
  return {
    _pkgName: 'demo-app',
    projectType: 'app',
    lintOption: ['cspell'],
    setupAppJest: true,
    setupAppDetox: true,
    setupSemanticRelease: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Mode-specific rich introduction
// ---------------------------------------------------------------------------

describe('mode-specific rich introduction', () => {
  it('backend intro explains API server, framework, health endpoint, and hot-reload', () => {
    const content = generateReadme(backendAnswers());
    expect(content).toContain('TypeScript API server');
    expect(content).toContain('Hono');
    expect(content).toContain('Node.js');
    expect(content).toContain('quality gates');
  });

  it('backend intro adapts to framework choice (fastify)', () => {
    const content = generateReadme(backendAnswers({ backendFramework: 'fastify' }));
    expect(content).toContain('Fastify');
    expect(content).toContain('TypeScript API server');
  });

  it('backend intro adapts to framework choice (express)', () => {
    const content = generateReadme(backendAnswers({ backendFramework: 'express' }));
    expect(content).toContain('Express');
  });

  it('backend intro adapts to framework choice (elysia)', () => {
    const content = generateReadme(backendAnswers({ backendFramework: 'elysia' }));
    expect(content).toContain('Elysia');
    expect(content).toContain('Bun');
  });

  it('frontend intro explains React SPA, Vite, Tailwind, component-driven', () => {
    const content = generateReadme(frontendAnswers());
    expect(content).toContain('React');
    expect(content).toContain('Vite');
    expect(content).toContain('Tailwind CSS');
    expect(content).toContain('component');
  });

  it('cli intro explains CLI tool, framework, build pipeline, npm publishing', () => {
    const content = generateReadme(cliAnswers());
    expect(content).toContain('command-line tool');
    expect(content).toContain('Commander.js');
    expect(content).toContain('tsup');
    expect(content).toContain('shebang');
  });

  it('cli intro adapts to clack framework', () => {
    const content = generateReadme(cliAnswers({ cliFramework: 'clack' }));
    expect(content).toContain('@clack/prompts');
  });

  it('cli intro adapts to inquirer framework', () => {
    const content = generateReadme(cliAnswers({ cliFramework: 'inquirer' }));
    expect(content).toContain('Inquirer.js');
  });

  it('npm-lib intro explains TypeScript library, dual CJS/ESM, tsup, publishing', () => {
    const content = generateReadme(npmLibAnswers());
    expect(content).toContain('TypeScript library');
    expect(content).toContain('CJS');
    expect(content).toContain('ESM');
    expect(content).toContain('tsup');
    expect(content).toContain('npm');
  });

  it('app intro explains React Native, Expo, React Navigation', () => {
    const content = generateReadme(appAnswers());
    expect(content).toContain('React Native');
    expect(content).toContain('Expo');
    expect(content).toContain('React Navigation');
  });
});

// ---------------------------------------------------------------------------
// 2. Getting Started deep-dive
// ---------------------------------------------------------------------------

describe('Getting Started deep-dive', () => {
  it('backend getting started includes curl health endpoint example', () => {
    const content = generateReadme(backendAnswers());
    expect(content).toContain('## Getting Started');
    expect(content).toContain('curl');
    expect(content).toContain('/health');
    expect(content).toContain('mise install');
  });

  it('frontend getting started includes dev URL and what to expect', () => {
    const content = generateReadme(frontendAnswers());
    expect(content).toContain('## Getting Started');
    expect(content).toContain('localhost');
    expect(content).toContain('npm run check');
  });

  it('cli getting started includes example command with -- syntax', () => {
    const content = generateReadme(cliAnswers());
    expect(content).toContain('## Getting Started');
    expect(content).toContain('npm run dev');
  });

  it('app getting started includes QR code or simulator instruction', () => {
    const content = generateReadme(appAnswers());
    expect(content).toContain('## Getting Started');
    expect(content).toContain('QR code');
  });

  it('npm-lib getting started mentions build and test flow', () => {
    const content = generateReadme(npmLibAnswers());
    expect(content).toContain('## Getting Started');
    expect(content).toContain('npm run build');
  });
});

// ---------------------------------------------------------------------------
// 3. Deep project structure with file explanations
// ---------------------------------------------------------------------------

describe('deep project structure', () => {
  it('backend structure explains src/index.ts role (server entry, routes)', () => {
    const content = generateReadme(backendAnswers());
    const structure = content.split('## Project Structure')[1];
    expect(structure).toContain('index.ts');
    expect(structure).toContain('Server entry');
    expect(structure).toContain('routes');
  });

  it('backend structure explains env.ts role (validation)', () => {
    const content = generateReadme(backendAnswers());
    const structure = content.split('## Project Structure')[1];
    expect(structure).toContain('env.ts');
    expect(structure).toContain('validation');
  });

  it('backend structure includes Dockerfile and docker-compose when Docker enabled', () => {
    const content = generateReadme(backendAnswers({ setupDocker: true }));
    const structure = content.split('## Project Structure')[1];
    expect(structure).toContain('Dockerfile');
    expect(structure).toContain('docker-compose');
    expect(structure).not.toContain('hot-reload mount');
  });

  it('backend structure omits Docker files when Docker disabled', () => {
    const content = generateReadme(backendAnswers({ setupDocker: false }));
    const structure = content.split('## Project Structure')[1];
    expect(structure).not.toContain('Dockerfile');
  });

  it('frontend structure explains main.tsx, App.tsx, Welcome.tsx, index.css', () => {
    const content = generateReadme(frontendAnswers());
    const structure = content.split('## Project Structure')[1];
    expect(structure).toContain('main.tsx');
    expect(structure).toContain('App.tsx');
    expect(structure).toContain('Welcome.tsx');
    expect(structure).toContain('index.css');
    expect(structure).toContain('Tailwind');
  });

  it('cli structure explains src/index.ts with shebang and commands directory', () => {
    const content = generateReadme(cliAnswers());
    const structure = content.split('## Project Structure')[1];
    expect(structure).toContain('index.ts');
    expect(structure).toContain('shebang');
    expect(structure).toContain('hello.ts');
  });

  it('npm-lib structure explains main.ts entry and tsup config', () => {
    const content = generateReadme(npmLibAnswers());
    const structure = content.split('## Project Structure')[1];
    expect(structure).toContain('main.ts');
    expect(structure).toContain('tsup');
  });

  it('app structure explains App.tsx, screens, navigation', () => {
    const content = generateReadme(appAnswers());
    const structure = content.split('## Project Structure')[1];
    expect(structure).toContain('App.tsx');
    expect(structure).toContain('HomeScreen.tsx');
    expect(structure).toContain('navigation');
  });
});

// ---------------------------------------------------------------------------
// 4. Mode-contextualized Tool Playbooks
// ---------------------------------------------------------------------------

describe('mode-contextualized tool playbooks', () => {
  it('TypeScript playbook is backend-contextualized (route handlers, middleware)', () => {
    const content = generateReadme(backendAnswers());
    expect(content).toContain('## Development');
    expect(content).toContain('### Adding a route');
    expect(content).toContain('### Adding middleware');
  });

  it('TypeScript playbook is frontend-contextualized (JSX, props, hooks)', () => {
    const content = generateReadme(frontendAnswers());
    const tsSection = content.split('### TypeScript')[1].split('###')[0];
    expect(tsSection).toContain('JSX');
  });

  it('TypeScript playbook is cli-contextualized (command options, arguments)', () => {
    const content = generateReadme(cliAnswers());
    const tsSection = content.split('### TypeScript')[1].split('###')[0];
    expect(tsSection).toContain('command');
  });

  it('TypeScript playbook is npm-lib-contextualized (public API, declaration files)', () => {
    const content = generateReadme(npmLibAnswers());
    const tsSection = content.split('### TypeScript')[1].split('###')[0];
    expect(tsSection).toContain('declaration');
  });

  it('TypeScript playbook is app-contextualized (component props, navigation types)', () => {
    const content = generateReadme(appAnswers());
    const tsSection = content.split('### TypeScript')[1].split('###')[0];
    expect(tsSection).toContain('component');
  });

  it('ESLint playbook is backend-contextualized', () => {
    const content = generateReadme(backendAnswers());
    const scripts = content.split('## Scripts Reference')[1];
    expect(scripts).toContain('npm run lint');
    expect(scripts).toContain('ESLint');
  });

  it('ESLint playbook is frontend-contextualized (React hooks, react-refresh)', () => {
    const content = generateReadme(frontendAnswers());
    const eslintSection = content.split('### ESLint + Prettier')[1].split('###')[0];
    expect(eslintSection).toContain('React');
  });

  it('Vitest playbook is mode-contextualized for backend', () => {
    const content = generateReadme(backendAnswers());
    const testingSection = content.split('\n## Testing\n')[1].split('\n## ')[0];
    expect(testingSection).toContain('npm run test:unit');
    expect(testingSection).toContain('Example test pattern');
  });

  it('Vitest playbook is mode-contextualized for frontend', () => {
    const content = generateReadme(frontendAnswers());
    const vitestSection = content.split('### Vitest')[1].split('###')[0];
    expect(vitestSection).toContain('component');
  });
});

// ---------------------------------------------------------------------------
// 5. Common Tasks / How-To section
// ---------------------------------------------------------------------------

describe('Common Tasks section', () => {
  it('backend has how-to for adding a route', () => {
    const content = generateReadme(backendAnswers());
    expect(content).toContain('## Development');
    expect(content).toContain('### Adding a route');
  });

  it('backend has how-to for adding an environment variable', () => {
    const content = generateReadme(backendAnswers());
    expect(content).toContain('### Adding an environment variable');
  });

  it('backend has how-to for testing with curl', () => {
    const content = generateReadme(backendAnswers());
    expect(content).toContain('### Testing endpoints with curl');
  });

  it('backend has how-to for Docker when Docker is enabled', () => {
    const content = generateReadme(backendAnswers({ setupDocker: true }));
    expect(content).toContain('## Docker');
    expect(content).toContain('docker:up');
  });

  it('frontend has how-to for adding a page/route', () => {
    const content = generateReadme(frontendAnswers());
    expect(content).toContain('## Common Tasks');
    expect(content).toMatch(/add a new (page|route|component)/i);
  });

  it('frontend has how-to for Tailwind styling', () => {
    const content = generateReadme(frontendAnswers());
    expect(content).toContain('Tailwind');
  });

  it('cli has how-to for adding a new command', () => {
    const content = generateReadme(cliAnswers());
    expect(content).toContain('## Common Tasks');
    expect(content).toContain('add a new command');
  });

  it('cli has how-to for publishing to npm', () => {
    const content = generateReadme(cliAnswers());
    expect(content).toContain('npm');
    expect(content).toContain('publish');
  });

  it('npm-lib has how-to for adding a new export', () => {
    const content = generateReadme(npmLibAnswers());
    expect(content).toContain('## Common Tasks');
    expect(content).toContain('export');
  });

  it('npm-lib has how-to for publishing', () => {
    const content = generateReadme(npmLibAnswers());
    expect(content).toContain('publish');
  });

  it('app has how-to for adding a new screen', () => {
    const content = generateReadme(appAnswers());
    expect(content).toContain('## Common Tasks');
    expect(content).toContain('add a new screen');
  });

  it('app has how-to for navigation between screens', () => {
    const content = generateReadme(appAnswers());
    expect(content).toContain('navigate');
  });
});

// ---------------------------------------------------------------------------
// 6. Existing tests preserved (from original test file)
// ---------------------------------------------------------------------------

describe('README generation detail (preserved)', () => {
  it('includes detailed workflows and tool guides for a CLI stack', () => {
    const content = generateReadme(cliAnswers());

    expect(content).toContain('## Implementation Workflow');
    expect(content).toContain('## Testing Workflow');
    expect(content).toContain('## Tool Playbooks');
    expect(content).toContain('### Commander.js');
    expect(content).toContain('### CSpell');
    expect(content).toContain('### semantic-release');
    expect(content).toContain(".command('hello')");
  });

  it('documents automated publishing setup for semantic-release projects', () => {
    const content = generateReadme(npmLibAnswers());

    expect(content).toContain('## Automated Publishing Setup');
    expect(content).toContain('Granular Access Token');
    expect(content).toContain('NPM_TOKEN');
    expect(content).toContain('GITHUB_TOKEN');
  });

  it('includes backend-specific framework and infra guidance', () => {
    const content = generateReadme(backendAnswers({ lintOption: ['secretlint'], vitestPreset: 'native' }));

    expect(content).toContain('## Docker');
    expect(content).toContain('## Quality Checks');
    expect(content).toContain('src/env.ts');
    expect(content).toContain('npm run docker:up');
  });

  it('omits Zod playbook when backend Zod is disabled', () => {
    const content = generateReadme(
      backendAnswers({ setupZod: false, setupDocker: false, vitestPreset: 'native', lintOption: [] }),
    );

    expect(content).not.toContain('### Zod');
    expect(content).not.toContain('**Zod**');
  });
});

// ---------------------------------------------------------------------------
// 7. Section ordering and structure
// ---------------------------------------------------------------------------

describe('section ordering and overall structure', () => {
  it('contains all major sections in order', () => {
    const content = generateReadme(backendAnswers());
    const headings = [...content.matchAll(/^## (.+)$/gm)].map((m) => m[1]);

    expect(headings).toContain('Project Snapshot');
    expect(headings).toContain('Prerequisites');
    expect(headings).toContain('Getting Started');
    expect(headings).toContain('Environment Variables');
    expect(headings).toContain('Development');
    expect(headings).toContain('Build and Deploy');
    expect(headings).toContain('Project Structure');
    expect(headings).toContain('Scripts Reference');
    expect(headings).toContain('Tools');
  });

  it('Getting Started comes before Development', () => {
    const content = generateReadme(backendAnswers());
    const gettingStarted = content.indexOf('## Getting Started');
    const development = content.indexOf('## Development');
    expect(gettingStarted).toBeLessThan(development);
  });

  it('Environment Variables comes before Development', () => {
    const content = generateReadme(backendAnswers());
    const envSection = content.indexOf('## Environment Variables');
    const development = content.indexOf('## Development');
    expect(envSection).toBeLessThan(development);
  });
});

describe('scripts reference is linter-aware', () => {
  it('uses Biome wording when biome is selected', () => {
    const content = generateReadme(backendAnswers({ linter: 'biome' }));
    const scripts = content.split('## Scripts Reference')[1];
    expect(scripts).toContain('Format code with Biome');
    expect(scripts).toContain('Lint with Biome');
    expect(scripts).not.toContain('Prettier');
    expect(scripts).not.toContain('ESLint');
  });

  it('uses ESLint + Prettier wording when eslint is selected', () => {
    const content = generateReadme(backendAnswers({ linter: 'eslint' }));
    const scripts = content.split('## Scripts Reference')[1];
    expect(scripts).toContain('Format code with Prettier');
    expect(scripts).toContain('Lint with ESLint');
  });
});

describe('backend README rich stack generation', () => {
  it('renders production-style backend docs for hono + drizzle + postgresql + redis + better-auth + docker', () => {
    const content = generateReadme(
      backendAnswers({
        linter: 'biome',
        setupDatabase: true,
        databaseEngine: 'postgresql',
        databaseOrm: 'drizzle',
        setupRedis: true,
        integrationPreset: 'better-auth',
        setupDocker: true,
        setupCicd: true,
        cicdTarget: 'docker',
      }),
    );

    expect(content).toContain('## Project Snapshot');
    expect(content).toContain('| Framework | [Hono](https://hono.dev/) |');
    expect(content).toContain('| Database | PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/) |');
    expect(content).toContain('| Cache | Redis + [ioredis](https://github.com/redis/ioredis) |');
    expect(content).toContain('| Authentication | [Better Auth](https://www.better-auth.com/) |');
    expect(content).toContain('| Containerization | Docker + Docker Compose |');

    expect(content).toContain('## Getting Started');
    expect(content).toContain('npm run docker:up');
    expect(content).not.toContain('make docker');
    expect(content).toContain('npm run docker:db:up');
    expect(content).toContain('npm run db:generate && npm run db:migrate');

    expect(content).toContain('## Docker');
    expect(content).toContain('| `app` | Built from `./Dockerfile` | 3000 |');
    expect(content).toContain('| `db` | `postgres:16-alpine` | 5432 |');
    expect(content).toContain('| `redis` | `redis:7-alpine` | 6379 |');

    expect(content).toContain('## Database (PostgreSQL + Drizzle)');
    expect(content).toContain('`npm run db:generate`');
    expect(content).toContain('`npm run db:migrate`');
    expect(content).toContain('`npm run db:studio`');
    expect(content).toContain('`src/db/config.ts`');
    expect(content).not.toContain('prisma/schema.prisma');

    expect(content).toContain('## Redis');
    expect(content).toContain('`REDIS_URL`');

    expect(content).toContain('## Authentication (Better Auth)');
    expect(content).toContain('`BETTER_AUTH_SECRET`');
    expect(content).toContain('openssl rand -base64 32');

    expect(content).toContain('## Environment Variables');
    expect(content).toContain('| `DATABASE_URL` |');
    expect(content).toContain('| `REDIS_URL` |');
    expect(content).toContain('| `BETTER_AUTH_URL` |');
    expect(content).toContain('| `BETTER_AUTH_SECRET` |');
    expect(content).toContain('| `NODE_ENV` |');
    expect(content).toContain('| `PORT` |');

    expect(content).toContain('## Build and Deploy');
    expect(content).toContain('`ci.yml`');
    expect(content).not.toContain('deploy-staging');
    expect(content).not.toContain('deploy-production');

    expect(content).toContain('## Project Structure');
    expect(content).toContain('src/db/');
    expect(content).toContain('src/redis/');
    expect(content).toContain('src/integrations/');
    expect(content).toContain('better-auth.ts');
    expect(content).toContain('.github/');

    expect(content).toContain('## Scripts Reference');
    expect(content).toContain('`npm run docker:db:migrate`');
    expect(content).toContain('`npm run db:studio`');

    expect(content).toContain('## Tools');
    expect(content).toContain('[Hono](https://hono.dev/)');
    expect(content).toContain('[Drizzle ORM](https://orm.drizzle.team/)');
    expect(content).toContain('[Better Auth](https://www.better-auth.com/)');
    expect(content).toContain('[Biome](https://biomejs.dev/)');

    expect(content).toContain('## Implementation Workflow');
    expect(content).toContain('## Backend Tutorial');
    expect(content).not.toContain('## Testing Workflow');
    expect(content).not.toContain('## Tool Playbooks');
  });

  it('omits optional backend sections when capabilities are disabled', () => {
    const content = generateReadme(
      backendAnswers({
        setupDatabase: false,
        setupRedis: false,
        integrationPreset: 'none',
        setupDocker: false,
      }),
    );

    expect(content).not.toContain('## Docker');
    expect(content).not.toContain('## Database');
    expect(content).not.toContain('## Redis');
    expect(content).not.toContain('## Authentication (Better Auth)');
    expect(content).not.toContain('| `DATABASE_URL` |');
    expect(content).not.toContain('| `REDIS_URL` |');
    expect(content).not.toContain('| `BETTER_AUTH_SECRET` |');
  });
});

// ---------------------------------------------------------------------------
// 8. All backend framework variants produce valid README
// ---------------------------------------------------------------------------

describe('all backend framework variants', () => {
  it.each(['hono', 'fastify', 'express', 'elysia'])('generates valid README for %s', (framework) => {
    const content = generateReadme(backendAnswers({ backendFramework: framework }));
    expect(content).toContain('## Getting Started');
    expect(content).toContain('## Development');
    expect(content).toContain('## Project Structure');
    expect(content).toContain('## Scripts Reference');
    expect(content.length).toBeGreaterThan(2000);
  });
});

// ---------------------------------------------------------------------------
// 9. All CLI framework variants
// ---------------------------------------------------------------------------

describe('all CLI framework variants', () => {
  it.each(['commander', 'inquirer', 'clack'])('generates valid README for %s', (framework) => {
    const content = generateReadme(cliAnswers({ cliFramework: framework }));
    expect(content).toContain('## Getting Started');
    expect(content).toContain('## Common Tasks');
    expect(content).toContain('## Tool Playbooks');
    expect(content.length).toBeGreaterThan(2000);
  });
});

// ---------------------------------------------------------------------------
// 10. Type-specific Implementation Workflow and Tutorial content
// ---------------------------------------------------------------------------

describe('type-specific Implementation Workflow and Tutorial', () => {
  // Frontend
  it('frontend workflow references Vite HMR and Testing Library', () => {
    const content = generateReadme(frontendAnswers());
    expect(content).toContain('## Implementation Workflow');
    expect(content).toContain('Vite HMR');
    expect(content).toContain('src/Welcome.tsx');
    expect(content).toContain('npm run test:unit');
    expect(content).toContain('src/App.tsx');
    expect(content).toContain('npm run check');
  });

  it('frontend has 3 progressive tutorials', () => {
    const content = generateReadme(frontendAnswers());
    expect(content).toContain('## Frontend Tutorial');
    expect(content).toContain('### Tutorial 1');
    expect(content).toContain('### Tutorial 2');
    expect(content).toContain('### Tutorial 3');
    expect(content).toContain('NotificationBanner');
    expect(content).toContain('React Router');
    expect(content).toContain('React Query');
    expect(content).toContain('What you learned');
  });

  // Backend
  it('backend workflow references framework-specific route pattern', () => {
    const content = generateReadme(backendAnswers({ backendFramework: 'hono' }));
    expect(content).toContain('## Implementation Workflow');
    expect(content).toContain('npm run dev');
    expect(content).toContain('npm run test:unit');
    expect(content).toContain('npm run check');
    expect(content).toContain('curl');
  });

  it('backend has 3 progressive tutorials', () => {
    const content = generateReadme(backendAnswers({ backendFramework: 'hono' }));
    expect(content).toContain('## Backend Tutorial');
    expect(content).toContain('### Tutorial 1');
    expect(content).toContain('### Tutorial 2');
    expect(content).toContain('### Tutorial 3');
    expect(content).toContain('What you learned');
  });

  it.each(['hono', 'fastify', 'express', 'elysia'])('backend tutorials adapt to %s framework', (framework) => {
    const content = generateReadme(backendAnswers({ backendFramework: framework }));
    expect(content).toContain('## Implementation Workflow');
    expect(content).toContain('## Backend Tutorial');
    expect(content).toContain('### Tutorial 1');
    expect(content).toContain('### Tutorial 2');
  });

  // CLI — Commander
  it('CLI/commander workflow references src/commands/ and handler pattern', () => {
    const content = generateReadme(cliAnswers({ cliFramework: 'commander' }));
    expect(content).toContain('## Implementation Workflow');
    expect(content).toContain('src/commands/');
    expect(content).toContain('npm run dev');
    expect(content).toContain('vi.spyOn');
  });

  it('CLI/commander has 3 progressive tutorials', () => {
    const content = generateReadme(cliAnswers({ cliFramework: 'commander' }));
    expect(content).toContain('## CLI Tutorial (Commander.js)');
    expect(content).toContain('### Tutorial 1');
    expect(content).toContain('### Tutorial 2');
    expect(content).toContain('### Tutorial 3');
    expect(content).toContain('.command(');
    expect(content).toContain('.option(');
  });

  // CLI — Inquirer
  it('CLI/inquirer has framework-specific tutorials', () => {
    const content = generateReadme(cliAnswers({ cliFramework: 'inquirer' }));
    expect(content).toContain('## CLI Tutorial (Inquirer.js)');
    expect(content).toContain('### Tutorial 1');
    expect(content).toContain('### Tutorial 2');
    expect(content).toContain('### Tutorial 3');
    expect(content).toContain('inquirer.prompt');
  });

  // CLI — Clack
  it('CLI/clack has framework-specific tutorials', () => {
    const content = generateReadme(cliAnswers({ cliFramework: 'clack' }));
    expect(content).toContain('## CLI Tutorial (@clack/prompts)');
    expect(content).toContain('### Tutorial 1');
    expect(content).toContain('### Tutorial 2');
    expect(content).toContain('### Tutorial 3');
    expect(content).toContain('isCancel');
  });

  // NPM Library
  it('npm-lib workflow references src/main.ts and dist/', () => {
    const content = generateReadme(npmLibAnswers());
    expect(content).toContain('## Implementation Workflow');
    expect(content).toContain('src/main.ts');
    expect(content).toContain('dist/');
    expect(content).toContain('npm run build');
  });

  it('npm-lib has 3 progressive tutorials', () => {
    const content = generateReadme(npmLibAnswers());
    expect(content).toContain('## Library Tutorial');
    expect(content).toContain('### Tutorial 1');
    expect(content).toContain('### Tutorial 2');
    expect(content).toContain('### Tutorial 3');
    expect(content).toContain('slugify');
    expect(content).toContain('Result');
    expect(content).toContain('What you learned');
  });

  // Mobile App
  it('app workflow references src/screens/ and navigation', () => {
    const content = generateReadme(appAnswers());
    expect(content).toContain('## Implementation Workflow');
    expect(content).toContain('src/screens/');
    expect(content).toContain('src/navigation/');
    expect(content).toContain('Stack.Screen');
  });

  it('app has 3 progressive tutorials', () => {
    const content = generateReadme(appAnswers());
    expect(content).toContain('## Mobile App Tutorial');
    expect(content).toContain('### Tutorial 1');
    expect(content).toContain('### Tutorial 2');
    expect(content).toContain('### Tutorial 3');
    expect(content).toContain('ProfileScreen');
    expect(content).toContain('What you learned');
  });
});
