import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  extractFunctionalRequirements,
  parseTraceabilityArtifact,
  mapRequirementsToTests,
  analyzeTeaQuality
} from '../src/core/tea-analyzer';

describe('TeaAnalyzer', () => {
  const samplePrd = `# Product Requirements Document

## Functional Requirements
### FR-1: Workspace Detection Engine
The system will automatically detect if the workspace contains BMAD manifests.

### FR-2: Configuration and Path Resolver
The system will parse config.toml and resolve all tokenized filesystem paths.

### FR-3: Persistent Status Bar Indicator
The system will display active phase and next recommendation in the status bar.
`;

  describe('extractFunctionalRequirements', () => {
    it('should extract functional requirements from PRD markdown', () => {
      const frs = extractFunctionalRequirements(samplePrd);
      expect(frs).toHaveLength(3);
      expect(frs[0].id).toBe('FR-1');
      expect(frs[0].title).toBe('Workspace Detection Engine');
      expect(frs[0].description).toContain('automatically detect');

      expect(frs[1].id).toBe('FR-2');
      expect(frs[1].title).toBe('Configuration and Path Resolver');

      expect(frs[2].id).toBe('FR-3');
      expect(frs[2].title).toBe('Persistent Status Bar Indicator');
    });

    it('should return empty list if no FRs are found', () => {
      const text = '# Simple Notes\nJust an idea about coding.';
      const frs = extractFunctionalRequirements(text);
      expect(frs).toEqual([]);
    });
  });

  describe('parseTraceabilityArtifact', () => {
    const tableMarkdown = `# Traceability Matrix

| Requirement | Title | Test Scaffolds | Quality Status |
| :--- | :--- | :--- | :--- |
| FR-1 | Workspace Detection | test/workspace-detector.test.ts | COVERED |
| FR-2 | Configuration Resolver | test/config-resolver.test.ts | COVERED |
| FR-3 | Status Bar Helper | - | UNCOVERED |
`;

    it('should parse markdown table rows into requirement traces', () => {
      const traces = parseTraceabilityArtifact(tableMarkdown, '/mock');
      expect(traces).toHaveLength(3);

      expect(traces[0].id).toBe('FR-1');
      expect(traces[0].status).toBe('covered');
      expect(traces[0].mappedTestFiles).toContain('test/workspace-detector.test.ts');

      expect(traces[1].id).toBe('FR-2');
      expect(traces[1].status).toBe('covered');

      expect(traces[2].id).toBe('FR-3');
      expect(traces[2].status).toBe('uncovered');
      expect(traces[2].mappedTestFiles).toHaveLength(0);
    });
  });

  describe('mapRequirementsToTests', () => {
    it('should map requirements to matching test files by keyword', () => {
      const reqs = [
        { id: 'FR-1', title: 'Workspace Detection Engine' },
        { id: 'FR-2', title: 'Payment Processing Gateway' }
      ];

      const testFiles = ['/app/test/workspace-detector.test.ts', '/app/test/other.test.ts'];

      const traces = mapRequirementsToTests(reqs, testFiles, '/app');
      expect(traces).toHaveLength(2);

      expect(traces[0].id).toBe('FR-1');
      expect(traces[0].status).toBe('covered');
      expect(traces[0].mappedTestFiles).toContain('test/workspace-detector.test.ts');

      expect(traces[1].id).toBe('FR-2');
      expect(traces[1].status).toBe('uncovered');
      expect(traces[1].mappedTestFiles).toHaveLength(0);
    });
  });

  describe('analyzeTeaQuality', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-tea-test-'));
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should compute quality score and recommendations from workspace files', async () => {
      // Create PRD file
      const prdDir = path.join(tempDir, 'docs');
      fs.mkdirSync(prdDir, { recursive: true });
      fs.writeFileSync(path.join(prdDir, 'prd.md'), samplePrd);

      // Create test files
      const testDir = path.join(tempDir, 'test');
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, 'workspace-detector.test.ts'), '// test');
      fs.writeFileSync(path.join(testDir, 'config-resolver.test.ts'), '// test');

      const report = await analyzeTeaQuality(tempDir, {
        prdPath: path.join(prdDir, 'prd.md')
      });

      expect(report.totalRequirements).toBe(3);
      expect(report.coveredRequirements + report.partialRequirements).toBeGreaterThanOrEqual(2);
      expect(report.uncoveredRequirements).toBeGreaterThanOrEqual(1);
      expect(report.qualityScore).toBeGreaterThan(50);
      expect(report.recommendations.some((r) => r.includes('Scaffold acceptance tests'))).toBe(true);
      expect(report.atddChecklist).toHaveLength(4);
    });
  });
});
