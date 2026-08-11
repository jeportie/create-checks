import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '../../src/index.js');

function createTmpProject() {
  const dir = mkdtempSync(join(tmpdir(), 'tskickstart-crew-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2));
  return dir;
}

function runCli(cwd, extraEnv = {}) {
  execSync(`node ${cliPath}`, { cwd, env: { ...process.env, NO_INSTALL: '1', ...extraEnv }, stdio: 'pipe' });
}

const CREW_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  '.mcp.json',
  '.claude/INTEL.md',
  '.claude/settings.json',
  '.claude/agents/orchestrator.md',
  '.claude/agents/thinker.md',
  '.claude/agents/operator.md',
  '.claude/agents/review.md',
  '.claude/agents/quality.md',
  '.claude/agents/triage.md',
  '.claude/skills/onboard-company/SKILL.md',
];

describe('agent crew generator', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('copies the agent crew when INCLUDE_AGENT_CREW=1', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { INCLUDE_AGENT_CREW: '1' });
    for (const file of CREW_FILES) {
      expect(existsSync(join(tmpDir, file))).toBe(true);
    }
  });

  it('does not copy the crew when INCLUDE_AGENT_CREW=0', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir, { INCLUDE_AGENT_CREW: '0' });
    expect(existsSync(join(tmpDir, 'CLAUDE.md'))).toBe(false);
    expect(existsSync(join(tmpDir, '.claude'))).toBe(false);
  });

  it('does not copy the crew by default in non-TTY mode', () => {
    tmpDir = createTmpProject();
    runCli(tmpDir);
    expect(existsSync(join(tmpDir, 'CLAUDE.md'))).toBe(false);
  });

  it('does not overwrite an existing CLAUDE.md', () => {
    tmpDir = createTmpProject();
    writeFileSync(join(tmpDir, 'CLAUDE.md'), 'custom governance\n');
    runCli(tmpDir, { INCLUDE_AGENT_CREW: '1' });
    expect(readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8')).toBe('custom governance\n');
  });
});
