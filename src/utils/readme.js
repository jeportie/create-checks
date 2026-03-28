import fs from 'fs-extra';
import { execa } from 'execa';
import path from 'node:path';
import pc from 'picocolors';

import { prompt } from './prompt.js';

function codeBlock(language, content) {
  return `\`\`\`${language}\n${content}\n\`\`\``;
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
      lines.push('Makefile           # Docker convenience targets: make docker-up, make docker-down');
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

Use npm scripts or Make targets so both \`docker compose\` and \`docker-compose\` environments are supported.

${codeBlock('bash', 'npm run docker:up\nmake docker-up')}`,
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

Or use Make targets: \`make docker-up\`, \`make docker-down\`.`);
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
  const { projectType, cliFramework, backendFramework } = answers;

  const sourceHint = {
    frontend: '`src/App.tsx`, `src/Welcome.tsx`, and related components',
    backend: '`src/index.ts` for routes and `src/env.ts` for environment validation',
    cli: '`src/index.ts` and `src/commands/` for command handlers',
    'npm-lib': '`src/main.ts` and exported modules',
    app: '`src/screens/`, `src/navigation/`, and reusable components',
  };

  const testHint = {
    frontend: '`tests/unit/` and `tests/integration/`',
    backend: '`tests/unit/server.unit.test.ts` and focused route tests',
    cli: '`tests/unit/hello.unit.test.ts` plus command-specific tests',
    'npm-lib': '`test/main.test.ts` (or `tests/`) for API behavior',
    app: '`tests/unit/` for Jest and `tests/e2e/` for Detox',
  };

  const sections = [
    '1. **Start with one feature slice**: pick one user-facing capability and implement it end-to-end before moving on.',
    `2. **Write code where it belongs**: keep implementation in ${sourceHint[projectType] || '`src/`'}.`,
    `3. **Pair code with tests immediately**: add or update tests in ${testHint[projectType] || '`tests/`'} for every behavior change.`,
    '4. **Run fast feedback loops**: use framework-specific dev commands while coding and keep functions small and composable.',
    `5. **Run the full quality gate before commit**:\n\n${codeBlock('bash', 'npm run check')}`,
  ];

  if (projectType === 'cli' && cliFramework === 'commander') {
    sections.push(`### CLI Tutorial: add a command with Commander.js

Use this pattern when adding a new command with flags and arguments:

${codeBlock(
  'ts',
  "program\n  .command('release')\n  .description('Build and print release notes')\n  .option('-d, --dry-run', 'Preview without publishing')\n  .action((options) => {\n    if (options.dryRun) {\n      console.log('Dry run release');\n      return;\n    }\n    console.log('Release started');\n  });",
)}`);
  }

  if (projectType === 'backend') {
    const backendTutorial = {
      hono: "app.get('/health', (c) => c.json({ ok: true }));",
      fastify: "app.get('/health', async () => ({ ok: true }));",
      express: "app.get('/health', (_req, res) => res.json({ ok: true }));",
      elysia: "app.get('/health', () => ({ ok: true }));",
    };
    sections.push(`### Backend Tutorial: add a health endpoint

${codeBlock('ts', backendTutorial[backendFramework] || backendTutorial.hono)}

After adding the endpoint, validate runtime config in src/env.ts and add a unit test for the route response.`);
  }

  if (projectType === 'frontend') {
    sections.push(`### Frontend Tutorial: build with isolated components

Create focused UI components, then integrate them in src/App.tsx:

${codeBlock(
  'tsx',
  "export function StatusBadge({ online }: { online: boolean }) {\n  return <span>{online ? 'Online' : 'Offline'}</span>;\n}",
)}`);
  }

  if (projectType === 'npm-lib') {
    sections.push(`### Library Tutorial: evolve public API safely

Keep implementation private and export only stable APIs from your entrypoint:

${codeBlock('ts', "export function createSlug(input: string): string {\n  return input.trim().toLowerCase().replace(/\\s+/g, '-');\n}")}`);
  }

  if (projectType === 'app') {
    sections.push(`### Mobile Tutorial: screen-first feature delivery

Start from one screen in src/screens/, wire it in src/navigation/index.tsx, then add a unit test for screen behavior before adding Detox coverage.`);
  }

  return sections.join('\n\n');
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
  } = answers;
  const rows = [];

  rows.push('| Script | Description |');
  rows.push('| --- | --- |');
  rows.push('| `npm run check` | Run all quality checks |');
  rows.push('| `npm run format` | Format code with Prettier |');
  rows.push('| `npm run lint` | Lint with ESLint |');
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

  const pkgPath = path.join(cwd, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    answers._pkgName = pkg.name || 'my-project';
  }

  const content = generateReadme(answers);
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
  console.log(pc.dim('\nTip: install glow for a better preview → https://github.com/charmbracelet/glow\n'));
}
