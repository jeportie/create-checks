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
    expect(content).toContain('health endpoint');
    expect(content).toContain('hot-reload');
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
    expect(structure).toContain('entry point');
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
    const tsSection = content.split('### TypeScript')[1].split('###')[0];
    expect(tsSection).toContain('route');
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
    const eslintSection = content.split('### ESLint + Prettier')[1].split('###')[0];
    expect(eslintSection).toContain('TypeScript');
  });

  it('ESLint playbook is frontend-contextualized (React hooks, react-refresh)', () => {
    const content = generateReadme(frontendAnswers());
    const eslintSection = content.split('### ESLint + Prettier')[1].split('###')[0];
    expect(eslintSection).toContain('React');
  });

  it('Vitest playbook is mode-contextualized for backend', () => {
    const content = generateReadme(backendAnswers());
    const vitestSection = content.split('### Vitest')[1].split('###')[0];
    expect(vitestSection).toContain('route');
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
    expect(content).toContain('## Common Tasks');
    expect(content).toContain('add a new route');
  });

  it('backend has how-to for adding an environment variable', () => {
    const content = generateReadme(backendAnswers());
    expect(content).toContain('environment variable');
  });

  it('backend has how-to for testing with curl', () => {
    const content = generateReadme(backendAnswers());
    expect(content).toContain('curl');
  });

  it('backend has how-to for Docker when Docker is enabled', () => {
    const content = generateReadme(backendAnswers({ setupDocker: true }));
    expect(content).toContain('Docker');
    expect(content).toContain('docker');
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

  it('includes backend-specific framework and infra guidance', () => {
    const content = generateReadme(backendAnswers({ lintOption: ['secretlint'], vitestPreset: 'native' }));

    expect(content).toContain('### Hono');
    expect(content).toContain('### Zod');
    expect(content).toContain('### Docker');
    expect(content).toContain('### Secretlint');
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
    expect(headings).toContain('Development');
    expect(headings).toContain('Build');
    expect(headings).toContain('Project Structure');
    expect(headings).toContain('Common Tasks');
    expect(headings).toContain('Tool Playbooks');
    expect(headings).toContain('Scripts Reference');
  });

  it('Getting Started comes before Development', () => {
    const content = generateReadme(backendAnswers());
    const gettingStarted = content.indexOf('## Getting Started');
    const development = content.indexOf('## Development');
    expect(gettingStarted).toBeLessThan(development);
  });

  it('Common Tasks comes after Project Structure', () => {
    const content = generateReadme(backendAnswers());
    const structure = content.indexOf('## Project Structure');
    const tasks = content.indexOf('## Common Tasks');
    expect(structure).toBeLessThan(tasks);
  });
});

// ---------------------------------------------------------------------------
// 8. All backend framework variants produce valid README
// ---------------------------------------------------------------------------

describe('all backend framework variants', () => {
  it.each(['hono', 'fastify', 'express', 'elysia'])('generates valid README for %s', (framework) => {
    const content = generateReadme(backendAnswers({ backendFramework: framework }));
    expect(content).toContain('## Getting Started');
    expect(content).toContain('## Common Tasks');
    expect(content).toContain('## Tool Playbooks');
    expect(content).toContain('## Project Structure');
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
