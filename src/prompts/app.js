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

  return { expoWorkflow };
}
