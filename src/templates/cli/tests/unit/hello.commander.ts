import { afterEach, describe, expect, it, vi } from 'vitest';

import { hello } from '../../src/commands/hello.js';

describe('hello command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs greeting with the given name', () => {
    const spy = vi.spyOn(console, 'log');
    hello('World');
    expect(spy).toHaveBeenCalledWith('Hello, World!');
  });
});
