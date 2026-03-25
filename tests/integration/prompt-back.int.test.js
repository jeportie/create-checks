import { describe, expect, it } from 'vitest';

import { BACK } from '../../src/utils/prompt.js';
import { runWizard } from '../../src/utils/wizard.js';

describe('BACK sentinel', () => {
  it('exports a symbol named BACK', () => {
    expect(typeof BACK).toBe('symbol');
    expect(BACK.toString()).toContain('BACK');
  });
});

describe('runWizard', () => {
  it('runs steps sequentially and collects answers', async () => {
    const steps = [async () => ({ name: 'Alice' }), async () => ({ age: 30 })];
    const result = await runWizard(steps);
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('goes back when a step returns BACK', async () => {
    let step1Calls = 0;
    const steps = [
      async () => {
        step1Calls++;
        return { name: 'Alice' };
      },
      async () => {
        // Return BACK the first time, then proceed
        if (step1Calls === 1) return BACK;
        return { age: 30 };
      },
    ];
    const result = await runWizard(steps);
    expect(step1Calls).toBe(2);
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('clears answers from the step we go back to', async () => {
    let step1Calls = 0;
    const steps = [
      async () => {
        step1Calls++;
        return { name: step1Calls === 1 ? 'Alice' : 'Bob' };
      },
      async () => {
        if (step1Calls === 1) return BACK;
        return { age: 30 };
      },
    ];
    const result = await runWizard(steps);
    expect(result.name).toBe('Bob');
  });

  it('does not go below step 0', async () => {
    let calls = 0;
    const steps = [
      async () => {
        calls++;
        if (calls === 1) return BACK; // try to go before first step
        return { name: 'Alice' };
      },
    ];
    const result = await runWizard(steps);
    expect(calls).toBe(2);
    expect(result).toEqual({ name: 'Alice' });
  });

  it('passes collected answers to each step', async () => {
    let receivedAnswers;
    const steps = [
      async () => ({ projectType: 'backend' }),
      async (answers) => {
        receivedAnswers = { ...answers };
        return { framework: 'hono' };
      },
    ];
    await runWizard(steps);
    expect(receivedAnswers).toEqual({ projectType: 'backend' });
  });

  it('handles multiple back steps', async () => {
    let step0Calls = 0;
    let step1Calls = 0;
    let step2Calls = 0;
    const steps = [
      async () => {
        step0Calls++;
        return { a: 1 };
      },
      async () => {
        step1Calls++;
        if (step1Calls === 1) return BACK; // go back to step 0
        return { b: 2 };
      },
      async () => {
        step2Calls++;
        if (step2Calls === 1) return BACK; // go back to step 1
        return { c: 3 };
      },
    ];
    const result = await runWizard(steps);
    expect(step0Calls).toBe(2);
    expect(step1Calls).toBe(3); // called once, back, called again after step0 redo, called again after step2 back
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });
});
