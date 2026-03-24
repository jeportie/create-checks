import { prompt } from '../utils/prompt.js';

export async function askProjectType() {
  if (process.env.PROJECT_TYPE !== undefined) {
    return process.env.PROJECT_TYPE || undefined;
  }

  if (!process.stdin.isTTY) {
    return undefined;
  }

  const { projectType } = await prompt([
    {
      type: 'list',
      name: 'projectType',
      message: 'What are you building?',
      choices: [
        { name: 'npm library', value: 'npm-lib' },
        { name: 'CLI tool', value: 'cli' },
        { name: 'backend service', value: 'backend' },
        { name: 'frontend app', value: 'frontend' },
        { name: 'mobile app', value: 'app' },
        { name: 'fullstack app', value: 'fullstack' },
      ],
    },
  ]);

  return projectType;
}
