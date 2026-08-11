import fs from 'fs-extra';
import pc from 'picocolors';
import path from 'node:path';

import { copyIfMissing, templatePath } from '../utils/file-system.js';

// Explicit file list (mirrors generateFrontend). Nested paths are created on demand.
const AGENT_CREW_FILES = [
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

export async function generateAgentCrew(_answers, cwd = process.cwd()) {
  console.log(pc.green('→') + '  copying the AI agent crew...');
  for (const file of AGENT_CREW_FILES) {
    const src = templatePath('agent-crew', file);
    const dest = path.join(cwd, file);
    await fs.ensureDir(path.dirname(dest));
    await copyIfMissing(src, dest, file);
  }
}
