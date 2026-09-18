import { describe, it, expect } from 'vitest';
import { evaluateProjectStatus } from '../src/core/status-evaluator';
import { BmadLifecyclePhase, BmadSkillNode } from '../src/core/types';

describe('StatusEvaluator', () => {
  const createMockSkill = (
    id: string,
    displayName: string,
    phase: string,
    required: boolean,
    status: 'completed' | 'in-progress' | 'not-started',
    action?: string
  ): BmadSkillNode => ({
    id,
    skill: id,
    displayName,
    module: 'BMad Method',
    phase,
    required,
    status,
    action
  });

  it('should return initializing status when phases array is empty', () => {
    const status = evaluateProjectStatus([]);
    expect(status.statusBarText).toContain('Initializing');
    expect(status.recommendations).toHaveLength(0);
  });

  it('should identify active planning phase and recommend incomplete required gates', () => {
    const planSkills: BmadSkillNode[] = [
      createMockSkill('bmad-prd', 'Create PRD', '2-plan', true, 'not-started'),
      createMockSkill('bmad-architecture', 'Architecture', '2-plan', true, 'not-started'),
      createMockSkill('bmad-ux', 'Create UX', '2-plan', false, 'not-started')
    ];

    const phases: BmadLifecyclePhase[] = [
      { id: '2-plan', label: 'Phase 2: Planning & Architecture', order: 2, skills: planSkills }
    ];

    const status = evaluateProjectStatus(phases);
    expect(status.activePhaseId).toBe('2-plan');
    expect(status.statusBarText).toContain('BMAD: Planning');
    expect(status.recommendations.length).toBeGreaterThan(0);

    const highPriority = status.recommendations.filter((r) => r.priority === 'high');
    expect(highPriority.some((r) => r.skill.skill === 'bmad-prd')).toBe(true);
    expect(highPriority.some((r) => r.skill.skill === 'bmad-architecture')).toBe(true);
  });

  it('should advance to Ship phase when all planning required gates are completed', () => {
    const planSkills: BmadSkillNode[] = [
      createMockSkill('bmad-prd', 'Create PRD', '2-plan', true, 'completed'),
      createMockSkill('bmad-architecture', 'Architecture', '2-plan', true, 'completed'),
      createMockSkill('bmad-create-epics-and-stories', 'Epics', '2-plan', true, 'completed'),
      createMockSkill('bmad-sprint-planning', 'Sprint Planning', '2-plan', true, 'completed')
    ];

    const shipSkills: BmadSkillNode[] = [
      createMockSkill('bmad-build', 'Build', 'ship', true, 'not-started'),
      createMockSkill('bmad-code-review', 'Code Review', 'ship', false, 'not-started'),
      createMockSkill('bmad-walkthrough', 'Walkthrough', 'ship', false, 'not-started')
    ];

    const phases: BmadLifecyclePhase[] = [
      { id: '2-plan', label: 'Phase 2: Planning & Architecture', order: 2, skills: planSkills },
      { id: 'ship', label: 'Phase 5: Ship & Review', order: 5, skills: shipSkills }
    ];

    const status = evaluateProjectStatus(phases);
    expect(status.activePhaseId).toBe('ship');
    expect(status.statusBarText).toContain('BMAD: Ship');

    const highPriority = status.recommendations.filter((r) => r.priority === 'high');
    expect(highPriority.some((r) => r.skill.skill === 'bmad-build')).toBe(true);
  });

  it('should recommend code review and walkthrough when build is completed in ship phase', () => {
    const shipSkills: BmadSkillNode[] = [
      createMockSkill('bmad-build', 'Build', 'ship', true, 'completed'),
      createMockSkill('bmad-code-review', 'Code Review', 'ship', false, 'not-started'),
      createMockSkill('bmad-walkthrough', 'Walkthrough', 'ship', false, 'not-started')
    ];

    const phases: BmadLifecyclePhase[] = [
      { id: 'ship', label: 'Phase 5: Ship & Review', order: 5, skills: shipSkills }
    ];

    const status = evaluateProjectStatus(phases);
    expect(status.activePhaseId).toBe('ship');
    expect(status.recommendations.some((r) => r.skill.skill === 'bmad-code-review')).toBe(true);
    expect(status.recommendations.some((r) => r.skill.skill === 'bmad-walkthrough')).toBe(true);
  });

  it('should recommend sprint status check when sprint-planning skill is present', () => {
    const anytimeSkills: BmadSkillNode[] = [
      createMockSkill('bmad-sprint-planning', 'Sprint Status', 'anytime', false, 'not-started', 'status')
    ];

    const phases: BmadLifecyclePhase[] = [
      {
        id: '2-plan',
        label: 'Phase 2: Planning & Architecture',
        order: 2,
        skills: [createMockSkill('bmad-prd', 'Create PRD', '2-plan', true, 'not-started')]
      },
      { id: 'anytime', label: 'Anytime', order: 6, skills: anytimeSkills }
    ];

    const status = evaluateProjectStatus(phases);
    expect(status.recommendations.some((r) => r.skill.skill === 'bmad-sprint-planning')).toBe(true);
  });
});
