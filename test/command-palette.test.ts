import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to safely provide mocks to hoisted vi.mock
const { mockShowQuickPick, mockShowInformationMessage } = vi.hoisted(() => ({
  mockShowQuickPick: vi.fn(),
  mockShowInformationMessage: vi.fn()
}));

vi.mock('vscode', () => {
  return {
    QuickPickItemKind: {
      Separator: -1,
      Default: 0
    },
    window: {
      showQuickPick: mockShowQuickPick,
      showInformationMessage: mockShowInformationMessage
    }
  };
});

import {
  CommandPaletteManager,
  SkillQuickPickItem,
  AgentQuickPickItem
} from '../src/adapters/command-palette-manager';
import {
  BmadLifecyclePhase,
  BmadSkillNode,
  BmadAgentTeam,
  BmadAgentNode
} from '../src/core/types';

describe('CommandPaletteManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockSkill = (
    id: string,
    displayName: string,
    phase: string,
    required: boolean,
    status: 'completed' | 'in-progress' | 'not-started',
    menuCode?: string,
    outputs?: string
  ): BmadSkillNode => ({
    id,
    skill: id,
    displayName,
    module: 'BMad Method',
    phase,
    required,
    status,
    menuCode,
    outputs,
    description: `Description for ${displayName}`
  });

  const createMockAgent = (
    id: string,
    name: string,
    title: string,
    module: string,
    team: string,
    icon: string
  ): BmadAgentNode => ({
    id,
    name,
    title,
    module,
    team,
    icon,
    description: `Description for ${name}`
  });

  describe('buildSkillQuickPickItems', () => {
    it('should return an empty list when given empty phases', () => {
      const items = CommandPaletteManager.buildSkillQuickPickItems([]);
      expect(items).toEqual([]);
    });

    it('should skip phases with empty skills', () => {
      const phases: BmadLifecyclePhase[] = [
        { id: '1-analysis', label: 'Phase 1: Analysis', order: 1, skills: [] }
      ];
      const items = CommandPaletteManager.buildSkillQuickPickItems(phases);
      expect(items).toEqual([]);
    });

    it('should format phase separators and skill items with codes, tags, and status icons', () => {
      const phases: BmadLifecyclePhase[] = [
        {
          id: '2-plan',
          label: 'Phase 2: Planning & Architecture',
          order: 2,
          skills: [
            createMockSkill('bmad-prd', 'Product Requirements Document', '2-plan', true, 'completed', 'PRD', 'docs/PRD.md'),
            createMockSkill('bmad-architecture', 'Architecture', '2-plan', true, 'in-progress', 'ARC'),
            createMockSkill('bmad-ux', 'User Experience Design', '2-plan', false, 'not-started')
          ]
        }
      ];

      const items = CommandPaletteManager.buildSkillQuickPickItems(phases);

      // 1 separator + 3 skills
      expect(items).toHaveLength(4);

      // Separator
      expect(items[0].label).toBe('Phase 2: Planning & Architecture');
      expect(items[0].kind).toBe(-1); // QuickPickItemKind.Separator

      // Completed skill with menu code and output
      expect(items[1].label).toBe('$(pass) [PRD] Product Requirements Document');
      expect(items[1].description).toBe('BMad Method • [REQUIRED GATE]');
      expect(items[1].detail).toContain('Outputs: docs/PRD.md');
      expect(items[1].skill?.id).toBe('bmad-prd');

      // In-progress skill
      expect(items[2].label).toBe('$(sync~spin) [ARC] Architecture');
      expect(items[2].description).toBe('BMad Method • [REQUIRED GATE]');
      expect(items[2].skill?.id).toBe('bmad-architecture');

      // Not started, non-required skill
      expect(items[3].label).toBe('User Experience Design');
      expect(items[3].description).toBe('BMad Method');
      expect(items[3].skill?.id).toBe('bmad-ux');
    });
  });

  describe('promptSkillSelection', () => {
    it('should show notice and return undefined when no skills exist', async () => {
      const result = await CommandPaletteManager.promptSkillSelection([]);
      expect(result).toBeUndefined();
      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        'No BMAD skills found in current workspace.'
      );
      expect(mockShowQuickPick).not.toHaveBeenCalled();
    });

    it('should invoke showQuickPick with options and return selected skill', async () => {
      const mockSkill = createMockSkill('bmad-build', 'Build Story', 'ship', true, 'not-started', 'BD');
      const phases: BmadLifecyclePhase[] = [
        {
          id: 'ship',
          label: 'Phase 5: Ship',
          order: 5,
          skills: [mockSkill]
        }
      ];

      mockShowQuickPick.mockResolvedValueOnce({
        label: '[BD] Build Story',
        skill: mockSkill
      } as SkillQuickPickItem);

      const result = await CommandPaletteManager.promptSkillSelection(phases);

      expect(mockShowQuickPick).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          title: 'BMAD Method — Run Skill',
          matchOnDescription: true,
          matchOnDetail: true
        })
      );
      expect(result).toEqual(mockSkill);
    });

    it('should return undefined if user cancels QuickPick selection', async () => {
      const phases: BmadLifecyclePhase[] = [
        {
          id: 'ship',
          label: 'Phase 5: Ship',
          order: 5,
          skills: [createMockSkill('bmad-build', 'Build Story', 'ship', true, 'not-started')]
        }
      ];

      mockShowQuickPick.mockResolvedValueOnce(undefined);

      const result = await CommandPaletteManager.promptSkillSelection(phases);
      expect(result).toBeUndefined();
    });
  });

  describe('buildAgentQuickPickItems', () => {
    it('should return empty list when given empty teams', () => {
      const items = CommandPaletteManager.buildAgentQuickPickItems([]);
      expect(items).toEqual([]);
    });

    it('should format team separators and agent items correctly', () => {
      const teams: BmadAgentTeam[] = [
        {
          id: 'software-development',
          name: 'Software Development Team',
          agents: [
            createMockAgent('bmad-agent-architect', 'Winston', 'System Architect', 'bmm', 'software-development', '🏗️'),
            createMockAgent('bmad-agent-dev', 'Amelia', 'Senior Software Engineer', 'bmm', 'software-development', '💻')
          ]
        },
        {
          id: 'empty-team',
          name: 'Empty Team',
          agents: []
        }
      ];

      const items = CommandPaletteManager.buildAgentQuickPickItems(teams);

      // 1 separator + 2 agents (empty team skipped)
      expect(items).toHaveLength(3);
      expect(items[0].label).toBe('Software Development Team');
      expect(items[0].kind).toBe(-1); // QuickPickItemKind.Separator

      expect(items[1].label).toBe('🏗️ Winston — System Architect');
      expect(items[1].description).toBe('BMM');
      expect(items[1].detail).toBe('Description for Winston');
      expect(items[1].agent?.name).toBe('Winston');

      expect(items[2].label).toBe('💻 Amelia — Senior Software Engineer');
      expect(items[2].agent?.name).toBe('Amelia');
    });
  });

  describe('promptAgentSelection', () => {
    it('should show notice and return undefined when no agents exist', async () => {
      const result = await CommandPaletteManager.promptAgentSelection([]);
      expect(result).toBeUndefined();
      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        'No BMAD personas found in current workspace.'
      );
      expect(mockShowQuickPick).not.toHaveBeenCalled();
    });

    it('should invoke showQuickPick and return selected agent', async () => {
      const mockAgent = createMockAgent('bmad-agent-architect', 'Winston', 'System Architect', 'bmm', 'software-development', '🏗️');
      const teams: BmadAgentTeam[] = [
        {
          id: 'software-development',
          name: 'Software Development Team',
          agents: [mockAgent]
        }
      ];

      mockShowQuickPick.mockResolvedValueOnce({
        label: '🏗️ Winston — System Architect',
        agent: mockAgent
      } as AgentQuickPickItem);

      const result = await CommandPaletteManager.promptAgentSelection(teams);

      expect(mockShowQuickPick).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          title: 'BMAD Personas Hub — Select Active Agent',
          matchOnDescription: true,
          matchOnDetail: true
        })
      );
      expect(result).toEqual(mockAgent);
    });
  });
});
