import { BACK } from './prompt.js';

export async function runWizard(steps) {
  let step = 0;
  const answers = {};
  const stepKeys = [];

  while (step < steps.length) {
    const result = await steps[step](answers);

    if (result === BACK) {
      // Remove keys added by the current step before going back
      if (stepKeys[step]) {
        for (const key of stepKeys[step]) {
          delete answers[key];
        }
      }
      step = Math.max(0, step - 1);
      // Also remove keys from the step we're returning to
      if (stepKeys[step]) {
        for (const key of stepKeys[step]) {
          delete answers[key];
        }
      }
      continue;
    }

    // Track which keys this step added
    const keys = Object.keys(result);
    stepKeys[step] = keys;
    Object.assign(answers, result);
    step++;
  }

  return answers;
}
