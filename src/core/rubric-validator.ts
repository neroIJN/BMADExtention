import * as fs from 'fs';
import * as path from 'path';
import {
  BmadFindingSeverity,
  BmadValidationFinding,
  BmadValidationReport,
  BmadValidationVerdict
} from './types';

/**
 * Searches for all lines containing target pattern and returns 1-indexed line numbers.
 */
function findPatternLines(lines: string[], regex: RegExp): Array<{ lineNumber: number; match: string }> {
  const results: Array<{ lineNumber: number; match: string }> = [];
  lines.forEach((line, idx) => {
    const match = line.match(regex);
    if (match) {
      results.push({ lineNumber: idx + 1, match: match[0] });
    }
  });
  return results;
}

/**
 * Evaluates a PRD or specification document against the BMAD quality rubric.
 */
export function validatePrdDocument(content: string, filePath: string): BmadValidationReport {
  const lines = content.split(/\r?\n/);
  const findings: BmadValidationFinding[] = [];
  let findingId = 1;

  const lowerContent = content.toLowerCase();

  // 1. Check required structural sections
  const structuralChecks = [
    {
      name: 'Overview & Problem Statement',
      patterns: [/#+\s*(overview|problem statement|executive summary|context|intent)/i],
      weight: 15,
      missingSeverity: 'critical' as BmadFindingSeverity,
      recommendation: 'Add an "Overview & Intent" section explaining the user problem being solved.'
    },
    {
      name: 'User Journeys / Personas',
      patterns: [/#+\s*(user journey|user story|personas|actor|use cases)/i],
      weight: 15,
      missingSeverity: 'high' as BmadFindingSeverity,
      recommendation: 'Define target user personas and core user journeys.'
    },
    {
      name: 'Functional Requirements (FRs)',
      patterns: [/#+\s*(functional requirements|requirements|fr-\d+|capabilities)/i],
      weight: 20,
      missingSeverity: 'critical' as BmadFindingSeverity,
      recommendation: 'Enumerate concrete functional requirements with testable consequences.'
    },
    {
      name: 'Non-Functional Requirements (NFRs)',
      patterns: [/#+\s*(non-functional requirements|nfr|performance|security|latency|reliability)/i],
      weight: 15,
      missingSeverity: 'high' as BmadFindingSeverity,
      recommendation: 'Add quantitative NFRs specifying performance, security, or error thresholds.'
    },
    {
      name: 'Scope & Boundaries',
      patterns: [/#+\s*(scope|boundaries|out-of-scope|out of scope|constraints)/i],
      weight: 15,
      missingSeverity: 'medium' as BmadFindingSeverity,
      recommendation: 'State explicit boundaries and what is intentionally out of scope.'
    }
  ];

  let completenessScore = 100;
  for (const check of structuralChecks) {
    const hasSection = check.patterns.some((p) => p.test(content));
    if (!hasSection) {
      completenessScore -= check.weight;
      findings.push({
        id: `finding-${findingId++}`,
        severity: check.missingSeverity,
        category: 'missing_section',
        title: `Missing Section: ${check.name}`,
        description: `The document lacks an explicit "${check.name}" section, which is required by the BMAD specification rubric.`,
        recommendation: check.recommendation,
        filePath,
        lineNumber: 1
      });
    }
  }

  // 2. Ambiguity and Placeholder anti-patterns
  const placeholderMatches = findPatternLines(lines, /\b(TODO|TBD|FIXME|XXX)\b/i);
  for (const p of placeholderMatches) {
    findings.push({
      id: `finding-${findingId++}`,
      severity: 'high',
      category: 'placeholder',
      title: `Unresolved Placeholder: "${p.match}"`,
      description: `Found unresolved placeholder token "${p.match}" on line ${p.lineNumber}. Specifications must be complete before entering the build cycle.`,
      recommendation: 'Replace placeholder with finalized specifications or decisions.',
      filePath,
      lineNumber: p.lineNumber
    });
  }

  const vagueWordsRegex = /\b(fast|intuitive|easy to use|scalable|robust|as appropriate|gracefully)\b/i;
  const vagueMatches = findPatternLines(lines, vagueWordsRegex);
  for (const v of vagueMatches.slice(0, 5)) { // Cap at 5 to avoid noise
    findings.push({
      id: `finding-${findingId++}`,
      severity: 'medium',
      category: 'ambiguity',
      title: `Vague Qualitative Term: "${v.match}"`,
      description: `Line ${v.lineNumber} contains subjective term "${v.match}" without measurable verification metrics.`,
      recommendation: `Replace "${v.match}" with measurable SLAs (e.g. latency < 300ms, throughput > 100 req/s).`,
      filePath,
      lineNumber: v.lineNumber
    });
  }

  // 3. Acceptance criteria check in FRs
  if (lowerContent.includes('functional requirement') || lowerContent.includes('fr-')) {
    const hasAcceptanceCriteria =
      lowerContent.includes('acceptance criteria') ||
      lowerContent.includes('given') ||
      lowerContent.includes('consequences');
    if (!hasAcceptanceCriteria) {
      findings.push({
        id: `finding-${findingId++}`,
        severity: 'high',
        category: 'untestable_requirements',
        title: 'Requirements Lack Testable Acceptance Criteria',
        description: 'Functional requirements are defined without Given/When/Then or testable consequence clauses.',
        recommendation: 'Provide explicit acceptance criteria or verification assertions for each FR.',
        filePath,
        lineNumber: 1
      });
    }
  }

  // Compute rubric scores
  const clarityScore = Math.max(
    0,
    100 - placeholderMatches.length * 15 - vagueMatches.length * 5
  );
  completenessScore = Math.max(0, completenessScore);
  const verifiabilityScore = findings.some((f) => f.category === 'untestable_requirements')
    ? 60
    : 90;

  const totalScore = Math.round(
    completenessScore * 0.4 + clarityScore * 0.35 + verifiabilityScore * 0.25
  );

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;
  const lowCount = findings.filter((f) => f.severity === 'low').length;

  let verdict: BmadValidationVerdict = 'PASS';
  if (criticalCount > 0 || totalScore < 60) {
    verdict = 'FAIL';
  } else if (highCount > 0 || totalScore < 80) {
    verdict = 'CONCERNS';
  }

  return {
    id: `report-${Date.now()}`,
    title: `PRD Rubric Evaluation: ${path.basename(filePath)}`,
    targetFile: filePath,
    evaluatedAt: new Date().toISOString(),
    verdict,
    score: totalScore,
    summary: {
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      total: findings.length
    },
    rubricCategories: [
      {
        name: 'Structural Completeness',
        score: completenessScore,
        status: completenessScore >= 80 ? 'pass' : completenessScore >= 60 ? 'concerns' : 'fail',
        details: 'Evaluates presence of Overview, Personas, FRs, NFRs, and Scope boundaries.'
      },
      {
        name: 'Clarity & Precision',
        score: clarityScore,
        status: clarityScore >= 80 ? 'pass' : clarityScore >= 60 ? 'concerns' : 'fail',
        details: 'Evaluates absence of unresolved placeholders and subjective vague qualifiers.'
      },
      {
        name: 'Verifiability & Testability',
        score: verifiabilityScore,
        status: verifiabilityScore >= 80 ? 'pass' : verifiabilityScore >= 60 ? 'concerns' : 'fail',
        details: 'Evaluates presence of testable acceptance criteria and quantitative targets.'
      }
    ],
    findings
  };
}

/**
 * Parses an existing Markdown review or validation report artifact.
 */
export function parseValidationReport(content: string, filePath: string): BmadValidationReport {
  let verdict: BmadValidationVerdict = 'PASS';
  let hasExplicitVerdict = false;
  const verdictMatch = content.match(/(?:\*\*|\*|#+\s*)?(?:Overall\s+)?Verdict:?\**\s*\**\b(PASS|CONCERNS|FAIL)\b/i);
  if (verdictMatch) {
    verdict = verdictMatch[1].toUpperCase() as BmadValidationVerdict;
    hasExplicitVerdict = true;
  }

  let score = 80;
  const scoreMatch = content.match(/(?:\*\*|\*|#+\s*)?Score:?\**\s*\**(\d+)(?:\/100)?/i);
  if (scoreMatch) {
    score = parseInt(scoreMatch[1], 10);
  }

  let targetFile = filePath;
  const targetMatch = content.match(/(?:\*\*|\*|#+\s*)?(?:Target\s+(?:Document|File)|Document):?\**\s*[`*]*([^\n`*]+)[`*]*/i);
  if (targetMatch) {
    targetFile = targetMatch[1].trim();
  }

  const findings: BmadValidationFinding[] = [];
  const lines = content.split(/\r?\n/);
  let findingId = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for finding headers e.g. "### [HIGH] Title" or "### [CRITICAL] Title"
    const headingMatch = line.match(/^#+\s*\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s*(.*)$/i);
    if (headingMatch) {
      const severity = headingMatch[1].toLowerCase() as BmadFindingSeverity;
      const title = headingMatch[2].trim();

      let findingFile = targetFile;
      let lineNumber: number | undefined;
      let description = '';
      let recommendation = '';
      let category = 'review_finding';

      // Look ahead up to 12 lines for metadata
      for (let j = i + 1; j < Math.min(lines.length, i + 15); j++) {
        const nextLine = lines[j];
        if (nextLine.startsWith('#')) {
          break; // Next section
        }

        const fileMatch = nextLine.match(/(?:File|Location):?\**\s*[`*]*\s*([^`*\s\r\n]+)/i);
        if (fileMatch) {
          const locStr = fileMatch[1].trim();
          const lineColonIdx = locStr.lastIndexOf(':');
          if (lineColonIdx !== -1) {
            findingFile = locStr.substring(0, lineColonIdx);
            lineNumber = parseInt(locStr.substring(lineColonIdx + 1), 10);
          } else {
            findingFile = locStr;
          }
        }

        const catMatch = nextLine.match(/Category:\s*[`*]*([^\n`*]+)[`*]*/i);
        if (catMatch) {
          category = catMatch[1].trim();
        }

        const descMatch = nextLine.match(/Description:\s*(.*)$/i);
        if (descMatch) {
          description = descMatch[1].trim();
        }

        const recMatch = nextLine.match(/Recommendation:\s*(.*)$/i);
        if (recMatch) {
          recommendation = recMatch[1].trim();
        }
      }

      findings.push({
        id: `parsed-finding-${findingId++}`,
        severity,
        category,
        title,
        description: description || title,
        recommendation: recommendation || undefined,
        filePath: findingFile,
        lineNumber
      });
    }
  }

  // Derive verdict if not stated explicitly in content
  if (!hasExplicitVerdict) {
    if (findings.some((f) => f.severity === 'critical')) {
      verdict = 'FAIL';
    } else if (findings.some((f) => f.severity === 'high')) {
      verdict = 'CONCERNS';
    } else {
      verdict = 'PASS';
    }
  }

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;
  const lowCount = findings.filter((f) => f.severity === 'low').length;

  return {
    id: `parsed-report-${Date.now()}`,
    title: `Validation Report: ${path.basename(filePath)}`,
    targetFile,
    evaluatedAt: new Date().toISOString(),
    verdict,
    score,
    summary: {
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      total: findings.length
    },
    rubricCategories: [
      {
        name: 'Report Evaluation',
        score,
        status: verdict === 'PASS' ? 'pass' : verdict === 'CONCERNS' ? 'concerns' : 'fail',
        details: `Parsed from review report artifact ${path.basename(filePath)}`
      }
    ],
    findings
  };
}

/**
 * Searches for existing validation reports and reviews in workspace.
 */
export async function findValidationReports(workspaceRoot: string): Promise<string[]> {
  const discovered: string[] = [];

  const searchDirs = [
    path.join(workspaceRoot, '_bmad-output', 'planning-artifacts'),
    path.join(workspaceRoot, '_bmad-output', 'implementation-artifacts'),
    path.join(workspaceRoot, '_bmad-output', 'test-artifacts'),
    path.join(workspaceRoot, '_bmad-output')
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) {
      continue;
    }
    try {
      const files = await fs.promises.readdir(dir);
      for (const file of files) {
        const lower = file.toLowerCase();
        if (
          (lower.includes('validation') || lower.includes('review') || lower.includes('scorecard')) &&
          lower.endsWith('.md')
        ) {
          discovered.push(path.join(dir, file));
        }
      }
    } catch {
      // Non-blocking
    }
  }

  return discovered;
}
