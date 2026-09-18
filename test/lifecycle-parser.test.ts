import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  normalizePhase,
  detectSkillArtifactStatus,
  parseLifecycleHelp,
  CANONICAL_PHASES
} from '../src/core/lifecycle-parser';
import { BmadResolvedPaths } from '../src/core/types';

describe('LifecycleParser', () => {
  let tempDir: string;
  let mockPaths: BmadResolvedPaths;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bmad-lifecycle-test-'));
    mockPaths = {
      outputFolder: path.join(tempDir, '_bmad-output'),
      planningArtifacts: path.join(tempDir, '_bmad-output', 'planning-artifacts'),
      implementationArtifacts: path.join(tempDir, '_bmad-output', 'implementation-artifacts'),
      testArtifacts: path.join(tempDir, '_bmad-output', 'test-artifacts'),
      projectKnowledge: path.join(tempDir, 'docs')
    };
    await fs.promises.mkdir(mockPaths.planningArtifacts, { recursive: true });
    await fs.promises.mkdir(mockPaths.implementationArtifacts, { recursive: true });
    await fs.promises.mkdir(mockPaths.testArtifacts, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe('normalizePhase', () => {
    it('should map various planning aliases to 2-plan', () => {
      expect(normalizePhase('2-planning').id).toBe('2-plan');
      expect(normalizePhase('plan').id).toBe('2-plan');
      expect(normalizePhase('planning').id).toBe('2-plan');
      expect(normalizePhase('2-plan').id).toBe('2-plan');
    });

    it('should map 0-learning correctly', () => {
      expect(normalizePhase('0-learning').id).toBe('0-learning');
      expect(normalizePhase('learning').id).toBe('0-learning');
    });

    it('should map ship correctly', () => {
      expect(normalizePhase('ship').id).toBe('ship');
      expect(normalizePhase('release').id).toBe('ship');
    });

    it('should fallback to anytime for unknown or undefined phase', () => {
      expect(normalizePhase(undefined).id).toBe('anytime');
      expect(normalizePhase('').id).toBe('anytime');
      expect(normalizePhase('unknown-phase-xyz').id).toBe('anytime');
    });
  });

  describe('detectSkillArtifactStatus', () => {
    it('should return not-started when no artifacts exist', () => {
      const result = detectSkillArtifactStatus('bmad-prd', mockPaths, tempDir);
      expect(result.status).toBe('not-started');
      expect(result.artifactPath).toBeUndefined();
    });

    it('should detect completed PRD when prd markdown exists', async () => {
      const prdDir = path.join(mockPaths.planningArtifacts, 'prds');
      await fs.promises.mkdir(prdDir, { recursive: true });
      const prdFile = path.join(prdDir, 'prd.md');
      await fs.promises.writeFile(prdFile, '# Product Requirements Document\nstatus: approved\n');

      const result = detectSkillArtifactStatus('bmad-prd', mockPaths, tempDir);
      expect(result.status).toBe('completed');
      expect(result.artifactPath).toBe(prdFile);
    });

    it('should detect in-progress PRD when draft status is present', async () => {
      const prdDir = path.join(mockPaths.planningArtifacts, 'prds');
      await fs.promises.mkdir(prdDir, { recursive: true });
      const prdFile = path.join(prdDir, 'prd.md');
      await fs.promises.writeFile(prdFile, '---\nstatus: "draft"\n---\n# Draft PRD');

      const result = detectSkillArtifactStatus('bmad-prd', mockPaths, tempDir);
      expect(result.status).toBe('in-progress');
    });

    it('should detect completed epics.md for bmad-create-epics-and-stories', async () => {
      const epicsFile = path.join(mockPaths.planningArtifacts, 'epics.md');
      await fs.promises.writeFile(epicsFile, '# Epics & Stories');

      const result = detectSkillArtifactStatus('bmad-create-epics-and-stories', mockPaths, tempDir);
      expect(result.status).toBe('completed');
      expect(result.artifactPath).toBe(epicsFile);
    });

    it('should detect completed sprint-status.yaml for bmad-sprint-planning', async () => {
      const sprintFile = path.join(mockPaths.implementationArtifacts, 'sprint-status.yaml');
      await fs.promises.writeFile(sprintFile, 'development_status: {}');

      const result = detectSkillArtifactStatus('bmad-sprint-planning', mockPaths, tempDir);
      expect(result.status).toBe('completed');
      expect(result.artifactPath).toBe(sprintFile);
    });

    it('should detect completed spec for bmad-build', async () => {
      const specFile = path.join(mockPaths.implementationArtifacts, 'spec-1-1.md');
      await fs.promises.writeFile(specFile, '# Spec 1.1');

      const result = detectSkillArtifactStatus('bmad-build', mockPaths, tempDir);
      expect(result.status).toBe('completed');
      expect(result.artifactPath).toBe(specFile);
    });
  });

  describe('parseLifecycleHelp', () => {
    const sampleCsv = `module,skill,display-name,menu-code,description,action,args,phase,preceded-by,followed-by,required,output-location,outputs
BMad Builder,_meta,,,,,,,,,false,https://example.com,
BMad Method,bmad-prd,Create PRD,PRD,Create PRD,,,2-planning,,,true,planning_artifacts,prd
BMad Method,bmad-architecture,Architecture,CA,Technical architecture,,,plan,,,true,planning_artifacts,architecture
BMad Method,bmad-build,Build,BD,Implement story,,,ship,,,true,implementation_artifacts,spec
Core,bmad-review,Review,RV,Adversarial review,,,anytime,,,false,,findings
Test Architecture Enterprise,bmad-teach-me-testing,Teach Me Testing,TMT,Testing basics,,,0-learning,,,false,test_artifacts,notes
`;

    it('should parse CSV content and sort phases canonically', () => {
      const phases = parseLifecycleHelp(sampleCsv, mockPaths, tempDir);

      // Should exclude _meta
      const allSkills = phases.flatMap((p) => p.skills);
      expect(allSkills.some((s) => s.skill === '_meta')).toBe(false);
      expect(allSkills.length).toBe(5);

      // Verify phase ordering
      const phaseIds = phases.map((p) => p.id);
      expect(phaseIds).toEqual(['0-learning', '2-plan', 'ship', 'anytime']);

      // Check required gates
      const prdSkill = allSkills.find((s) => s.skill === 'bmad-prd');
      expect(prdSkill?.required).toBe(true);
      expect(prdSkill?.menuCode).toBe('PRD');

      const reviewSkill = allSkills.find((s) => s.skill === 'bmad-review');
      expect(reviewSkill?.required).toBe(false);
    });

    it('should gracefully handle empty or invalid CSV content', () => {
      expect(parseLifecycleHelp('', mockPaths, tempDir)).toEqual([]);
      expect(parseLifecycleHelp('invalid-no-columns', mockPaths, tempDir)).toEqual([]);
    });

    it('should correctly parse the real bmad-help.csv when present in workspace', async () => {
      const realHelpPath = path.resolve(__dirname, '../_bmad/_config/bmad-help.csv');
      if (fs.existsSync(realHelpPath)) {
        const content = await fs.promises.readFile(realHelpPath, 'utf8');
        const realRoot = path.resolve(__dirname, '..');
        const phases = parseLifecycleHelp(content, mockPaths, realRoot);

        expect(phases.length).toBeGreaterThan(3);
        const allSkills = phases.flatMap((p) => p.skills);
        expect(allSkills.some((s) => s.skill === 'bmad-prd')).toBe(true);
        expect(allSkills.some((s) => s.skill === 'bmad-build')).toBe(true);
      }
    });
  });
});
