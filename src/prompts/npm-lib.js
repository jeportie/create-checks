import { prompt, BACK } from '../utils/prompt.js';

export async function askNpmLibQuestions() {
  let setupSemanticRelease = true;
  if (process.env.SEMANTIC_RELEASE === '0') {
    setupSemanticRelease = false;
  } else if (process.env.SEMANTIC_RELEASE === '1') {
    setupSemanticRelease = true;
  } else if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'confirm',
        name: 'setupSemanticRelease',
        message: 'Set up semantic-release for automated versioning and publishing?',
        default: true,
      },
    ]);
    setupSemanticRelease = result.setupSemanticRelease;
  }

  let packageManager = 'npm';
  if (process.env.PKG_MANAGER) {
    packageManager = process.env.PKG_MANAGER;
  } else if (process.stdin.isTTY) {
    const result = await prompt([
      {
        type: 'list',
        name: 'packageManager',
        message: 'Which package manager?',
        choices: [
          { name: 'npm', value: 'npm' },
          { name: 'pnpm', value: 'pnpm' },
          { type: 'separator' },
          { name: '← Back', value: BACK },
        ],
      },
    ]);
    if (result.packageManager === BACK) return BACK;
    packageManager = result.packageManager;
  }

  return { setupSemanticRelease, packageManager };
}
