import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { parse as parseToml } from 'smol-toml';
import {
  BmadConfig,
  BmadResolvedPaths,
  ConfigResolverResult
} from './types';

/**
 * Default relative directories if not configured in BMAD configs.
 */
const DEFAULT_RELATIVE_PATHS = {
  outputFolder: '_bmad-output',
  planningArtifacts: '_bmad-output/planning-artifacts',
  implementationArtifacts: '_bmad-output/implementation-artifacts',
  testArtifacts: '_bmad-output/test-artifacts',
  projectKnowledge: 'docs',
  bmadBuilderOutputFolder: 'skills',
  bmadBuilderReports: 'skills/reports',
  testDesignOutput: '_bmad-output/test-artifacts/test-design',
  testReviewOutput: '_bmad-output/test-artifacts/test-reviews',
  traceOutput: '_bmad-output/test-artifacts/traceability'
};

/**
 * Expand template tokens (e.g. `{project-root}`, `{output_folder}`) recursively.
 *
 * @param template Path or string with template tokens
 * @param tokens Map of token names to replacement strings
 * @param rootPath Root workspace directory
 * @param maxIterations Guard against cyclic token expansions
 * @returns Fully expanded and normalized absolute path
 */
export function expandTokens(
  template: string,
  tokens: Record<string, string>,
  rootPath: string,
  maxIterations = 10
): string {
  if (!template || typeof template !== 'string') {
    return '';
  }

  let result = template;
  let iterations = 0;
  const tokenRegex = /\{([^{}]+)\}/g;

  while (tokenRegex.test(result) && iterations < maxIterations) {
    tokenRegex.lastIndex = 0;
    result = result.replace(tokenRegex, (match, tokenKey) => {
      const normalizedKey = tokenKey.trim();
      if (tokens[normalizedKey] !== undefined) {
        return tokens[normalizedKey];
      }
      // Also check with hyphen vs underscore variations
      const withUnderscore = normalizedKey.replace(/-/g, '_');
      if (tokens[withUnderscore] !== undefined) {
        return tokens[withUnderscore];
      }
      const withHyphen = normalizedKey.replace(/_/g, '-');
      if (tokens[withHyphen] !== undefined) {
        return tokens[withHyphen];
      }
      return match;
    });
    iterations++;
  }

  // Normalize path separators and convert relative paths to absolute based on rootPath
  const cleaned = result.replace(/\\/g, '/');
  if (path.isAbsolute(cleaned) || /^[a-zA-Z]:\//.test(cleaned)) {
    return path.normalize(cleaned);
  }
  return path.resolve(rootPath, cleaned);
}

/**
 * Safely parse a TOML file. Returns undefined if file does not exist or fails parsing.
 */
function tryParseToml(filePath: string, diagnostics: string[]): Record<string, any> | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return parseToml(content) as Record<string, any>;
  } catch (err: any) {
    diagnostics.push(`Failed to parse TOML file at ${filePath}: ${err?.message || String(err)}`);
    return undefined;
  }
}

/**
 * Safely parse a YAML file. Returns undefined if file does not exist or fails parsing.
 */
function tryParseYaml(filePath: string, diagnostics: string[]): Record<string, any> | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = yaml.load(content);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, any>;
    }
    return undefined;
  } catch (err: any) {
    diagnostics.push(`Failed to parse YAML file at ${filePath}: ${err?.message || String(err)}`);
    return undefined;
  }
}

/**
 * Dynamic configuration and path resolver for BMAD projects.
 * Scans `_bmad/config.toml`, `_bmad/custom/config.toml`, and module YAML configs,
 * extracting metadata and resolving artifact paths into normalized absolute paths.
 *
 * @param rootPath Absolute path to workspace root
 * @returns Fully resolved ConfigResolverResult with fallback defaults
 */
