import { describe, expect, it } from 'vitest';

import { getSemanticReleaseDevDeps } from '../../src/utils/install.js';

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
