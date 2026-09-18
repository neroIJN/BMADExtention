import * as fs from 'fs';
import * as path from 'path';
import {
  BmadArtifactCategory,
  BmadArtifactCategoryType,
  BmadArtifactItem,
  BmadResolvedPaths
} from './types';

/**
 * Formats a raw byte count into human-readable representation.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Determines canonical category based on file relative path or filename conventions.
 */
export function determineArtifactCategory(relativePath: string): BmadArtifactCategoryType {
  const normalized = relativePath.replace(/\\/g, '/').toLowerCase();
  const fileName = path.basename(normalized);

  // Architecture deliverables
  if (
    normalized.includes('/architecture') ||
    normalized.includes('architecture-') ||
    fileName.includes('architecture') ||
    fileName.endsWith('-spine.md') ||
    fileName === 'architecture.md' ||
    fileName === 'solution-design.md'
  ) {
    return 'architecture';
  }

  // Testing deliverables (TEA)
  if (
    normalized.includes('/test-artifacts') ||
    normalized.includes('/tests/') ||
    normalized.includes('/qa/') ||
    normalized.includes('test-design') ||
    normalized.includes('test-review') ||
    normalized.includes('traceability') ||
    fileName.includes('traceability') ||
    fileName.startsWith('test-')
  ) {
    return 'test';
  }

  // Implementation deliverables & sprint tracking
  if (
    normalized.includes('/implementation-artifacts') ||
    fileName.startsWith('spec-') ||
    fileName === 'sprint-status.yaml' ||
    fileName === 'sprint-status.yml' ||
    fileName.includes('retrospective') ||
    fileName.includes('change-proposal')
  ) {
    return 'implementation';
  }

  // Planning & product deliverables
  if (
    normalized.includes('/planning-artifacts') ||
    normalized.includes('/prds') ||
    normalized.includes('/briefs') ||
    fileName.includes('prd') ||
    fileName === 'epics.md' ||
    fileName.includes('prfaq') ||
    fileName.includes('product-brief')
  ) {
    return 'planning';
  }

  return 'other';
}

interface ScanOptions {
  maxDepth?: number;
  includeEmptyCategories?: boolean;
}

/**
 * Recursively scans directory for artifact files up to a specified depth limit.
 */
async function scanDirectoryRecursive(
  dirPath: string,
  workspaceRoot: string,
  currentDepth: number,
  maxDepth: number,
  collected: Map<string, BmadArtifactItem>
): Promise<void> {
  if (currentDepth > maxDepth || !fs.existsSync(dirPath)) {
    return;
  }

  let entries: fs.Dirent[] = [];
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryName = entry.name;

    // Skip hidden files, system folders, dependencies, and build outputs
    if (
      entryName.startsWith('.') ||
      entryName === 'node_modules' ||
      entryName === 'dist' ||
      entryName === 'build' ||
      entryName.endsWith('~') ||
      entryName.endsWith('.tmp')
    ) {
      continue;
    }

    const fullPath = path.join(dirPath, entryName);

    if (entry.isDirectory()) {
      await scanDirectoryRecursive(fullPath, workspaceRoot, currentDepth + 1, maxDepth, collected);
    } else if (entry.isFile()) {
      try {
        const stats = await fs.promises.stat(fullPath);
        const relativePath = path.relative(workspaceRoot, fullPath);
        const category = determineArtifactCategory(relativePath);
        const extension = path.extname(entryName).toLowerCase();

        collected.set(fullPath, {
          id: relativePath.replace(/\\/g, '/'),
          fileName: entryName,
          relativePath: relativePath.replace(/\\/g, '/'),
          absolutePath: fullPath,
          category,
          sizeBytes: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          modifiedAt: stats.mtime.toISOString(),
          extension
        });
      } catch {
        // Skip unreadable files
      }
    }
  }
}

/**
 * Scans workspace artifact directories and returns categorized deliverables.
 */
export async function scanWorkspaceArtifacts(
  workspaceRoot: string,
  resolvedPaths?: BmadResolvedPaths,
  options: ScanOptions = {}
): Promise<BmadArtifactCategory[]> {
  const maxDepth = options.maxDepth ?? 5;
  const includeEmpty = options.includeEmptyCategories ?? false;
  const collected = new Map<string, BmadArtifactItem>();

  const targetDirs = new Set<string>();

  if (resolvedPaths) {
    if (resolvedPaths.outputFolder && fs.existsSync(resolvedPaths.outputFolder)) {
      targetDirs.add(resolvedPaths.outputFolder);
    }
    if (resolvedPaths.planningArtifacts && fs.existsSync(resolvedPaths.planningArtifacts)) {
      targetDirs.add(resolvedPaths.planningArtifacts);
    }
    if (resolvedPaths.implementationArtifacts && fs.existsSync(resolvedPaths.implementationArtifacts)) {
      targetDirs.add(resolvedPaths.implementationArtifacts);
    }
    if (resolvedPaths.testArtifacts && fs.existsSync(resolvedPaths.testArtifacts)) {
      targetDirs.add(resolvedPaths.testArtifacts);
    }
  }

  // Also check standard default folders if none matched yet or in addition
  const defaultOutputDir = path.join(workspaceRoot, '_bmad-output');
  if (fs.existsSync(defaultOutputDir)) {
    targetDirs.add(defaultOutputDir);
  }

  const defaultDocsDir = path.join(workspaceRoot, 'docs');
  if (fs.existsSync(defaultDocsDir)) {
    targetDirs.add(defaultDocsDir);
  }

  for (const dir of targetDirs) {
    await scanDirectoryRecursive(dir, workspaceRoot, 1, maxDepth, collected);
  }

  const allItems = Array.from(collected.values());

  const categoriesDefinition: Array<{
    id: BmadArtifactCategoryType;
    label: string;
    order: number;
  }> = [
    { id: 'planning', label: 'Planning & Product', order: 1 },
    { id: 'architecture', label: 'Architecture & System Design', order: 2 },
    { id: 'implementation', label: 'Implementation & Sprint', order: 3 },
    { id: 'test', label: 'Testing & Quality', order: 4 },
    { id: 'other', label: 'Other Artifacts', order: 5 }
  ];

  const categories: BmadArtifactCategory[] = [];

  for (const def of categoriesDefinition) {
    const items = allItems
      .filter((i) => i.category === def.id)
      .sort((a, b) => a.fileName.localeCompare(b.fileName));

    if (items.length > 0 || includeEmpty) {
      categories.push({
        id: def.id,
        label: def.label,
        order: def.order,
        artifacts: items
      });
    }
  }

  return categories;
}
