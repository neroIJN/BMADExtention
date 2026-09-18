import { BmadAgentNode, BmadSkillNode } from './types';

/**
 * Execution payload containing formatted CLI commands and prompt text.
 */
export interface ExecutionPayload {
  type: 'skill' | 'agent';
  targetId: string;
  targetName: string;
  cliCommand: string;
  clipboardPrompt: string;
}

/**
 * Formats a skill ID into a standard slash-command or CLI string.
 */
export function formatSkillCommand(skillId: string, args?: string): string {
  const cleanId = skillId.trim();
  const slashCmd = cleanId.startsWith('/') ? cleanId : `/${cleanId}`;
  if (args && args.trim().length > 0) {
    return `${slashCmd} ${args.trim()}`;
  }
  return slashCmd;
}

/**
 * Formats a terminal-ready CLI execution command.
 */
export function formatSkillCliCommand(skillId: string, args?: string): string {
  const cleanId = skillId.replace(/^\//, '').trim();
  if (args && args.trim().length > 0) {
    return `npx bmad ${cleanId} ${args.trim()}`;
  }
  return `npx bmad ${cleanId}`;
}

/**
 * Formats a conversational prompt for interacting with a specific persona.
 */
export function formatAgentPrompt(agent: BmadAgentNode, userIntent?: string): string {
  const intro = `Switching persona to ${agent.name} (${agent.title}):`;
  const context = `Channeling guidelines: ${agent.description}`;
  const ask = userIntent && userIntent.trim().length > 0
    ? userIntent.trim()
    : `Hello ${agent.name}, let's review the current status and plan next steps.`;

  return `${intro}\n"${context}"\n\n${ask}`;
}

/**
 * Creates an ExecutionPayload for a skill.
 */
export function createSkillExecutionPayload(
  skill: BmadSkillNode | string,
  args?: string
): ExecutionPayload {
  const id = typeof skill === 'string' ? skill : skill.id;
  const name = typeof skill === 'string' ? skill : skill.displayName;
  const slash = formatSkillCommand(id, args);
  const cli = formatSkillCliCommand(id, args);

  return {
    type: 'skill',
    targetId: id,
    targetName: name,
    cliCommand: cli,
    clipboardPrompt: slash
  };
}

/**
 * Creates an ExecutionPayload for an agent persona.
 */
export function createAgentExecutionPayload(
  agent: BmadAgentNode,
  userIntent?: string
): ExecutionPayload {
  const prompt = formatAgentPrompt(agent, userIntent);
  return {
    type: 'agent',
    targetId: agent.id,
    targetName: agent.name,
    cliCommand: `echo "${agent.name} (${agent.title}) persona activated"`,
    clipboardPrompt: prompt
  };
}
