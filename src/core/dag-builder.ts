import {
  BmadDagEdge,
  BmadDagNode,
  BmadDagNodeStatus,
  BmadDagPhaseGroup,
  BmadLifecyclePhase,
  BmadPipelineDag,
  BmadSkillNode
} from './types';
import { CANONICAL_PHASES, normalizePhase } from './lifecycle-parser';

/**
 * Built-in canonical prerequisite dependencies between standard BMAD skills.
 */
const SKILL_DEPENDENCY_RULES: Record<string, string[]> = {
  // Phase 2 requires Phase 1 outputs
  'bmad-prd': ['bmad-product-brief'],
  'bmad-architecture': ['bmad-prd'],
  'bmad-create-epics-and-stories': ['bmad-prd'],

  // Phase 3 requires Phase 2 outputs
  'bmad-spec': ['bmad-create-epics-and-stories', 'bmad-architecture'],
  'bmad-testarch-test-design': ['bmad-prd', 'bmad-architecture'],
  'bmad-testarch-atdd': ['bmad-spec'],
  'bmad-ux': ['bmad-product-brief'],

  // Phase 4 requires Phase 3 outputs
  'bmad-sprint-planning': ['bmad-create-epics-and-stories'],
  'bmad-build': ['bmad-spec', 'bmad-sprint-planning'],

  // Phase 5 requires Phase 4 outputs
  'bmad-code-review': ['bmad-build'],
  'bmad-retrospective': ['bmad-build'],
  'bmad-walkthrough': ['bmad-build']
};

/**
 * Known skill input/output mappings for rich detail drawer display.
 */
const SKILL_METADATA_REGISTRY: Record<string, { inputs: string[]; outputs: string[] }> = {
  'bmad-product-brief': {
    inputs: ['User Idea', 'Project Goals'],
    outputs: ['product-brief.md']
  },
  'bmad-prd': {
    inputs: ['product-brief.md', 'Market Research'],
    outputs: ['prd.md']
  },
  'bmad-architecture': {
    inputs: ['prd.md', 'System Requirements'],
    outputs: ['ARCHITECTURE-SPINE.md', 'architecture.md']
  },
  'bmad-create-epics-and-stories': {
    inputs: ['prd.md', 'ARCHITECTURE-SPINE.md'],
    outputs: ['epics.md']
  },
  'bmad-spec': {
    inputs: ['epics.md', 'ARCHITECTURE-SPINE.md'],
    outputs: ['spec-*.md']
  },
  'bmad-sprint-planning': {
    inputs: ['epics.md'],
    outputs: ['sprint-status.yaml']
  },
  'bmad-build': {
    inputs: ['spec-*.md', 'sprint-status.yaml'],
    outputs: ['Source Code', 'Unit Tests']
  },
  'bmad-code-review': {
    inputs: ['Git Diff', 'spec-*.md'],
    outputs: ['Review Findings']
  },
  'bmad-testarch-atdd': {
    inputs: ['spec-*.md'],
    outputs: ['Acceptance Test Scaffolds']
  },
  'bmad-retrospective': {
    inputs: ['Sprint Status', 'Completed Epics'],
    outputs: ['retrospective.md']
  },
  'bmad-walkthrough': {
    inputs: ['Git Diff', 'spec-*.md'],
    outputs: ['Walkthrough Report']
  }
};

/**
 * Builds the Pipeline DAG graph structure from skills and lifecycle phases.
 * Resolves prerequisite links, computes status colors, and identifies gate blockers (AD-6).
 */
