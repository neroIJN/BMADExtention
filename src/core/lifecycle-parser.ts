import * as fs from 'fs';
import * as path from 'path';
import { parse as parseCsv } from 'csv-parse/sync';
import {
  ArtifactStatus,
  BmadLifecyclePhase,
  BmadResolvedPaths,
  BmadSkillNode
} from './types';

/**
 * Definition of canonical lifecycle phases in the BMAD Method.
 */
export interface CanonicalPhaseDef {
  id: string;
  label: string;
  aliases: string[];
  order: number;
}

export const CANONICAL_PHASES: CanonicalPhaseDef[] = [
  { id: '0-learning', label: 'Phase 0: Learning & Setup', aliases: ['0-learning', 'learning', '0'], order: 0 },
  { id: '1-analysis', label: 'Phase 1: Analysis & Discovery', aliases: ['1-analysis', 'analysis', '1'], order: 1 },
  { id: '2-plan', label: 'Phase 2: Planning & Architecture', aliases: ['2-planning', 'plan', 'planning', '2-plan', '2'], order: 2 },
  { id: '3-solutioning', label: 'Phase 3: Solutioning & Test Design', aliases: ['3-solutioning', 'solutioning', '3'], order: 3 },
  { id: '4-implementation', label: 'Phase 4: Implementation & ATDD', aliases: ['4-implementation', 'implementation', '4'], order: 4 },
  { id: 'ship', label: 'Phase 5: Ship, Review & Retrospective', aliases: ['ship', 'release', '5-ship', '5'], order: 5 },
  { id: 'anytime', label: 'Anytime & Cross-Cutting Utilities', aliases: ['anytime', 'utility', 'cross-cutting', 'general'], order: 6 }
];

/**
 * Normalizes an arbitrary phase identifier from config or CSV into a canonical phase.
 */
export function normalizePhase(rawPhase?: string): CanonicalPhaseDef {
  if (!rawPhase) {
    return CANONICAL_PHASES.find((p) => p.id === 'anytime')!;
  }
  const lower = rawPhase.trim().toLowerCase();
  for (const phase of CANONICAL_PHASES) {
    if (phase.id === lower || phase.aliases.includes(lower)) {
      return phase;
    }
  }
  return CANONICAL_PHASES.find((p) => p.id === 'anytime')!;
}

/**
 * Recursively search a directory for files matching a predicate or pattern (depth capped at 3).
 */
function findMatchingFile(
  dir: string,
  predicate: (fileName: string, fullPath: string) => boolean,
  depth = 0
): string | undefined {
  if (depth > 3 || !fs.existsSync(dir)) {
    return undefined;
  }

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && predicate(entry.name, fullPath)) {
        return fullPath;
      }
      if (entry.isDirectory()) {
        const nested = findMatchingFile(fullPath, predicate, depth + 1);
        if (nested) {
          return nested;
        }
      }
    }
  } catch {
    // Ignore permission or file read errors
  }
  return undefined;
}

/**
 * Determine artifact completion state for a given BMAD skill.
 */
