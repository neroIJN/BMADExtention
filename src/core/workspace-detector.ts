import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { BmadDetectionResult, BmadManifest } from './types';

/**
 * Pure domain detector that verifies whether a directory is a BMAD project.
 * Implements Hexagonal architecture: zero dependencies on VS Code APIs.
 */
export async function detectBmadWorkspace(rootPath: string): Promise<BmadDetectionResult> {
  if (!rootPath || typeof rootPath !== 'string') {
    return {
      isBmad: false,
      hasManifest: false,
      hasHelpCatalog: false,
      warning: 'Invalid workspace path provided.'
    };
  }

  const manifestPath = path.join(rootPath, '_bmad', '_config', 'manifest.yaml');
  const helpCsvPath = path.join(rootPath, '_bmad', '_config', 'bmad-help.csv');

  let hasManifest = false;
  let hasHelpCatalog = false;

  try {
    const manifestStat = await fs.promises.stat(manifestPath);
    hasManifest = manifestStat.isFile();
  } catch {
    hasManifest = false;
  }

  try {
    const helpStat = await fs.promises.stat(helpCsvPath);
    hasHelpCatalog = helpStat.isFile();
  } catch {
    hasHelpCatalog = false;
  }

  const isBmad = hasManifest && hasHelpCatalog;

  if (!isBmad) {
    return {
      isBmad: false,
      rootPath,
      hasManifest,
      hasHelpCatalog,
      warning: !hasManifest && !hasHelpCatalog
        ? 'No _bmad directory or config found.'
        : 'Partial BMAD directory detected (manifest or help catalog missing).'
    };
  }

  // Parse manifest to extract version and module metadata
  let version: string | undefined;
  let modules: string[] = [];

  try {
    const manifestContent = await fs.promises.readFile(manifestPath, 'utf8');
    const parsed = yaml.load(manifestContent) as BmadManifest;
    if (parsed && typeof parsed === 'object') {
      version = parsed.installation?.version;
      if (Array.isArray(parsed.modules)) {
        modules = parsed.modules.map(m => m.name).filter(Boolean);
      }
    }
  } catch (err: any) {
    return {
      isBmad: true,
      rootPath,
      hasManifest: true,
      hasHelpCatalog: true,
      warning: `Failed to parse manifest.yaml: ${err?.message ?? 'Unknown YAML error'}`
    };
  }

  return {
    isBmad: true,
    rootPath,
    hasManifest: true,
    hasHelpCatalog: true,
    version,
    modules
  };
}

/**
 * Scans an array of workspace root paths and returns detection results
 * for all folders containing a valid BMAD installation.
 */
export async function detectAllBmadWorkspaces(rootPaths: string[]): Promise<BmadDetectionResult[]> {
  if (!Array.isArray(rootPaths) || rootPaths.length === 0) {
    return [];
  }

  const results = await Promise.all(rootPaths.map(detectBmadWorkspace));
  return results.filter((r) => r.isBmad);
}