export function buildPipelineDag(
  skills: BmadSkillNode[],
  phases?: BmadLifecyclePhase[]
): BmadPipelineDag {
  const skillMap = new Map<string, BmadSkillNode>();
  for (const s of skills) {
    skillMap.set(s.id, s);
  }

  // Pre-calculate completed skill IDs for dependency checking
  const completedSkillIds = new Set<string>();
  for (const s of skills) {
    const sStatus = s.artifactStatus || s.status;
    if (sStatus === 'completed') {
      completedSkillIds.add(s.id);
    }
  }

  const nodes: BmadDagNode[] = [];
  const edges: BmadDagEdge[] = [];
  const edgeKeys = new Set<string>();

  // Helper to add edge without duplication
  const addEdge = (source: string, target: string, type: 'sequence' | 'dependency' = 'dependency') => {
    const key = `${source}->${target}`;
    if (!edgeKeys.has(key) && source !== target) {
      edgeKeys.add(key);
      edges.push({ source, target, type });
    }
  };

  // Convert each skill into a DAG node
  for (const skill of skills) {
    const canonicalPhase = normalizePhase(skill.phase);
    const declaredPrereqs = SKILL_DEPENDENCY_RULES[skill.id] || [];

    // Filter prerequisites to those actually present in this project
    const presentPrereqs = declaredPrereqs.filter((pId) => skillMap.has(pId));

    // Determine status and potential blockers
    let status: BmadDagNodeStatus = 'pending';
    let blockerReason: string | undefined;

    const skillStatus = skill.artifactStatus || skill.status;
    if (skillStatus === 'completed') {
      status = 'completed';
    } else if (skillStatus === 'in-progress') {
      status = 'in-progress';
    } else {
      // Check if any prerequisite is incomplete
      const missingPrereqs = presentPrereqs.filter((pId) => !completedSkillIds.has(pId));
      if (missingPrereqs.length > 0) {
        status = 'blocked';
        blockerReason = `Blocked: Missing prerequisite skill(s): ${missingPrereqs.join(', ')}`;
      } else {
        status = 'pending';
      }
    }

    const metadata = SKILL_METADATA_REGISTRY[skill.id] || {
      inputs: ['Project Context'],
      outputs: ['Artifact / Code']
    };

    const dagNode: BmadDagNode = {
      id: skill.id,
      name: skill.name || skill.displayName || skill.skill,
      phaseId: canonicalPhase.id,
      phaseLabel: canonicalPhase.label,
      phaseOrder: canonicalPhase.order,
      description: skill.description || 'BMAD Skill',
      status,
      precededBy: presentPrereqs,
      followedBy: [],
      inputs: metadata.inputs,
      outputs: metadata.outputs,
      command: skill.command || skill.action || skill.menuCode || skill.skill,
      blockerReason
    };

    nodes.push(dagNode);

    // Register incoming dependency edges
    for (const prereqId of presentPrereqs) {
      addEdge(prereqId, skill.id, 'dependency');
    }
  }

  // Populate followedBy backlinks on nodes
  const nodeMap = new Map<string, BmadDagNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    if (sourceNode && !sourceNode.followedBy.includes(edge.target)) {
      sourceNode.followedBy.push(edge.target);
    }
  }

  // Group nodes by phase
  const phaseGroupMap = new Map<string, BmadDagPhaseGroup>();

  // Ensure canonical phases are initialized in order
  for (const phaseDef of CANONICAL_PHASES) {
    phaseGroupMap.set(phaseDef.id, {
      id: phaseDef.id,
      label: phaseDef.label,
      order: phaseDef.order,
      nodes: []
    });
  }

  for (const node of nodes) {
    let group = phaseGroupMap.get(node.phaseId);
    if (!group) {
      group = {
        id: node.phaseId,
        label: node.phaseLabel,
        order: node.phaseOrder,
        nodes: []
      };
      phaseGroupMap.set(node.phaseId, group);
    }
    group.nodes.push(node);
  }

  // Only return phase groups that have at least one node, sorted by order
  const phasesResult: BmadDagPhaseGroup[] = Array.from(phaseGroupMap.values())
    .filter((g) => g.nodes.length > 0)
    .sort((a, b) => a.order - b.order);

  // If consecutive phases have nodes without explicit edges, create sequential flow edges between phases
  for (let i = 0; i < phasesResult.length - 1; i++) {
    const currentPhase = phasesResult[i];
    const nextPhase = phasesResult[i + 1];

    if (currentPhase.id === 'anytime' || nextPhase.id === 'anytime') {
      continue;
    }

    // Check if any edge already connects these two phases
    const hasDirectEdge = edges.some((e) => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      return src?.phaseId === currentPhase.id && tgt?.phaseId === nextPhase.id;
    });

    if (!hasDirectEdge && currentPhase.nodes.length > 0 && nextPhase.nodes.length > 0) {
      // Connect last node of current phase to first node of next phase
      const srcNode = currentPhase.nodes[currentPhase.nodes.length - 1];
      const tgtNode = nextPhase.nodes[0];
      addEdge(srcNode.id, tgtNode.id, 'sequence');
      if (!srcNode.followedBy.includes(tgtNode.id)) {
        srcNode.followedBy.push(tgtNode.id);
      }
      if (!tgtNode.precededBy.includes(srcNode.id)) {
        tgtNode.precededBy.push(srcNode.id);
      }
    }
  }

  return {
    phases: phasesResult,
    nodes,
    edges
  };
}

/**
 * Validates whether a set of directed dependency edges contains any cyclic loops.
 */
export function hasDependencyCycle(edges: { from: string; to: string }[]): boolean {
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.from)) {
      adj.set(edge.from, []);
    }
    adj.get(edge.from)!.push(edge.to);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    inStack.add(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (inStack.has(neighbor)) {
        return true;
      }
    }

    inStack.delete(node);
    return false;
  }

  for (const node of adj.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) return true;
    }
  }

  return false;
}

/**
 * Validates adding a new directed dependency edge between skills.
 */
export function validateDependencyEdge(
  existingEdges: { from: string; to: string }[],
  newEdge: { from: string; to: string }
): { valid: boolean; reason?: string } {
  if (!newEdge.from || !newEdge.to) {
    return { valid: false, reason: 'Source and target skills must be defined.' };
  }
  if (newEdge.from === newEdge.to) {
    return { valid: false, reason: 'Self-referencing dependency loops are not permitted.' };
  }
  const duplicate = existingEdges.some(
    (e) => e.from === newEdge.from && e.to === newEdge.to
  );
  if (duplicate) {
    return { valid: false, reason: 'Dependency edge already exists.' };
  }
  const updated = [...existingEdges, newEdge];
  if (hasDependencyCycle(updated)) {
    return { valid: false, reason: 'Adding this dependency introduces a cyclic deadlock.' };
  }
  return { valid: true };
}

