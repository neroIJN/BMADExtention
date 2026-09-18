import * as fs from 'fs';
import * as path from 'path';
import { parse as parseToml } from 'smol-toml';
import { BmadAgentNode, BmadAgentTeam } from './types';

/**
 * Friendly display labels for known BMAD persona teams.
 */
const KNOWN_TEAM_LABELS: Record<string, string> = {
  'software-development': 'Software Development Team',
  creative: 'Creative Intelligence Suite',
  tea: 'Test Architecture & Quality',
  core: 'Core System Personas'
};

/**
 * Formats a raw team identifier into a clean, human-readable team label.
 */
export function formatTeamName(rawTeam: string): string {
  if (!rawTeam) {
    return 'General Agents';
  }
  const lower = rawTeam.toLowerCase().trim();
  if (KNOWN_TEAM_LABELS[lower]) {
    return KNOWN_TEAM_LABELS[lower];
  }
  return (
    lower
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') + ' Team'
  );
}

/**
 * Extract raw agent entries from parsed TOML without filling defaults for missing keys.
 */
export function extractRawAgentEntries(
  parsed: Record<string, any>
): Record<string, Partial<BmadAgentNode>> {
  const result: Record<string, Partial<BmadAgentNode>> = {};
  if (!parsed || !parsed.agents || typeof parsed.agents !== 'object') {
    return result;
  }

  for (const [agentId, data] of Object.entries(parsed.agents)) {
    if (!data || typeof data !== 'object') {
      continue;
    }
    const agentObj = data as Record<string, any>;
    const entry: Partial<BmadAgentNode> = { id: agentId };
    if (agentObj.name !== undefined) {
      entry.name = String(agentObj.name);
    }
    if (agentObj.title !== undefined) {
      entry.title = String(agentObj.title);
    }
    if (agentObj.module !== undefined) {
      entry.module = String(agentObj.module);
    }
    if (agentObj.team !== undefined) {
      entry.team = String(agentObj.team);
    }
    if (agentObj.icon !== undefined) {
      entry.icon = String(agentObj.icon);
    }
    if (agentObj.description !== undefined) {
      entry.description = String(agentObj.description);
    }
    result[agentId] = entry;
  }

  return result;
}

/**
 * Parses agent definitions from TOML content strings with override merging.
 *
 * @param baseToml Base installer configuration TOML content
 * @param overrideToml Optional custom override TOML content
 * @returns Array of BmadAgentTeam objects containing parsed and grouped agents
 */
export function parseAgentsContent(
  baseToml: string,
  overrideToml?: string
): BmadAgentTeam[] {
  const mergedRaw: Record<string, Partial<BmadAgentNode>> = {};

  try {
    if (baseToml) {
      const parsedBase = parseToml(baseToml) as Record<string, any>;
      Object.assign(mergedRaw, extractRawAgentEntries(parsedBase));
    }
  } catch {
    // Ignore base TOML parsing error
  }

  try {
    if (overrideToml) {
      const parsedOverride = parseToml(overrideToml) as Record<string, any>;
      const overrides = extractRawAgentEntries(parsedOverride);
      for (const [id, agent] of Object.entries(overrides)) {
        mergedRaw[id] = { ...(mergedRaw[id] || {}), ...agent };
      }
    }
  } catch {
    // Ignore override TOML parsing error
  }

  const finalAgents: BmadAgentNode[] = Object.entries(mergedRaw).map(([id, partial]) => ({
    id,
    name: partial.name || id,
    title: partial.title || 'Specialist',
    module: partial.module || 'bmad',
    team: partial.team || 'software-development',
    icon: partial.icon || '🤖',
    description: partial.description || ''
  }));

  return groupAgentsByTeam(finalAgents);
}

/**
 * Group a flat list of agents into sorted BmadAgentTeam objects.
 */
export function groupAgentsByTeam(agents: BmadAgentNode[]): BmadAgentTeam[] {
  const teamMap = new Map<string, BmadAgentNode[]>();

  for (const agent of agents) {
    const teamKey = agent.team || 'software-development';
    if (!teamMap.has(teamKey)) {
      teamMap.set(teamKey, []);
    }
    teamMap.get(teamKey)!.push(agent);
  }

  // Canonical ordering of known teams
  const teamOrder = ['software-development', 'creative', 'tea', 'core'];

  const sortedTeams = Array.from(teamMap.keys()).sort((a, b) => {
    const indexA = teamOrder.indexOf(a);
    const indexB = teamOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) {
      return -1;
    }
    if (indexB !== -1) {
      return 1;
    }
    return a.localeCompare(b);
  });

  return sortedTeams.map((teamId) => ({
    id: teamId,
    name: formatTeamName(teamId),
    agents: teamMap.get(teamId) || []
  }));
}

/**
 * Loads and merges all agent definitions from a BMAD workspace filesystem.
 *
 * @param rootPath Root directory of the BMAD workspace
 * @returns Array of BmadAgentTeam objects grouped and formatted
 */
export async function loadAgentsFromWorkspace(rootPath: string): Promise<BmadAgentTeam[]> {
  const baseConfigPath = path.join(rootPath, '_bmad', 'config.toml');
  const customConfigPath = path.join(rootPath, '_bmad', 'custom', 'config.toml');
  const userConfigPath = path.join(rootPath, '_bmad', 'custom', 'config.user.toml');

  let baseContent = '';
  let overrideContent = '';

  if (fs.existsSync(baseConfigPath)) {
    try {
      baseContent = await fs.promises.readFile(baseConfigPath, 'utf8');
    } catch {
      // Ignore read failure
    }
  }

  if (fs.existsSync(customConfigPath)) {
    try {
      overrideContent += '\n' + (await fs.promises.readFile(customConfigPath, 'utf8'));
    } catch {
      // Ignore
    }
  }

  if (fs.existsSync(userConfigPath)) {
    try {
      overrideContent += '\n' + (await fs.promises.readFile(userConfigPath, 'utf8'));
    } catch {
      // Ignore
    }
  }

  return parseAgentsContent(baseContent, overrideContent);
}
