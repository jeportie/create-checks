import { describe, expect, it, vi, afterEach } from 'vitest';

import { startSpinner } from '../../src/utils/spinner.js';

describe('startSpinner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a stop function', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stop = startSpinner('Loading...');
    expect(typeof stop).toBe('function');
    stop('Done');
    writeSpy.mockRestore();
  });

  it('writes success symbol on stop', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stop = startSpinner('Loading...');
    stop('Finished');

    const lastCall = writeSpy.mock.calls.at(-1)[0];
    expect(lastCall).toContain('Finished');
    expect(lastCall).toContain('✔');
    writeSpy.mockRestore();
  });

  it('writes error symbol on failure stop', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stop = startSpinner('Loading...');
    stop('Failed', 'error');

    const lastCall = writeSpy.mock.calls.at(-1)[0];
    expect(lastCall).toContain('Failed');
    expect(lastCall).toContain('✖');
    writeSpy.mockRestore();
  });

  it('cycles through different dot counts when text ends with "..."', async () => {
    vi.useFakeTimers();
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stop = startSpinner('Installing...');

    // Advance through enough frames for dots to cycle multiple times
    // Dots change every 5 braille frames (400ms), 3 dot states = 1200ms full cycle
    vi.advanceTimersByTime(80 * 20); // 20 braille frames

    const outputs = writeSpy.mock.calls.map((c) => c[0]);

    // Strip ANSI codes to get clean text for matching
    // eslint-disable-next-line no-control-regex
    const clean = outputs.map((o) => o.replace(/\x1B\[[0-9;]*m/g, '').replace(/\r/g, ''));

    // Must see at LEAST two different dot counts (proving animation)
    const hasOneDot = clean.some((o) => /Installing\.$/.test(o.trim()));
    const hasTwoDots = clean.some((o) => /Installing\.\.$/.test(o.trim()));
    const hasThreeDots = clean.some((o) => /Installing\.\.\.$/.test(o.trim()));

    const distinctDotCounts = [hasOneDot, hasTwoDots, hasThreeDots].filter(Boolean).length;
    expect(distinctDotCounts).toBeGreaterThanOrEqual(2);

    stop('Done');
    vi.useRealTimers();
    writeSpy.mockRestore();
  });

  it('does not animate dots when text does not end with "..."', async () => {
    vi.useFakeTimers();
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stop = startSpinner('Loading data');

    vi.advanceTimersByTime(80 * 15);

    const outputsBeforeStop = writeSpy.mock.calls.map((c) => c[0]);
    stop('Done');

    // All outputs before stop should contain the exact text "Loading data"
    const allSame = outputsBeforeStop.every((o) => o.includes('Loading data'));
    expect(allSame).toBe(true);
    vi.useRealTimers();
    writeSpy.mockRestore();
  });
});
