import inquirer from 'inquirer';
import pc from 'picocolors';

export const BACK = Symbol('BACK');

export async function prompt(questions) {
  try {
    return await inquirer.prompt(questions);
  } catch (err) {
    if (err?.name === 'ExitPromptError') {
      console.log(pc.yellow('\nCancelled.\n'));
      process.exit(0);
    }
    throw err;
  }
}
