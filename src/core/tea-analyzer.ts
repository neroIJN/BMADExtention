import * as fs from 'fs';
import * as path from 'path';
import {
  BmadAtddPhase,
  BmadTeaQualityReport,
  BmadTeaRequirementTrace,
  BmadTraceStatus
} from './types';

/**
 * Extracts functional requirements (FRs) from PRD markdown content.
 */
export function extractFunctionalRequirements(
  content: string
): Array<{ id: string; title: string; description?: string }> {
  const requirements: Array<{ id: string; title: string; description?: string }> = [];
  const lines = content.split(/\r?\n/);

  const frRegex = /(?:#+\s*|\*\*\s*)(FR-\d+)[:\s]+([^\n*]+)(?:\*\*)?/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(frRegex);
    if (match) {
      const id = match[1].toUpperCase();
      const title = match[2].trim();
      let description = '';

      // Collect following lines until next section or requirement
      for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
        const next = lines[j].trim();
        if (next.startsWith('#') || next.match(frRegex)) {
          break;
        }
        if (next) {
          description = description ? `${description} ${next}` : next;
        }
      }

      // Avoid duplicates
      if (!requirements.some((r) => r.id === id)) {
        requirements.push({ id, title, description: description || undefined });
      }
    }
  }

  return requirements;
}

/**
 * Recursively discovers automated test files within the workspace.
 */
export async function findTestFiles(workspaceRoot: string): Promise<string[]> {
  const testFiles: string[] = [];

  async function scan(dir: string, depth: number) {
    if (depth > 5 || !fs.existsSync(dir)) {
      return;
    }
    let entries: fs.Dirent[] = [];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const name = entry.name;
      if (
        name.startsWith('.') ||
        name === 'node_modules' ||
        name === 'dist' ||
        name === 'build'
      ) {
        continue;
      }

      const fullPath = path.join(dir, name);
      if (entry.isDirectory()) {
        await scan(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const lower = name.toLowerCase();
        if (
          lower.endsWith('.test.ts') ||
          lower.endsWith('.spec.ts') ||
          lower.endsWith('.test.js') ||
          lower.endsWith('.spec.js') ||
          lower.startsWith('test_')
        ) {
          testFiles.push(fullPath);
        }
      }
    }
  }

  // Scan root test/ directory if present, otherwise whole workspace
  const rootTestDir = path.join(workspaceRoot, 'test');
  if (fs.existsSync(rootTestDir)) {
    await scan(rootTestDir, 1);
  }
  const rootTestsDir = path.join(workspaceRoot, 'tests');
  if (fs.existsSync(rootTestsDir)) {
    await scan(rootTestsDir, 1);
  }

  // If no tests found in dedicated directories, scan src/
  if (testFiles.length === 0) {
    await scan(workspaceRoot, 1);
  }

  return testFiles;
}

/**
 * Parses markdown table or bullet list from an existing traceability artifact.
 */
export function parseTraceabilityArtifact(
  content: string,
  workspaceRoot: string
): BmadTeaRequirementTrace[] {
  const traces: BmadTeaRequirementTrace[] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    // Markdown table row format: | FR-1 | Title | test/file.test.ts | COVERED |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const parts = trimmed
        .split('|')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 3 && /^FR-\d+$/i.test(parts[0])) {
        const id = parts[0].toUpperCase();
        const title = parts[1];
        const testCol = parts[2];
        const statusCol = parts[3]?.toUpperCase() || '';

        const mappedFiles: string[] = [];
        if (testCol && testCol !== '-' && testCol.toLowerCase() !== 'none') {
          mappedFiles.push(...testCol.split(/[,;\s]+/).filter((f) => f.includes('.')));
        }

        let status: BmadTraceStatus = 'uncovered';
        if (statusCol.includes('UNCOVERED') || statusCol.includes('FAIL') || statusCol.includes('NO')) {
          status = 'uncovered';
        } else if (statusCol.includes('PARTIAL') || statusCol.includes('WARN')) {
          status = 'partial';
        } else if (statusCol.includes('COVERED') || statusCol.includes('PASS') || mappedFiles.length > 0) {
          status = 'covered';
        }

        traces.push({
          id,
          title,
          status,
          mappedTestFiles: mappedFiles,
          mappedTestCount: mappedFiles.length
        });
      }
    }
  }

  return traces;
}

