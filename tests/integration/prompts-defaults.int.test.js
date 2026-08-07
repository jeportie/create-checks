import { afterEach, describe, expect, it, vi } from 'vitest';

import { prompt } from '../../src/utils/prompt.js';
import { askCicdQuestions } from '../../src/prompts/cicd.js';
import { askCliQuestions } from '../../src/prompts/cli.js';
import { askDatabaseQuestions } from '../../src/prompts/database.js';
import { askPlaywrightQuestion } from '../../src/prompts/playwright.js';

vi.mock('../../src/utils/prompt.js', () => ({
  prompt: vi.fn(),
}));

const originalIsTTY = process.stdin.isTTY;

describe('confirm prompt defaults', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
  });

  it('uses default=true for database and redis confirms', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    vi.stubEnv('SETUP_DATABASE', '');
    vi.stubEnv('SETUP_REDIS', '');
    vi.stubEnv('DB_ENGINE', 'postgresql');
    vi.stubEnv('DB_ORM', 'none');

    prompt.mockResolvedValueOnce({ setupDatabase: true }).mockResolvedValueOnce({ setupRedis: true });

    await askDatabaseQuestions();

    expect(prompt).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([expect.objectContaining({ type: 'confirm', name: 'setupDatabase', default: true })]),
    );
    expect(prompt).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([expect.objectContaining({ type: 'confirm', name: 'setupRedis', default: true })]),
    );
  });

  it('uses default=true for ci/cd confirm', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    vi.stubEnv('SETUP_CICD', '');

    prompt.mockResolvedValueOnce({ setupCicd: false });

    await askCicdQuestions('backend');

    expect(prompt).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ type: 'confirm', name: 'setupCicd', default: true })]),
    );
  });

  it('uses default=true for playwright confirm', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    vi.unstubAllEnvs();

    prompt.mockResolvedValueOnce({ setupPlaywright: true });

    await askPlaywrightQuestion('frontend');

    expect(prompt).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ type: 'confirm', name: 'setupPlaywright', default: true })]),
    );
  });

  it('uses default=true for CLI semantic-release confirm', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    vi.stubEnv('CLI_FRAMEWORK', 'commander');
    vi.stubEnv('CLI_NAME', 'demo-cli');
    vi.stubEnv('SEMANTIC_RELEASE', '');

    prompt.mockResolvedValueOnce({ setupSemanticRelease: true });

    await askCliQuestions();

    expect(prompt).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: 'confirm', name: 'setupSemanticRelease', default: true }),
      ]),
    );
  });
});
