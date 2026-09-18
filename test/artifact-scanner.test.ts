import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  formatFileSize,
  determineArtifactCategory,
  scanWorkspaceArtifacts
} from '../src/core/artifact-scanner';
import { BmadResolvedPaths } from '../src/core/types';

describe('ArtifactScanner', () => {
  describe('formatFileSize', () => {
    it('should format bytes properly', () => {
      expect(formatFileSize(-10)).toBe('0 B');
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(450)).toBe('450 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(2500)).toBe('2.4 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(5242880)).toBe('5.0 MB');
    });
  });

  describe('determineArtifactCategory', () => {
    it('should categorize planning deliverables', () => {
      expect(determineArtifactCategory('_bmad-output/planning-artifacts/prds/prd.md')).toBe('planning');
      expect(determineArtifactCategory('_bmad-output/planning-artifacts/epics.md')).toBe('planning');
      expect(determineArtifactCategory('docs/product-brief.md')).toBe('planning');
      expect(determineArtifactCategory('prfaq-summary.md')).toBe('planning');
    });

    it('should categorize architecture deliverables', () => {
      expect(
        determineArtifactCategory('_bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md')
      ).toBe('architecture');
      expect(determineArtifactCategory('architecture.md')).toBe('architecture');
      expect(determineArtifactCategory('solution-design.md')).toBe('architecture');
    });

    it('should categorize implementation & sprint deliverables', () => {
      expect(
        determineArtifactCategory('_bmad-output/implementation-artifacts/spec-1-1-setup.md')
      ).toBe('implementation');
      expect(
        determineArtifactCategory('_bmad-output/implementation-artifacts/sprint-status.yaml')
      ).toBe('implementation');
      expect(determineArtifactCategory('epic-1-retrospective.md')).toBe('implementation');
    });

    it('should categorize testing deliverables', () => {
      expect(determineArtifactCategory('_bmad-output/test-artifacts/test-plan.md')).toBe('test');
      expect(determineArtifactCategory('tests/traceability-matrix.md')).toBe('test');
      expect(determineArtifactCategory('test-design.yaml')).toBe('test');
    });

    it('should fall back to other for unclassified files', () => {
      expect(determineArtifactCategory('docs/notes.txt')).toBe('other');
      expect(determineArtifactCategory('random-file.json')).toBe('other');
    });
  });

  describe('scanWorkspaceArtifacts', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-artifacts-test-'));
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should return empty categories when directories do not exist', async () => {
      const categories = await scanWorkspaceArtifacts(tempDir);
      expect(categories).toEqual([]);
    });

    it('should scan and categorize artifacts from _bmad-output directory', async () => {
      // Create directories
      const planningDir = path.join(tempDir, '_bmad-output', 'planning-artifacts', 'prds');
      const archDir = path.join(tempDir, '_bmad-output', 'planning-artifacts', 'architecture');
      const implDir = path.join(tempDir, '_bmad-output', 'implementation-artifacts');
      const testDir = path.join(tempDir, '_bmad-output', 'test-artifacts');
      const ignoredNodeModules = path.join(tempDir, '_bmad-output', 'node_modules');

      fs.mkdirSync(planningDir, { recursive: true });
      fs.mkdirSync(archDir, { recursive: true });
      fs.mkdirSync(implDir, { recursive: true });
      fs.mkdirSync(testDir, { recursive: true });
      fs.mkdirSync(ignoredNodeModules, { recursive: true });

      // Create sample files
      fs.writeFileSync(path.join(planningDir, 'prd.md'), '# PRD Content');
      fs.writeFileSync(path.join(archDir, 'ARCHITECTURE-SPINE.md'), '# Spine Content');
      fs.writeFileSync(path.join(implDir, 'spec-1-1.md'), '# Spec Content');
      fs.writeFileSync(path.join(implDir, 'sprint-status.yaml'), 'project: test');
      fs.writeFileSync(path.join(testDir, 'test-plan.md'), '# Test Plan');
      fs.writeFileSync(path.join(ignoredNodeModules, 'ignored.js'), 'console.log()');
      fs.writeFileSync(path.join(implDir, '.DS_Store'), 'junk');
      fs.writeFileSync(path.join(implDir, 'spec.tmp'), 'temp');

      const categories = await scanWorkspaceArtifacts(tempDir);

      expect(categories.length).toBe(4);

      const planningCat = categories.find((c) => c.id === 'planning');
      expect(planningCat).toBeDefined();
      expect(planningCat?.artifacts).toHaveLength(1);
      expect(planningCat?.artifacts[0].fileName).toBe('prd.md');
      expect(planningCat?.artifacts[0].extension).toBe('.md');
      expect(planningCat?.artifacts[0].sizeBytes).toBeGreaterThan(0);

      const archCat = categories.find((c) => c.id === 'architecture');
      expect(archCat).toBeDefined();
      expect(archCat?.artifacts).toHaveLength(1);
      expect(archCat?.artifacts[0].fileName).toBe('ARCHITECTURE-SPINE.md');

      const implCat = categories.find((c) => c.id === 'implementation');
      expect(implCat).toBeDefined();
      expect(implCat?.artifacts).toHaveLength(2);
      expect(implCat?.artifacts.map((a) => a.fileName)).toEqual(['spec-1-1.md', 'sprint-status.yaml']);

      const testCat = categories.find((c) => c.id === 'test');
      expect(testCat).toBeDefined();
      expect(testCat?.artifacts).toHaveLength(1);
      expect(testCat?.artifacts[0].fileName).toBe('test-plan.md');

      // Verify ignored files weren't included
      const allFileNames = categories.flatMap((c) => c.artifacts.map((a) => a.fileName));
      expect(allFileNames).not.toContain('ignored.js');
      expect(allFileNames).not.toContain('.DS_Store');
      expect(allFileNames).not.toContain('spec.tmp');
    });

    it('should respect custom resolvedPaths', async () => {
      const customDocs = path.join(tempDir, 'custom-docs');
      fs.mkdirSync(customDocs, { recursive: true });
      fs.writeFileSync(path.join(customDocs, 'prd.md'), 'custom prd');

      const resolvedPaths: BmadResolvedPaths = {
        outputFolder: customDocs,
        planningArtifacts: customDocs,
        implementationArtifacts: '',
        testArtifacts: '',
        projectKnowledge: ''
      };

      const categories = await scanWorkspaceArtifacts(tempDir, resolvedPaths);
      expect(categories.length).toBe(1);
      expect(categories[0].id).toBe('planning');
      expect(categories[0].artifacts[0].fileName).toBe('prd.md');
    });
  });
});
