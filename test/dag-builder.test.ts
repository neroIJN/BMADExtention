import { describe, it, expect } from 'vitest';
import { buildPipelineDag } from '../src/core/dag-builder';
import { BmadSkillNode } from '../src/core/types';

describe('Pipeline DagBuilder', () => {
  it('should return an empty DAG when no skills are provided', () => {
    const dag = buildPipelineDag([]);
    expect(dag.nodes).toHaveLength(0);
    expect(dag.edges).toHaveLength(0);
    expect(dag.phases).toHaveLength(0);
  });

  it('should convert skills into DAG nodes and sort phases canonically', () => {
    const skills: BmadSkillNode[] = [
      {
        id: 'bmad-build',
        name: 'Build Implementation',
        description: 'Turns implementation work into working code',
        phase: '4-implementation',
        command: '/bmad-build',
        artifactStatus: 'not-started'
      },
      {
        id: 'bmad-product-brief',
        name: 'Product Brief',
        description: 'Create product brief',
        phase: '1-analysis',
        command: '/bmad-product-brief',
        artifactStatus: 'completed'
      },
      {
        id: 'bmad-prd',
        name: 'Product Requirements Document',
        description: 'Define PRD',
        phase: '2-plan',
        command: '/bmad-prd',
        artifactStatus: 'in-progress'
      }
    ];

    const dag = buildPipelineDag(skills);
    expect(dag.nodes).toHaveLength(3);

    // Phases should be sorted canonically (1-analysis before 2-plan before 4-implementation)
    expect(dag.phases.map((p) => p.id)).toEqual(['1-analysis', '2-plan', '4-implementation']);

    const briefNode = dag.nodes.find((n) => n.id === 'bmad-product-brief');
    expect(briefNode?.status).toBe('completed');

    const prdNode = dag.nodes.find((n) => n.id === 'bmad-prd');
    expect(prdNode?.status).toBe('in-progress');
  });

  it('should detect prerequisite gate blockers when dependencies are incomplete', () => {
    const skills: BmadSkillNode[] = [
      {
        id: 'bmad-prd',
        name: 'PRD',
        description: 'Define PRD',
        phase: '2-plan',
        command: '/bmad-prd',
        artifactStatus: 'not-started'
      },
      {
        id: 'bmad-architecture',
        name: 'Architecture',
        description: 'Define architecture',
        phase: '2-plan',
        command: '/bmad-architecture',
        artifactStatus: 'not-started'
      }
    ];

    // Since bmad-prd is not completed, bmad-architecture (which depends on bmad-prd) must be blocked
    const dag = buildPipelineDag(skills);
    const archNode = dag.nodes.find((n) => n.id === 'bmad-architecture');

    expect(archNode?.status).toBe('blocked');
    expect(archNode?.blockerReason).toContain('Blocked: Missing prerequisite skill(s): bmad-prd');
  });

  it('should mark skill as pending when all prerequisites are satisfied', () => {
    const skills: BmadSkillNode[] = [
      {
        id: 'bmad-prd',
        name: 'PRD',
        description: 'Define PRD',
        phase: '2-plan',
        command: '/bmad-prd',
        artifactStatus: 'completed'
      },
      {
        id: 'bmad-architecture',
        name: 'Architecture',
        description: 'Define architecture',
        phase: '2-plan',
        command: '/bmad-architecture',
        artifactStatus: 'not-started'
      }
    ];

    const dag = buildPipelineDag(skills);
    const archNode = dag.nodes.find((n) => n.id === 'bmad-architecture');

    expect(archNode?.status).toBe('pending');
    expect(archNode?.blockerReason).toBeUndefined();
  });

  it('should establish directed dependency edges and followedBy references', () => {
    const skills: BmadSkillNode[] = [
      {
        id: 'bmad-prd',
        name: 'PRD',
        description: 'PRD',
        phase: '2-plan',
        command: '/bmad-prd',
        artifactStatus: 'completed'
      },
      {
        id: 'bmad-architecture',
        name: 'Architecture',
        description: 'Architecture',
        phase: '2-plan',
        command: '/bmad-architecture',
        artifactStatus: 'completed'
      },
      {
        id: 'bmad-create-epics-and-stories',
        name: 'Epics & Stories',
        description: 'Epics',
        phase: '2-plan',
        command: '/bmad-create-epics-and-stories',
        artifactStatus: 'completed'
      }
    ];

    const dag = buildPipelineDag(skills);
    const prdNode = dag.nodes.find((n) => n.id === 'bmad-prd');

    expect(prdNode?.followedBy).toContain('bmad-architecture');
    expect(prdNode?.followedBy).toContain('bmad-create-epics-and-stories');

    const edgeToArch = dag.edges.find(
      (e) => e.source === 'bmad-prd' && e.target === 'bmad-architecture'
    );
    expect(edgeToArch).toBeDefined();
    expect(edgeToArch?.type).toBe('dependency');
  });
});
