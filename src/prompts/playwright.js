import { prompt } from '../utils/prompt.js';

function fromEnv() {
  if (process.env.PLAYWRIGHT === undefined) return undefined;
  return process.env.PLAYWRIGHT === '1';
}

export async function askPlaywrightQuestion(projectType) {
  if (projectType !== 'frontend' && projectType !== 'fullstack') {
    return { setupPlaywright: false };
  }

  const envChoice = fromEnv();
  if (envChoice !== undefined) {
    return { setupPlaywright: envChoice };
  }

  if (!process.stdin.isTTY) {
    return { setupPlaywright: false };
  }

  const { setupPlaywright } = await prompt([
    {
      type: 'confirm',
      name: 'setupPlaywright',
      message: 'Set up Playwright for E2E testing?',
      default: true,
    },
  ]);

  return { setupPlaywright };
}
