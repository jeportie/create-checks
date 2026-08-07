import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { generateCommon } from '../../src/generators/common.js';

function createTmpProject(name) {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-cspell-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version: '1.0.0' }, null, 2));
  return dir;
}

describe('cspell generation', () => {
  const previousNoInstall = process.env.NO_INSTALL;
  let tmpDir;

  afterEach(() => {
    process.env.NO_INSTALL = previousNoInstall;
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it.each(['npm-lib', 'cli', 'backend', 'frontend', 'app'])(
    'adds "tskickstart" to cspell words for %s projects',
    async (projectType) => {
      tmpDir = createTmpProject(`${projectType}-test-project`);
      process.env.NO_INSTALL = '1';

      const answers = {
        projectType,
        lintOption: ['cspell'],
        setupPrecommit: false,
        authorName: 'Test Author',
      };

      if (projectType === 'npm-lib') {
        answers.setupSemanticRelease = false;
      }
      if (projectType === 'cli') {
        answers.cliFramework = 'commander';
      }
      if (projectType === 'backend') {
        answers.backendFramework = 'hono';
      }
      if (projectType === 'app') {
        answers.setupAppJest = true;
        answers.setupAppDetox = true;
      }

      await generateCommon(answers, tmpDir);

      const cspell = JSON.parse(readFileSync(join(tmpDir, 'cspell.json'), 'utf-8'));
      expect(cspell.words).toContain('tskickstart');
      expect(cspell.words.filter((word) => word === 'tskickstart')).toHaveLength(1);

      const readme = readFileSync(join(tmpDir, 'README.md'), 'utf-8');
      expect(readme).toContain('tskickstart');
    },
  );

  it('adds Elysia words when backend framework is elysia', async () => {
    tmpDir = createTmpProject('elysia-test-project');
    process.env.NO_INSTALL = '1';

    await generateCommon(
      {
        projectType: 'backend',
        backendFramework: 'elysia',
        lintOption: ['cspell'],
        setupPrecommit: false,
        authorName: 'Test Author',
      },
      tmpDir,
    );

    const cspell = JSON.parse(readFileSync(join(tmpDir, 'cspell.json'), 'utf-8'));
    expect(cspell.words).toContain('elysia');
    expect(cspell.words).toContain('Elysia');
  });

  it('adds app-specific words and ignores dist output', async () => {
    tmpDir = createTmpProject('app-test-project');
    process.env.NO_INSTALL = '1';

    await generateCommon(
      {
        projectType: 'app',
        lintOption: ['cspell'],
        setupPrecommit: false,
        authorName: 'Test Author',
        setupAppJest: true,
        setupAppDetox: true,
      },
      tmpDir,
    );

    const cspell = JSON.parse(readFileSync(join(tmpDir, 'cspell.json'), 'utf-8'));
    expect(cspell.words).toContain('react');
    expect(cspell.words).toContain('react-native');
    expect(cspell.words).toContain('expo');
    expect(cspell.ignorePaths).toContain('dist/**');
  });

  it('adds backend-specific words for hono framework', async () => {
    tmpDir = createTmpProject('hono-test-project');
    process.env.NO_INSTALL = '1';

    await generateCommon(
      {
        projectType: 'backend',
        backendFramework: 'hono',
        lintOption: ['cspell'],
        setupPrecommit: false,
        authorName: 'Test Author',
      },
      tmpDir,
    );

    const cspell = JSON.parse(readFileSync(join(tmpDir, 'cspell.json'), 'utf-8'));
    expect(cspell.words).toContain('middlewares');
    expect(cspell.words).toContain('Hono');
    expect(cspell.words).toContain('composable');
  });

  it('adds cli-specific words for commander framework', async () => {
    tmpDir = createTmpProject('cli-test-project');
    process.env.NO_INSTALL = '1';

    await generateCommon(
      {
        projectType: 'cli',
        cliFramework: 'commander',
        lintOption: ['cspell'],
        setupPrecommit: false,
        authorName: 'Test Author',
      },
      tmpDir,
    );

    const cspell = JSON.parse(readFileSync(join(tmpDir, 'cspell.json'), 'utf-8'));
    expect(cspell.words).toContain('shebang');
    expect(cspell.words).toContain('subcommands');
  });

  it('adds frontend-specific words', async () => {
    tmpDir = createTmpProject('frontend-test-project');
    process.env.NO_INSTALL = '1';

    await generateCommon(
      {
        projectType: 'frontend',
        lintOption: ['cspell'],
        setupPrecommit: false,
        authorName: 'Test Author',
      },
      tmpDir,
    );

    const cspell = JSON.parse(readFileSync(join(tmpDir, 'cspell.json'), 'utf-8'));
    expect(cspell.words).toContain('tailwindcss');
    expect(cspell.words).toContain('Tailwind');
  });

  it('ignores pnpm-lock.yaml for npm-lib projects using pnpm', async () => {
    tmpDir = createTmpProject('pnpm-lib-test-project');
    process.env.NO_INSTALL = '1';

    await generateCommon(
      {
        projectType: 'npm-lib',
        packageManager: 'pnpm',
        setupSemanticRelease: false,
        lintOption: ['cspell'],
        setupPrecommit: false,
        authorName: 'Test Author',
      },
      tmpDir,
    );

    const cspell = JSON.parse(readFileSync(join(tmpDir, 'cspell.json'), 'utf-8'));
    expect(cspell.ignorePaths).toContain('pnpm-lock.yaml');
    expect(cspell.ignorePaths).toContain('package-lock.json');
  });

  it('adds dist ignore path to existing cspell config', async () => {
    tmpDir = createTmpProject('existing-cspell-project');
    process.env.NO_INSTALL = '1';

    writeFileSync(
      join(tmpDir, 'cspell.json'),
      JSON.stringify({ version: '0.2', words: ['hello'], ignorePaths: ['node_modules/**'] }, null, 2),
    );

    await generateCommon(
      {
        projectType: 'app',
        lintOption: ['cspell'],
        setupPrecommit: false,
        authorName: 'Test Author',
        setupAppJest: true,
        setupAppDetox: true,
      },
      tmpDir,
    );

    const cspell = JSON.parse(readFileSync(join(tmpDir, 'cspell.json'), 'utf-8'));
    expect(cspell.ignorePaths).toContain('dist/**');
    expect(cspell.words).toContain('hello');
  });
});
