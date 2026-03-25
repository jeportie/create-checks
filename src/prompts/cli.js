import { prompt } from '../utils/prompt.js';

export async function askCliQuestions() {
  let cliFramework = 'commander';
  if (process.env.CLI_FRAMEWORK) {
    cliFramework = process.env.CLI_FRAMEWORK;
  } else if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'list',
        name: 'cliFramework',
        message: 'Which CLI framework?',
        choices: [
          { name: 'commander — argument parsing with subcommands', value: 'commander' },
          { name: 'inquirer — interactive prompts', value: 'inquirer' },
          { name: '@clack/prompts — modern interactive CLI', value: 'clack' },
        ],
      },
    ]);
    cliFramework = result.cliFramework;
  }

  let cliName = '';
  if (process.env.CLI_NAME) {
    cliName = process.env.CLI_NAME;
  } else if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'input',
        name: 'cliName',
        message: 'CLI command name (used in bin field):',
        default: 'my-cli',
      },
    ]);
    cliName = result.cliName;
  } else {
    cliName = 'my-cli';
  }

  return { cliFramework, cliName };
}