export async function resolveBmadConfig(rootPath: string): Promise<ConfigResolverResult> {
  const diagnostics: string[] = [];
  const sourceFiles: string[] = [];
  const rawValues: Record<string, any> = {};

  const bmadDir = path.join(rootPath, '_bmad');

  // Candidate config files in layering order:
  // 1. Base TOML (_bmad/config.toml)
  // 2. Custom team TOML (_bmad/custom/config.toml)
  // 3. User local TOML (_bmad/custom/config.user.toml)
  // 4. Core YAML (_bmad/core/config.yaml)
  // 5. BMM YAML (_bmad/bmm/config.yaml)
  // 6. BMB YAML (_bmad/bmb/config.yaml)
  // 7. TEA YAML (_bmad/tea/config.yaml)

  const tomlCandidates = [
    path.join(bmadDir, 'config.toml'),
    path.join(bmadDir, 'custom', 'config.toml'),
    path.join(bmadDir, 'custom', 'config.user.toml')
  ];

  for (const candidate of tomlCandidates) {
    const parsed = tryParseToml(candidate, diagnostics);
    if (parsed) {
      sourceFiles.push(candidate);
      // Merge top-level sections into rawValues
      if (parsed.core && typeof parsed.core === 'object') {
        Object.assign(rawValues, parsed.core);
      }
      if (parsed.modules && typeof parsed.modules === 'object') {
        for (const modKey of Object.keys(parsed.modules)) {
          const modObj = parsed.modules[modKey];
          if (modObj && typeof modObj === 'object') {
            Object.assign(rawValues, modObj);
          }
        }
      }
      Object.assign(rawValues, parsed);
    }
  }

  const yamlCandidates = [
    path.join(bmadDir, 'core', 'config.yaml'),
    path.join(bmadDir, 'bmm', 'config.yaml'),
    path.join(bmadDir, 'bmb', 'config.yaml'),
    path.join(bmadDir, 'tea', 'config.yaml'),
    path.join(bmadDir, 'cis', 'config.yaml')
  ];

  for (const candidate of yamlCandidates) {
    const parsed = tryParseYaml(candidate, diagnostics);
    if (parsed) {
      sourceFiles.push(candidate);
      Object.assign(rawValues, parsed);
    }
  }

  // Token dictionary initialization
  const tokens: Record<string, string> = {
    'project-root': rootPath,
    'project_root': rootPath
  };

  // Resolve output_folder first so other tokens referencing {output_folder} resolve
  let rawOutputFolder = rawValues.output_folder || DEFAULT_RELATIVE_PATHS.outputFolder;
  const resolvedOutputFolder = expandTokens(rawOutputFolder, tokens, rootPath);
  tokens['output-folder'] = resolvedOutputFolder;
  tokens['output_folder'] = resolvedOutputFolder;

  // Add all known string values into tokens dictionary
  for (const [key, val] of Object.entries(rawValues)) {
    if (typeof val === 'string') {
      tokens[key] = val;
    }
  }

  // Resolve primary artifact paths
  const resolvedPaths: BmadResolvedPaths = {
    outputFolder: resolvedOutputFolder,
    planningArtifacts: expandTokens(
      rawValues.planning_artifacts || DEFAULT_RELATIVE_PATHS.planningArtifacts,
      tokens,
      rootPath
    ),
    implementationArtifacts: expandTokens(
      rawValues.implementation_artifacts || DEFAULT_RELATIVE_PATHS.implementationArtifacts,
      tokens,
      rootPath
    ),
    testArtifacts: expandTokens(
      rawValues.test_artifacts || DEFAULT_RELATIVE_PATHS.testArtifacts,
      tokens,
      rootPath
    ),
    projectKnowledge: expandTokens(
      rawValues.project_knowledge || DEFAULT_RELATIVE_PATHS.projectKnowledge,
      tokens,
      rootPath
    ),
    bmadBuilderOutputFolder: expandTokens(
      rawValues.bmad_builder_output_folder || DEFAULT_RELATIVE_PATHS.bmadBuilderOutputFolder,
      tokens,
      rootPath
    ),
    bmadBuilderReports: expandTokens(
      rawValues.bmad_builder_reports || DEFAULT_RELATIVE_PATHS.bmadBuilderReports,
      tokens,
      rootPath
    ),
    testDesignOutput: expandTokens(
      rawValues.test_design_output || DEFAULT_RELATIVE_PATHS.testDesignOutput,
      tokens,
      rootPath
    ),
    testReviewOutput: expandTokens(
      rawValues.test_review_output || DEFAULT_RELATIVE_PATHS.testReviewOutput,
      tokens,
      rootPath
    ),
    traceOutput: expandTokens(
      rawValues.trace_output || DEFAULT_RELATIVE_PATHS.traceOutput,
      tokens,
      rootPath
    )
  };

  const config: BmadConfig = {
    projectName: rawValues.project_name || rawValues.projectName,
    userSkillLevel: rawValues.user_skill_level || rawValues.userSkillLevel,
    userName: rawValues.user_name || rawValues.userName,
    communicationLanguage: rawValues.communication_language || rawValues.communicationLanguage,
    documentOutputLanguage: rawValues.document_output_language || rawValues.documentOutputLanguage,
    rawValues
  };

  return {
    isSuccess: true,
    rootPath,
    paths: resolvedPaths,
    config,
    diagnostics,
    sourceFiles
  };
}
