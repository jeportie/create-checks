import { prompt } from '../utils/prompt.js';

export async function askCicdQuestions() {
  let setupCicd = false;

  if (process.env.SETUP_CICD === '1') {
    setupCicd = true;
  } else if (process.env.SETUP_CICD === '0') {
    setupCicd = false;
  } else if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'confirm',
        name: 'setupCicd',
        message: 'Set up CI/CD pipeline?',
        default: true,
      },
    ]);
    setupCicd = result.setupCicd;
  }

  return { setupCicd };
}
