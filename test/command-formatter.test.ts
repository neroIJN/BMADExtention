import { describe, it, expect } from 'vitest';
import {
  formatSkillCommand,
  formatSkillCliCommand,
  formatAgentPrompt,
  createSkillExecutionPayload,
  createAgentExecutionPayload
} from '../src/core/command-formatter';
import { BmadAgentNode, BmadSkillNode } from '../src/core/types';

describe('CommandFormatter', () => {
  describe('formatSkillCommand', () => {
    it('should format a skill name into a slash command', () => {
      expect(formatSkillCommand('bmad-prd')).toBe('/bmad-prd');
      expect(formatSkillCommand('/bmad-build')).toBe('/bmad-build');
    });

    it('should include arguments when provided', () => {
      expect(formatSkillCommand('bmad-build', '-H')).toBe('/bmad-build -H');
      expect(formatSkillCommand('bmad-spec', 'path/to/notes.md')).toBe('/bmad-spec path/to/notes.md');
    });
  });

  describe('formatSkillCliCommand', () => {
    it('should format CLI execution command using npx bmad', () => {
      expect(formatSkillCliCommand('bmad-prd')).toBe('npx bmad bmad-prd');
      expect(formatSkillCliCommand('/bmad-build')).toBe('npx bmad bmad-build');
    });

    it('should append args to CLI execution command', () => {
      expect(formatSkillCliCommand('bmad-build', '--headless')).toBe('npx bmad bmad-build --headless');
    });
  });

  describe('formatAgentPrompt', () => {
    const mockAgent: BmadAgentNode = {
      id: 'bmad-agent-architect',
      name: 'Winston',
      title: 'System Architect',
      module: 'bmm',
      team: 'software-development',
      icon: '🏗️',
      description: 'Favors boring technology for stability.'
    };

    it('should format an agent persona activation prompt with guidelines', () => {
      const prompt = formatAgentPrompt(mockAgent);
      expect(prompt).toContain('Switching persona to Winston (System Architect)');
      expect(prompt).toContain('Favors boring technology for stability.');
      expect(prompt).toContain('Hello Winston');
    });

    it('should incorporate custom user intent into prompt', () => {
      const prompt = formatAgentPrompt(mockAgent, 'Please review our database schema.');
      expect(prompt).toContain('Please review our database schema.');
    });
  });

  describe('createSkillExecutionPayload', () => {
    const mockSkill: BmadSkillNode = {
      id: 'bmad-build',
      skill: 'bmad-build',
      displayName: 'Build',
      module: 'BMad Method',
      phase: 'ship',
      required: true,
      status: 'not-started'
    };

    it('should construct an execution payload from a BmadSkillNode', () => {
      const payload = createSkillExecutionPayload(mockSkill, '-H');
      expect(payload.type).toBe('skill');
      expect(payload.targetId).toBe('bmad-build');
      expect(payload.targetName).toBe('Build');
      expect(payload.cliCommand).toBe('npx bmad bmad-build -H');
      expect(payload.clipboardPrompt).toBe('/bmad-build -H');
    });

    it('should construct an execution payload from a string skill ID', () => {
      const payload = createSkillExecutionPayload('bmad-prd');
      expect(payload.type).toBe('skill');
      expect(payload.cliCommand).toBe('npx bmad bmad-prd');
      expect(payload.clipboardPrompt).toBe('/bmad-prd');
    });
  });

  describe('createAgentExecutionPayload', () => {
    const mockAgent: BmadAgentNode = {
      id: 'bmad-agent-dev',
      name: 'Amelia',
      title: 'Senior Software Engineer',
      module: 'bmm',
      team: 'software-development',
      icon: '💻',
      description: 'Test-first discipline.'
    };

    it('should construct an agent execution payload', () => {
      const payload = createAgentExecutionPayload(mockAgent);
      expect(payload.type).toBe('agent');
      expect(payload.targetId).toBe('bmad-agent-dev');
      expect(payload.targetName).toBe('Amelia');
      expect(payload.clipboardPrompt).toContain('Amelia');
    });
  });
});
