import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('execa', () => ({ execa: vi.fn() }));

import { execa } from 'execa';

import { getSemanticReleaseDevDeps, installDeps } from '../../src/utils/install.js';

// Versions the mocked `npx expo install` pins for the current Expo SDK. The jest
// preset must line up with react-native, react-test-renderer with react.
const EXPO_PINNED_REACT_NATIVE = '0.86.2';
const EXPO_PINNED_REACT = '19.2.3';

function appJestAnswers() {
  return {
    projectType: 'app',
    setupAppJest: true,
    setupAppDetox: false,
    linter: 'eslint',
    lintOption: [],
    setupPrecommit: false,
  };
}

// Package specs passed to every `npm install -D ...` invocation.
function devInstallSpecs() {
  return execa.mock.calls
    .filter(([cmd, args]) => cmd === 'npm' && args[0] === 'install' && args[1] === '-D')
    .flatMap(([, args]) => args.slice(2));
}

describe('install utility refactors', () => {
  it('returns stable semantic-release dependency list', () => {
    expect(getSemanticReleaseDevDeps()).toEqual([
      'semantic-release',
      '@semantic-release/commit-analyzer',
      '@semantic-release/release-notes-generator',
      '@semantic-release/npm',
      '@semantic-release/github',
      'conventional-changelog-conventionalcommits',
    ]);
  });
});

describe('app jest preset alignment', () => {
  beforeEach(() => {
    vi.stubEnv('NO_INSTALL', '0');
    execa.mockImplementation(async (cmd, args) => {
      const script = Array.isArray(args) ? args[1] : '';
      if (cmd === 'node' && typeof script === 'string' && script.includes('react-native/package.json')) {
        return { stdout: EXPO_PINNED_REACT_NATIVE };
      }
      if (cmd === 'node' && typeof script === 'string' && script.includes('react/package.json')) {
        return { stdout: EXPO_PINNED_REACT };
      }
      return { stdout: '' };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('installs jest-expo without an unpinned @react-native/jest-preset', async () => {
    await installDeps(appJestAnswers());

    const specs = devInstallSpecs();
    expect(specs).toContain('jest-expo');
    expect(specs).not.toContain('@react-native/jest-preset');
  });

  it('pins @react-native/jest-preset to the Expo-pinned react-native version', async () => {
    await installDeps(appJestAnswers());

    expect(devInstallSpecs()).toContain(`@react-native/jest-preset@${EXPO_PINNED_REACT_NATIVE}`);
  });
});
