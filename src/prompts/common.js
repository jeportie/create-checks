import { execa } from 'execa';

import { prompt } from '../utils/prompt.js';
import { askCicdQuestions } from './cicd.js';
import { askPlaywrightQuestion } from './playwright.js';
import { askAgentCrewQuestion } from './agentCrew.js';

export async function askCommonQuestions(projectType) {
  let linter = ['biome', 'oxlint'].includes(process.env.LINTER) ? process.env.LINTER : 'eslint';
  if (!process.env.LINTER && process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'list',
        name: 'linter',
        message: 'Linter & formatter?',
        choices: [
          { name: 'ESLint + Prettier', value: 'eslint' },
          { name: 'Biome', value: 'biome' },
          { name: 'oxlint + oxfmt (fast, Rust)', value: 'oxlint' },
        ],
        default: 'eslint',
      },
    ]);
    linter = result.linter;
  }

  let lintOption = [];
  if (process.env.LINT_OPTIONS) {
    lintOption = process.env.LINT_OPTIONS.split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  } else if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'checkbox',
        name: 'lintOption',
        message: 'Select more lint options',
        choices: ['cspell', 'secretlint', 'commitlint'],
      },
    ]);
    lintOption = result.lintOption;
  }

  let vitestPreset = process.env.VITEST_PRESET;
  if (projectType === 'app' || projectType === 'electron') {
    vitestPreset = undefined;
  } else if (!vitestPreset && process.stdin.isTTY) {
    const { setupVitest } = await prompt([
      {
        type: 'confirm',
        name: 'setupVitest',
        message: 'Do you want to set up Vitest for testing?',
        default: true,
      },
    ]);

    if (setupVitest) {
      const { preset } = await prompt([
        {
          type: 'list',
          name: 'preset',
          message: 'Which Vitest configuration would you like?',
          choices: [
            { name: 'Native — vitest', value: 'native' },
            { name: 'Coverage — vitest + @vitest/coverage-v8', value: 'coverage' },
          ],
        },
      ]);
      vitestPreset = preset;
    }
  }

  const { setupPlaywright } = await askPlaywrightQuestion(projectType);
  const { includeAgentCrew } = await askAgentCrewQuestion();

  let setupPrecommit = true;
  let precommitTool = 'husky';
  const sp = process.env.SETUP_PRECOMMIT;
  if (sp === '0') {
    setupPrecommit = false;
  } else if (sp === 'hk') {
    precommitTool = 'hk';
  } else if (sp === '1' || sp === 'husky') {
    precommitTool = 'husky';
  } else if (sp === undefined && process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'list',
        name: 'precommit',
        message: 'Pre-commit hooks?',
        choices: [
          { name: 'Husky + lint-staged', value: 'husky' },
          { name: 'hk (Ledger-style, needs mise)', value: 'hk' },
          { name: 'None', value: 'none' },
        ],
        default: 'husky',
      },
    ]);
    if (result.precommit === 'none') setupPrecommit = false;
    else precommitTool = result.precommit;
  }

  const cicdAnswers = await askCicdQuestions(projectType);

  let authorName = '';
  if (process.env.AUTHOR_NAME !== undefined) {
    authorName = process.env.AUTHOR_NAME;
  } else {
    try {
      const { stdout } = await execa('git', ['config', 'github.user']);
      authorName = stdout.trim();
    } catch {
      // github.user not set
    }

    if (!authorName) {
      try {
        const { stdout } = await execa('git', ['config', 'user.name']);
        authorName = stdout.trim();
      } catch {
        // git not available or user.name not set
      }
    }

    if (!authorName && process.stdin.isTTY) {
      const result = await prompt([
        {
          type: 'input',
          name: 'authorName',
          message: 'Your name (added to package.json and spell checker):',
        },
      ]);
      authorName = result.authorName.trim();
    }
  }

  const secretValues = {};
  let captureSecrets = false;
  const projectTypesWithEnvFiles = ['backend', 'cli', 'app'];

  if (projectTypesWithEnvFiles.includes(projectType)) {
    if (process.env.SECRET_CAPTURE === '1') {
      captureSecrets = true;
    } else if (process.env.SECRET_CAPTURE === '0') {
      captureSecrets = false;
    } else if (process.stdin.isTTY) {
      const result = await prompt([
        {
          type: 'confirm',
          name: 'captureSecrets',
          message: 'Capture starter secrets and bootstrap .env files?',
          default: true,
        },
      ]);
      captureSecrets = result.captureSecrets;
    }

    if (captureSecrets) {
      if (process.env.SECRET_DATABASE_URL !== undefined) {
        secretValues.DATABASE_URL = process.env.SECRET_DATABASE_URL;
      }
      if (process.env.SECRET_REDIS_URL !== undefined) {
        secretValues.REDIS_URL = process.env.SECRET_REDIS_URL;
      }
      if (process.env.SECRET_APP_SECRET !== undefined) {
        secretValues.APP_SECRET = process.env.SECRET_APP_SECRET;
      }
    }
  }

  return {
    linter,
    lintOption,
    vitestPreset,
    setupPlaywright,
    includeAgentCrew,
    ...cicdAnswers,
    setupPrecommit,
    precommitTool,
    authorName,
    captureSecrets,
    secretValues,
  };
}
