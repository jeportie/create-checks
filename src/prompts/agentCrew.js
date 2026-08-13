import { prompt } from '../utils/prompt.js';

function fromEnv() {
  if (process.env.INCLUDE_AGENT_CREW === undefined) return undefined;
  return process.env.INCLUDE_AGENT_CREW === '1';
}

export async function askAgentCrewQuestion() {
  const envChoice = fromEnv();
  if (envChoice !== undefined) return { includeAgentCrew: envChoice };
  // Opt-in: default OFF in non-interactive mode.
  if (!process.stdin.isTTY) return { includeAgentCrew: false };

  const { includeAgentCrew } = await prompt([
    {
      type: 'confirm',
      name: 'includeAgentCrew',
      message: 'Include the AI agent crew (.claude/ agents, CLAUDE.md, AGENTS.md, .mcp.json)?',
      default: false,
    },
  ]);
  return { includeAgentCrew };
}
