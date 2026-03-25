import { prompt } from '../utils/prompt.js';

export async function askAppQuestions() {
  let expoWorkflow = 'managed';
  if (process.env.EXPO_WORKFLOW) {
    expoWorkflow = process.env.EXPO_WORKFLOW;
  } else if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'list',
        name: 'expoWorkflow',
        message: 'Which Expo workflow?',
        choices: [
          { name: 'Managed — easier setup, Expo handles native code', value: 'managed' },
          { name: 'Bare — full native project access', value: 'bare' },
        ],
      },
    ]);
    expoWorkflow = result.expoWorkflow;
  }

  let setupAppJest = true;
  if (process.env.APP_JEST === '0') {
    setupAppJest = false;
  } else if (process.env.APP_JEST === '1') {
    setupAppJest = true;
  } else if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'confirm',
        name: 'setupAppJest',
        message: 'Set up Jest for unit testing?',
        default: true,
      },
    ]);
    setupAppJest = result.setupAppJest;
  }

  let setupAppDetox = true;
  if (process.env.APP_DETOX === '0') {
    setupAppDetox = false;
  } else if (process.env.APP_DETOX === '1') {
    setupAppDetox = true;
  } else if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'confirm',
        name: 'setupAppDetox',
        message: 'Set up Detox for E2E testing?',
        default: true,
      },
    ]);
    setupAppDetox = result.setupAppDetox;
  }

  return { expoWorkflow, setupAppJest, setupAppDetox };
}
