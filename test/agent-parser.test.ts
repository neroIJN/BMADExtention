import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  formatTeamName,
  parseAgentsContent,
  loadAgentsFromWorkspace
} from '../src/core/agent-parser';

describe('AgentParser', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bmad-agent-test-'));
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('formatTeamName', () => {
    it('should format known teams with canonical labels', () => {
      expect(formatTeamName('software-development')).toBe('Software Development Team');
      expect(formatTeamName('creative')).toBe('Creative Intelligence Suite');
      expect(formatTeamName('tea')).toBe('Test Architecture & Quality');
    });

    it('should format unknown team IDs with title casing', () => {
      expect(formatTeamName('data-science')).toBe('Data Science Team');
      expect(formatTeamName('devops')).toBe('Devops Team');
      expect(formatTeamName('')).toBe('General Agents');
    });
  });

  describe('parseAgentsContent', () => {
    const sampleToml = `
[agents.bmad-agent-pm]
module = "bmm"
team = "software-development"
name = "John"
title = "Product Manager"
icon = "📋"
description = "Drives Jobs-to-be-Done over template filling."

[agents.bmad-agent-architect]
module = "bmm"
team = "software-development"
name = "Winston"
title = "System Architect"
icon = "🏗️"
description = "Favors boring technology for stability."

[agents.bmad-cis-agent-storyteller]
module = "cis"
team = "creative"
name = "Sophia"
title = "Master Storyteller"
icon = "📖"
description = "Channels Robert McKee structural rigor."
`;

    it('should parse agents from TOML and group them into teams', () => {
      const teams = parseAgentsContent(sampleToml);
      expect(teams.length).toBe(2);

      const swDev = teams.find((t) => t.id === 'software-development');
      expect(swDev).toBeDefined();
      expect(swDev?.agents.length).toBe(2);
      expect(swDev?.agents.map((a) => a.name)).toEqual(['John', 'Winston']);

      const creative = teams.find((t) => t.id === 'creative');
      expect(creative).toBeDefined();
      expect(creative?.agents.length).toBe(1);
      expect(creative?.agents[0].name).toBe('Sophia');
    });

    it('should merge custom overrides over installer definitions', () => {
      const overrideToml = `
[agents.bmad-agent-architect]
title = "Principal System Architect"
icon = "🏛️"
`;
      const teams = parseAgentsContent(sampleToml, overrideToml);
      const swDev = teams.find((t) => t.id === 'software-development');
      const winston = swDev?.agents.find((a) => a.id === 'bmad-agent-architect');

      expect(winston?.title).toBe('Principal System Architect');
      expect(winston?.icon).toBe('🏛️');
      expect(winston?.description).toBe('Favors boring technology for stability.');
    });

    it('should handle empty or malformed TOML gracefully', () => {
      expect(parseAgentsContent('')).toEqual([]);
      expect(parseAgentsContent('invalid toml syntax ===')).toEqual([]);
    });
  });

  describe('loadAgentsFromWorkspace', () => {
    it('should return empty array if no config files exist', async () => {
      const teams = await loadAgentsFromWorkspace(tempDir);
      expect(teams).toEqual([]);
    });

    it('should read and load agents from _bmad/config.toml', async () => {
      const bmadDir = path.join(tempDir, '_bmad');
      await fs.promises.mkdir(bmadDir, { recursive: true });

      const toml = `
[agents.bmad-agent-dev]
module = "bmm"
team = "software-development"
name = "Amelia"
title = "Senior Software Engineer"
icon = "💻"
description = "Test-first discipline."
`;
      await fs.promises.writeFile(path.join(bmadDir, 'config.toml'), toml);

      const teams = await loadAgentsFromWorkspace(tempDir);
      expect(teams.length).toBe(1);
      expect(teams[0].agents[0].name).toBe('Amelia');
    });

    it('should accurately parse real workspace personas when present', async () => {
      const realRoot = path.resolve(__dirname, '..');
      const realConfig = path.join(realRoot, '_bmad', 'config.toml');

      if (fs.existsSync(realConfig)) {
        const teams = await loadAgentsFromWorkspace(realRoot);
        const allAgents = teams.flatMap((t) => t.agents);

        expect(allAgents.length).toBeGreaterThanOrEqual(10);
        expect(allAgents.some((a) => a.name === 'John')).toBe(true);
        expect(allAgents.some((a) => a.name === 'Winston')).toBe(true);
        expect(allAgents.some((a) => a.name === 'Amelia')).toBe(true);
        expect(allAgents.some((a) => a.name === 'Murat')).toBe(true);
        expect(allAgents.some((a) => a.name === 'Sophia')).toBe(true);
      }
    });
  });
});
