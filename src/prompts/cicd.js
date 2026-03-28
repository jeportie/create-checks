import { prompt } from '../utils/prompt.js';

const targetChoices = {
  backend: ['railway', 'flyio', 'docker', 'none'],
  frontend: ['vercel', 'netlify', 'github-pages', 'none'],
  app: ['eas', 'none'],
  cli: ['none'],
  'npm-lib': ['none'],
};

export async function askCicdQuestions(projectType) {
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

  if (!setupCicd) {
    return { setupCicd: false, cicdTarget: 'none' };
  }

  const targets = targetChoices[projectType] || ['none'];

  let cicdTarget = process.env.CICD_TARGET;
  if (!cicdTarget && process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'list',
        name: 'cicdTarget',
        message: 'Which deployment target?',
        choices: targets,
      },
    ]);
    cicdTarget = result.cicdTarget;
  }

  if (!targets.includes(cicdTarget)) {
    cicdTarget = targets[0];
  }

  return { setupCicd, cicdTarget };
}