/**
 * Maps requirements against discovered test files using token matching.
 */
export function mapRequirementsToTests(
  requirements: Array<{ id: string; title: string; description?: string }>,
  testFiles: string[],
  workspaceRoot: string
): BmadTeaRequirementTrace[] {
  return requirements.map((req) => {
    const reqTokens = req.title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 3 && !['with', 'from', 'that', 'this'].includes(t));

    const matchedTests: string[] = [];

    for (const testPath of testFiles) {
      const relative = path.relative(workspaceRoot, testPath).toLowerCase();
      const baseName = path.basename(testPath).toLowerCase();

      // Check if test file directly matches FR ID or title tokens
      if (baseName.includes(req.id.toLowerCase())) {
        matchedTests.push(path.relative(workspaceRoot, testPath));
        continue;
      }

      // Check keyword overlap with test filename
      const matchesKeyword = reqTokens.some((token) => baseName.includes(token));
      if (matchesKeyword) {
        matchedTests.push(path.relative(workspaceRoot, testPath));
      }
    }

    const uniqueTests = Array.from(new Set(matchedTests));
    let status: BmadTraceStatus = 'uncovered';
    if (uniqueTests.length > 0) {
      status = uniqueTests.length >= 2 || uniqueTests.some((t) => reqTokens.some((k) => t.includes(k)))
        ? 'covered'
        : 'partial';
    }

    return {
      id: req.id,
      title: req.title,
      description: req.description,
      status,
      mappedTestFiles: uniqueTests,
      mappedTestCount: uniqueTests.length
    };
  });
}

/**
 * Analyzes workspace testing posture, traceability, and ATDD cycle progress.
 */
