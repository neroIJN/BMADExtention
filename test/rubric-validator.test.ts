import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  validatePrdDocument,
  parseValidationReport,
  findValidationReports
} from '../src/core/rubric-validator';

describe('RubricValidator', () => {
  const completePrd = `# Product Requirements Document (PRD)

## Overview & Intent
This document describes the budgeting mobile app designed to reduce anxiety around personal finance.

## User Personas & User Journeys
### Actor: Alex
Alex is an anxious first-time budgeter who dislikes complicated bank feeds.
1. Alex signs up.
2. Alex sees pre-categorized expenses.

## Functional Requirements (FRs)
### FR-1: Account Aggregation
The system will connect to banking APIs.
- **Acceptance Criteria:**
  - Given valid credentials, system syncs within 3 seconds.

## Non-Functional Requirements (NFRs)
- **NFR-1:** API response time latency < 300ms for 95% of requests.
- **NFR-2:** Security encryption using AES-256.

## Scope & Boundaries
- Multi-currency accounts are out of scope for v1.
`;

  const incompletePrdWithIssues = `# Draft Spec

## Overview
Quick draft of something.

TODO: Flesh out the functional requirements later.
We need the app to be fast and intuitive.
`;

  describe('validatePrdDocument', () => {
    it('should validate a complete PRD and return PASS verdict', () => {
      const report = validatePrdDocument(completePrd, 'docs/prd.md');
      expect(report.verdict).toBe('PASS');
      expect(report.score).toBeGreaterThanOrEqual(80);
      expect(report.summary.critical).toBe(0);
      expect(report.summary.high).toBe(0);
      expect(report.findings).toHaveLength(0);
    });

    it('should identify missing sections as critical or high findings', () => {
      const report = validatePrdDocument(incompletePrdWithIssues, 'docs/draft.md');
      expect(report.verdict).toBe('FAIL');
      expect(report.summary.critical).toBeGreaterThan(0);

      const missingFr = report.findings.find((f) => f.title.includes('Functional Requirements'));
      expect(missingFr).toBeDefined();
      expect(missingFr?.severity).toBe('critical');

      const missingNfr = report.findings.find((f) => f.title.includes('Non-Functional Requirements'));
      expect(missingNfr).toBeDefined();
      expect(missingNfr?.severity).toBe('high');
    });

    it('should pinpoint exact line numbers for placeholders and vague words', () => {
      const report = validatePrdDocument(incompletePrdWithIssues, 'docs/draft.md');

      // Check TODO finding
      const todoFinding = report.findings.find((f) => f.category === 'placeholder');
      expect(todoFinding).toBeDefined();
      expect(todoFinding?.lineNumber).toBe(6); // Line 6 has "TODO: Flesh out..."
      expect(todoFinding?.title).toContain('TODO');

      // Check vague word findings
      const fastFinding = report.findings.find(
        (f) => f.category === 'ambiguity' && f.title.includes('fast')
      );
      expect(fastFinding).toBeDefined();
      expect(fastFinding?.lineNumber).toBe(7); // Line 7 has "fast and intuitive"
      expect(fastFinding?.recommendation).toContain('measurable');
    });
  });

  describe('parseValidationReport', () => {
    const sampleReportMarkdown = `# PRD Review Report

## Overall Verdict: CONCERNS
**Score:** 74/100
**Target Document:** \`_bmad-output/planning-artifacts/prds/prd.md\`

## Findings Summary
- High: 1
- Medium: 1

### [HIGH] Missing Quantitative Latency Threshold
- **File:** \`_bmad-output/planning-artifacts/prds/prd.md:85\`
- **Category:** bad_spec
- **Description:** Webview rendering latency SLA is unspecified.
- **Recommendation:** Specify sub-300ms render window constraint.

### [MEDIUM] Vague Error Message Handling
- **File:** \`_bmad-output/planning-artifacts/prds/prd.md:120\`
- **Category:** intent_gap
- **Description:** Unclear whether user is informed via modal or toast.
- **Recommendation:** Standardize on non-blocking toast.
`;

    it('should parse report markdown with verdict, score, and line findings', () => {
      const report = parseValidationReport(sampleReportMarkdown, 'report.md');
      expect(report.verdict).toBe('CONCERNS');
      expect(report.score).toBe(74);
      expect(report.targetFile).toBe('_bmad-output/planning-artifacts/prds/prd.md');
      expect(report.findings).toHaveLength(2);

      const highFinding = report.findings[0];
      expect(highFinding.severity).toBe('high');
      expect(highFinding.title).toBe('Missing Quantitative Latency Threshold');
      expect(highFinding.filePath).toBe('_bmad-output/planning-artifacts/prds/prd.md');
      expect(highFinding.lineNumber).toBe(85);
      expect(highFinding.category).toBe('bad_spec');
      expect(highFinding.recommendation).toContain('sub-300ms');

      const mediumFinding = report.findings[1];
      expect(mediumFinding.severity).toBe('medium');
      expect(mediumFinding.lineNumber).toBe(120);
    });

    it('should derive FAIL verdict if report has critical finding but no explicit verdict line', () => {
      const rawFindings = `
### [CRITICAL] Data Loss Risk in Cache Invalidation
- **File:** \`src/engine.ts:50\`
- **Description:** Unsaved dirty buffers wiped during refresh.
`;
      const report = parseValidationReport(rawFindings, 'findings.md');
      expect(report.verdict).toBe('FAIL');
      expect(report.findings).toHaveLength(1);
      expect(report.findings[0].severity).toBe('critical');
      expect(report.findings[0].lineNumber).toBe(50);
    });
  });

  describe('findValidationReports', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-rubric-test-'));
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should discover validation report files', async () => {
      const planningDir = path.join(tempDir, '_bmad-output', 'planning-artifacts');
      fs.mkdirSync(planningDir, { recursive: true });

      const reportFile = path.join(planningDir, 'prd-validation-report.md');
      fs.writeFileSync(reportFile, '# Report');

      const found = await findValidationReports(tempDir);
      expect(found).toHaveLength(1);
      expect(found[0]).toBe(reportFile);
    });
  });
});
