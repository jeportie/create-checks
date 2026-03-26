import { BACK } from './prompt.js';

function clearLines(count) {
  if (!process.stdout.isTTY || count <= 0) return;
  for (let i = 0; i < count; i++) {
    process.stdout.write('\x1B[1A\x1B[2K');
  }
}

function cursorRowDelta(chunk) {
  const str = String(chunk);
  let delta = 0;
  for (const ch of str) {
    if (ch === '\n') delta++;
  }
  const esc = '\x1B';
  const upRe = new RegExp(`${esc}\\[(\\d*)A`, 'g');
  let m;
  while ((m = upRe.exec(str))) {
    delta -= parseInt(m[1] || '1', 10);
  }
  const downRe = new RegExp(`${esc}\\[(\\d*)B`, 'g');
  while ((m = downRe.exec(str))) {
    delta += parseInt(m[1] || '1', 10);
  }
  return delta;
}

export async function runWizard(steps) {
  let step = 0;
  const answers = {};
  const stepKeys = [];
  const stepLines = [];

  while (step < steps.length) {
    // Hook stdout.write to count lines written during this step
    let linesWritten = 0;
    const originalWrite = process.stdout.write;
    if (process.stdout.isTTY) {
      process.stdout.write = function (chunk, ...args) {
        linesWritten += cursorRowDelta(chunk);
        return originalWrite.call(this, chunk, ...args);
      };
    }

    const result = await steps[step](answers);

    // Restore original write
    process.stdout.write = originalWrite;

    if (result === BACK) {
      // Clear lines from this step (the "back" selection itself)
      clearLines(linesWritten);
      // Also clear lines from the previous step so we can redo it
      const prevStep = Math.max(0, step - 1);
      if (stepLines[prevStep]) {
        clearLines(stepLines[prevStep]);
      }

      // Remove keys
      if (stepKeys[step]) {
        for (const key of stepKeys[step]) {
          delete answers[key];
        }
      }
      step = Math.max(0, step - 1);
      if (stepKeys[step]) {
        for (const key of stepKeys[step]) {
          delete answers[key];
        }
      }
      continue;
    }

    stepLines[step] = linesWritten;
    const keys = Object.keys(result);
    stepKeys[step] = keys;
    Object.assign(answers, result);
    step++;
  }

  return answers;
}