export function detectSkillArtifactStatus(
  skillId: string,
  paths: BmadResolvedPaths,
  rootPath: string
): { status: ArtifactStatus; artifactPath?: string } {
  switch (skillId) {
    case 'bmad-prd': {
      const planningDir = paths.planningArtifacts;
      const found = findMatchingFile(planningDir, (name) => /prd.*\.md$/i.test(name));
      if (found) {
        try {
          const content = fs.readFileSync(found, 'utf8');
          const isDraft = /status:\s*['"]?draft['"]?/i.test(content);
          return { status: isDraft ? 'in-progress' : 'completed', artifactPath: found };
        } catch {
          return { status: 'completed', artifactPath: found };
        }
      }
      return { status: 'not-started' };
    }

    case 'bmad-architecture': {
      const planningDir = paths.planningArtifacts;
      const found = findMatchingFile(planningDir, (name) =>
        /architecture.*\.md$/i.test(name) || /spine.*\.md$/i.test(name)
      );
      if (found) {
        return { status: 'completed', artifactPath: found };
      }
      return { status: 'not-started' };
    }

    case 'bmad-create-epics-and-stories': {
      const planningDir = paths.planningArtifacts;
      const found = findMatchingFile(planningDir, (name) => /epics.*\.md$/i.test(name));
      if (found) {
        return { status: 'completed', artifactPath: found };
      }
      return { status: 'not-started' };
    }

    case 'bmad-sprint-planning': {
      const implDir = paths.implementationArtifacts;
      const found = findMatchingFile(implDir, (name) => /sprint-status\.ya?ml$/i.test(name));
      if (found) {
        return { status: 'completed', artifactPath: found };
      }
      return { status: 'not-started' };
    }

    case 'bmad-build': {
      const implDir = paths.implementationArtifacts;
      const found = findMatchingFile(implDir, (name) => /spec-.*\.md$/i.test(name));
      if (found) {
        return { status: 'completed', artifactPath: found };
      }
      return { status: 'not-started' };
    }

    case 'bmad-ux': {
      const planningDir = paths.planningArtifacts;
      const found = findMatchingFile(planningDir, (name) =>
        /design.*\.md$/i.test(name) || /experience.*\.md$/i.test(name) || /ux.*\.md$/i.test(name)
      );
      if (found) {
        return { status: 'completed', artifactPath: found };
      }
      return { status: 'not-started' };
    }

    case 'bmad-product-brief': {
      const planningDir = paths.planningArtifacts;
      const found = findMatchingFile(planningDir, (name) => /brief.*\.md$/i.test(name));
      if (found) {
        return { status: 'completed', artifactPath: found };
      }
      return { status: 'not-started' };
    }

    case 'bmad-prfaq': {
      const planningDir = paths.planningArtifacts;
      const found = findMatchingFile(planningDir, (name) => /prfaq.*\.md$/i.test(name));
      if (found) {
        return { status: 'completed', artifactPath: found };
      }
      return { status: 'not-started' };
    }

    case 'bmad-retrospective': {
      const implDir = paths.implementationArtifacts;
      const found = findMatchingFile(implDir, (name) => /retro.*\.md$/i.test(name));
      if (found) {
        return { status: 'completed', artifactPath: found };
      }
      return { status: 'not-started' };
    }

    case 'bmad-project-context': {
      const agentsMd = path.join(rootPath, 'AGENTS.md');
      if (fs.existsSync(agentsMd)) {
        return { status: 'completed', artifactPath: agentsMd };
      }
      return { status: 'not-started' };
    }

    case 'bmad-teach-me-testing': {
      const testDir = paths.testArtifacts;
      const found = findMatchingFile(testDir, (name) => /teach|session/i.test(name));
      if (found) {
        return { status: 'completed', artifactPath: found };
      }
      return { status: 'not-started' };
    }

    case 'bmad-testarch-test-design': {
      const testDir = paths.testArtifacts;
      const found = findMatchingFile(testDir, (name) => /test-design|test-plan/i.test(name));
      if (found) {
        return { status: 'completed', artifactPath: found };
      }
      return { status: 'not-started' };
    }

    case 'bmad-testarch-framework': {
      // Check for test configs in root or test artifacts
      const configs = ['playwright.config.ts', 'cypress.config.ts', 'vitest.config.ts', 'jest.config.js'];
      for (const cfg of configs) {
        const p = path.join(rootPath, cfg);
        if (fs.existsSync(p)) {
          return { status: 'completed', artifactPath: p };
        }
      }
      return { status: 'not-started' };
    }

    case 'bmad-testarch-ci': {
      const ghWorkflows = path.join(rootPath, '.github', 'workflows');
      if (fs.existsSync(ghWorkflows)) {
        return { status: 'completed', artifactPath: ghWorkflows };
      }
      return { status: 'not-started' };
    }

    default:
      return { status: 'not-started' };
  }
}

/**
 * Raw record interface matching bmad-help.csv columns.
 */
interface CsvSkillRecord {
  module?: string;
  skill?: string;
  'display-name'?: string;
  'menu-code'?: string;
  description?: string;
  action?: string;
  args?: string;
  phase?: string;
  'preceded-by'?: string;
  'followed-by'?: string;
  required?: string;
  'output-location'?: string;
  outputs?: string;
}

/**
 * Parse `bmad-help.csv` content and group skills into canonical lifecycle phases
 * with completion and gate detection.
 *
 * @param csvContent String content of bmad-help.csv
 * @param paths Resolved BMAD artifact paths
 * @param rootPath Root workspace path
 * @returns Array of BmadLifecyclePhase items sorted canonically
 */
export function parseLifecycleHelp(
  csvContent: string,
  paths: BmadResolvedPaths,
  rootPath: string
): BmadLifecyclePhase[] {
  if (!csvContent || typeof csvContent !== 'string') {
    return [];
  }

  let records: CsvSkillRecord[] = [];
  try {
    records = parseCsv(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as CsvSkillRecord[];
  } catch {
    return [];
  }

  // Group skills by canonical phase ID
  const phaseMap = new Map<string, BmadSkillNode[]>();
  for (const p of CANONICAL_PHASES) {
    phaseMap.set(p.id, []);
  }

  for (const record of records) {
    const skill = record.skill?.trim();
    if (!skill || skill === '_meta') {
      continue;
    }

    const canonical = normalizePhase(record.phase);
    const required = record.required?.toLowerCase() === 'true';
    const { status, artifactPath } = detectSkillArtifactStatus(skill, paths, rootPath);

    const node: BmadSkillNode = {
      id: skill,
      module: record.module || 'BMAD',
      skill,
      displayName: record['display-name'] || skill,
      menuCode: record['menu-code'],
      description: record.description,
      action: record.action,
      args: record.args,
      phase: canonical.id,
      precededBy: record['preceded-by'],
      followedBy: record['followed-by'],
      required,
      outputLocation: record['output-location'],
      outputs: record.outputs,
      status,
      artifactPath
    };

    const phaseSkills = phaseMap.get(canonical.id);
    if (phaseSkills) {
      phaseSkills.push(node);
    }
  }

  // Construct sorted array of phases containing at least one skill
  const result: BmadLifecyclePhase[] = [];
  for (const def of CANONICAL_PHASES) {
    const skills = phaseMap.get(def.id) || [];
    if (skills.length > 0) {
      result.push({
        id: def.id,
        label: def.label,
        order: def.order,
        skills
      });
    }
  }

  return result;
}