export async function analyzeTeaQuality(
  workspaceRoot: string,
  options: {
    prdPath?: string;
    testArtifactsPath?: string;
  } = {}
): Promise<BmadTeaQualityReport> {
  const testFiles = await findTestFiles(workspaceRoot);

  // 1. Locate and parse PRD requirements
  let requirements: Array<{ id: string; title: string; description?: string }> = [];
  const candidatePrdPaths = [
    options.prdPath,
    path.join(workspaceRoot, '_bmad-output', 'planning-artifacts', 'prds', 'prd.md'),
    path.join(workspaceRoot, 'docs', 'prd.md'),
    path.join(workspaceRoot, 'prd.md')
  ].filter((p): p is string => Boolean(p && fs.existsSync(p)));

  // If no exact match, search for any prd.md inside _bmad-output
  if (candidatePrdPaths.length === 0) {
    const prdDir = path.join(workspaceRoot, '_bmad-output', 'planning-artifacts', 'prds');
    if (fs.existsSync(prdDir)) {
      try {
        const subdirs = await fs.promises.readdir(prdDir, { withFileTypes: true });
        for (const sub of subdirs) {
          if (sub.isDirectory()) {
            const nested = path.join(prdDir, sub.name, 'prd.md');
            if (fs.existsSync(nested)) {
              candidatePrdPaths.push(nested);
              break;
            }
          }
        }
      } catch {
        // Non-blocking
      }
    }
  }

  if (candidatePrdPaths.length > 0) {
    try {
      const prdContent = await fs.promises.readFile(candidatePrdPaths[0], 'utf-8');
      requirements = extractFunctionalRequirements(prdContent);
    } catch {
      requirements = [];
    }
  }

  // 2. Check for pre-existing traceability artifact
  let matrix: BmadTeaRequirementTrace[] = [];
  const candidateTracePaths = [
    options.testArtifactsPath,
    path.join(workspaceRoot, '_bmad-output', 'test-artifacts', 'traceability-matrix.md'),
    path.join(workspaceRoot, '_bmad-output', 'test-artifacts', 'traceability.md'),
    path.join(workspaceRoot, 'tests', 'traceability-matrix.md')
  ].filter((p): p is string => Boolean(p && fs.existsSync(p)));

  if (candidateTracePaths.length > 0) {
    try {
      const traceContent = await fs.promises.readFile(candidateTracePaths[0], 'utf-8');
      matrix = parseTraceabilityArtifact(traceContent, workspaceRoot);
    } catch {
      matrix = [];
    }
  }

  // If no static matrix found, map dynamically
  if (matrix.length === 0) {
    if (requirements.length > 0) {
      matrix = mapRequirementsToTests(requirements, testFiles, workspaceRoot);
    } else {
      // Create synthetic traces from test files if no PRD found
      matrix = testFiles.map((tf, idx) => {
        const base = path.basename(tf).replace(/\.(test|spec)\.[^.]+$/, '');
        return {
          id: `REQ-${idx + 1}`,
          title: `Automated Test Module: ${base}`,
          status: 'covered' as BmadTraceStatus,
          mappedTestFiles: [path.relative(workspaceRoot, tf)],
          mappedTestCount: 1
        };
      });
    }
  }

  const totalRequirements = matrix.length;
  const coveredRequirements = matrix.filter((m) => m.status === 'covered').length;
  const partialRequirements = matrix.filter((m) => m.status === 'partial').length;
  const uncoveredRequirements = matrix.filter((m) => m.status === 'uncovered').length;

  const coveragePercentage =
    totalRequirements > 0
      ? Math.round(((coveredRequirements + partialRequirements * 0.5) / totalRequirements) * 100)
      : testFiles.length > 0
      ? 100
      : 0;

  // Calculate TEA Quality Score (0 to 100)
  const qualityScore = Math.min(
    100,
    Math.round(coveragePercentage * 0.7 + (testFiles.length > 0 ? 30 : 0))
  );

  // ATDD Cycle Progress
  const atddChecklist: BmadAtddPhase[] = [
    {
      id: 'phase-1-acceptance-design',
      title: 'Acceptance Test Design',
      status: requirements.length > 0 ? 'completed' : 'pending',
      description: 'Functional requirements extracted and test design mapped.'
    },
    {
      id: 'phase-2-red-scaffolds',
      title: 'Red-Phase Test Scaffolding',
      status: testFiles.length > 0 ? 'completed' : 'pending',
      description: 'Scaffolding test suites before code implementation.'
    },
    {
      id: 'phase-3-green-verification',
      title: 'Green-Phase Implementation & Passing Tests',
      status: coveragePercentage >= 75 ? 'completed' : coveragePercentage > 0 ? 'in-progress' : 'pending',
      description: 'Verifying that code changes satisfy all acceptance assertions.'
    },
    {
      id: 'phase-4-quality-gates',
      title: 'TEA Quality Gate Clearance',
      status: qualityScore >= 80 ? 'completed' : qualityScore >= 50 ? 'in-progress' : 'pending',
      description: 'Auditing NFRs, traceability matrix, and regression suite health.'
    }
  ];

  // Recommendations
  const recommendations: string[] = [];
  const uncoveredItems = matrix.filter((m) => m.status === 'uncovered');
  if (uncoveredItems.length > 0) {
    const list = uncoveredItems.slice(0, 3).map((u) => u.id).join(', ');
    recommendations.push(
      `Scaffold acceptance tests for uncovered requirements (${list}) using Murat (/bmad-testarch-atdd).`
    );
  }
  if (qualityScore < 80) {
    recommendations.push('Expand automated test suite coverage to satisfy the 80% TEA Quality Gate.');
  } else {
    recommendations.push('Quality standards satisfied: regression suite is guarded by automated assertions.');
  }

  return {
    qualityScore,
    totalRequirements,
    coveredRequirements,
    partialRequirements,
    uncoveredRequirements,
    coveragePercentage,
    totalTestFiles: testFiles.length,
    traceabilityMatrix: matrix,
    atddChecklist,
    recommendations
  };
}
