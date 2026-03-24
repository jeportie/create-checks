import { execa } from 'execa';

import { prompt } from '../utils/prompt.js';
import { askPlaywrightQuestion } from './playwright.js';

export async function askCommonQuestions(projectType) {
  let lintOption = [];
  if (process.stdin.isTTY) {
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
  if (projectType === 'app') {
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

  let setupPrecommit = true;
  if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'confirm',
        name: 'setupPrecommit',
        message: 'Do you want to set up pre-commit hook (husky + lint-staged)?',
        default: true,
      },
    ]);
    setupPrecommit = result.setupPrecommit;
  }

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

  return {
    lintOption,
    vitestPreset,
    setupPlaywright,
    setupPrecommit,
    authorName,
  };
}
