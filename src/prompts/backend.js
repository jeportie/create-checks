import { prompt } from '../utils/prompt.js';

export async function askBackendQuestions() {
  let backendFramework = 'hono';
  if (process.env.BACKEND_FRAMEWORK) {
    backendFramework = process.env.BACKEND_FRAMEWORK;
  } else if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'list',
        name: 'backendFramework',
        message: 'Which backend framework?',
        choices: [
          { name: 'Hono — ultrafast, TypeScript-first (recommended)', value: 'hono' },
          { name: 'Fastify — production-proven, excellent performance', value: 'fastify' },
          { name: 'Express — legacy/familiarity', value: 'express' },
          { name: 'Elysia — Bun-native, TypeScript-first, fast', value: 'elysia' },
        ],
      },
    ]);
    backendFramework = result.backendFramework;
  }

  let setupZod = true;
  if (process.env.BACKEND_ZOD === '0') {
    setupZod = false;
  } else if (process.env.BACKEND_ZOD === '1') {
    setupZod = true;
  } else if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'confirm',
        name: 'setupZod',
        message: 'Set up Zod for environment variable validation?',
        default: true,
      },
    ]);
    setupZod = result.setupZod;
  }

  let setupDocker = true;
  if (process.env.DOCKER === '0') {
    setupDocker = false;
  } else if (process.env.DOCKER === '1') {
    setupDocker = true;
  } else if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'confirm',
        name: 'setupDocker',
        message: 'Set up Docker (Dockerfile + docker-compose)?',
        default: true,
      },
    ]);
    setupDocker = result.setupDocker;
  }

  return { backendFramework, setupZod, setupDocker };
}
