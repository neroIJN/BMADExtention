/**
 * Result of BMAD workspace detection.
 */
export interface BmadDetectionResult {
  /**
   * Whether the active workspace contains a valid BMAD installation.
   */
  isBmad: boolean;

  /**
   * Path to the root directory where BMAD was detected.
   */
  rootPath?: string;

  /**
   * Whether _bmad/_config/manifest.yaml exists.
   */
  hasManifest: boolean;

  /**
   * Whether _bmad/_config/bmad-help.csv exists.
   */
  hasHelpCatalog: boolean;

  /**
   * Installed BMAD version (e.g. "6.12.0").
   */
  version?: string;

  /**
   * List of installed module names (e.g. ["core", "bmm", "bmb", "cis", "tea"]).
   */
  modules?: string[];

  /**
   * Any warning or non-blocking error detected during scan.
   */
  warning?: string;
}

/**
 * Manifest module entry from _bmad/_config/manifest.yaml.
 */
export interface BmadManifestModule {
  name: string;
  version: string;
  installDate?: string;
  lastUpdated?: string;
  source?: string;
  npmPackage?: string | null;
  repoUrl?: string | null;
}

/**
 * Parsed structure of _bmad/_config/manifest.yaml.
 */
export interface BmadManifest {
  installation?: {
    version: string;
    installDate?: string;
    lastUpdated?: string;
    installShims?: boolean;
  };
  modules?: BmadManifestModule[];
  ides?: string[];
}

/**
 * Fully resolved, absolute filesystem paths for BMAD artifacts and project directories.
 */
export interface BmadResolvedPaths {
  outputFolder: string;
  planningArtifacts: string;
  implementationArtifacts: string;
  testArtifacts: string;
  projectKnowledge: string;
  bmadBuilderOutputFolder?: string;
  bmadBuilderReports?: string;
  testDesignOutput?: string;
  testReviewOutput?: string;
  traceOutput?: string;
  [key: string]: string | undefined;
}

/**
 * Parsed configuration settings from BMAD TOML and YAML files.
 */
export interface BmadConfig {
  projectName?: string;
  userSkillLevel?: string;
  userName?: string;
  communicationLanguage?: string;
  documentOutputLanguage?: string;
  rawValues: Record<string, any>;
}

/**
 * Result returned by the configuration and path resolver engine.
 */
export interface ConfigResolverResult {
  isSuccess: boolean;
  rootPath: string;
  paths: BmadResolvedPaths;
  config: BmadConfig;
  diagnostics: string[];
  sourceFiles: string[];
}

/**
 * Artifact completion status.
 */
export type ArtifactStatus = 'completed' | 'in-progress' | 'not-started';

/**
 * Represents an individual skill within the BMAD lifecycle.
 */
export interface BmadSkillNode {
  id: string;
  module: string;
  skill: string;
  displayName: string;
  menuCode?: string;
  description?: string;
  action?: string;
  args?: string;
  phase: string;
  precededBy?: string;
  followedBy?: string;
  required: boolean;
  outputLocation?: string;
  outputs?: string;
  status: ArtifactStatus;
  artifactPath?: string;
}

/**
 * Represents a phase containing grouped BMAD skills.
 */
export interface BmadLifecyclePhase {
  id: string;
  label: string;
  order: number;
  skills: BmadSkillNode[];
}

/**
 * Tree node used by the Lifecycle Tree Provider.
 */
export type BmadTreeItemType = 'phase' | 'skill';

export interface BmadTreeNode {
  type: BmadTreeItemType;
  phase?: BmadLifecyclePhase;
  skill?: BmadSkillNode;
}

/**
 * Recommendation for the next skill to execute in the BMAD lifecycle.
 */
export interface BmadSkillRecommendation {
  skill: BmadSkillNode;
  reason: string;
  priority: 'high' | 'normal';
}

/**
 * High-level evaluated status of the active BMAD project.
 */
export interface BmadProjectStatus {
  activePhaseId: string;
  activePhaseLabel: string;
  phaseStatus: 'not-started' | 'in-progress' | 'completed';
  statusBarText: string;
  statusBarTooltip: string;
  recommendations: BmadSkillRecommendation[];
}

/**
 * Represents an individual agent / persona from BMAD configurations.
 */
export interface BmadAgentNode {
  id: string;
  name: string;
  title: string;
  module: string;
  team: string;
  icon: string;
  description: string;
}

/**
 * Represents a team / domain grouping of agents.
 */
export interface BmadAgentTeam {
  id: string;
  name: string;
  agents: BmadAgentNode[];
}

/**
 * Tree node used by the Agents Tree Provider.
 */
export type BmadAgentTreeItemType = 'team' | 'agent';

export interface BmadAgentTreeNode {
  type: BmadAgentTreeItemType;
  team?: BmadAgentTeam;
  agent?: BmadAgentNode;
}

/**
 * Canonical category IDs for BMAD artifacts.
 */
export type BmadArtifactCategoryType =
  | 'planning'
  | 'architecture'
  | 'implementation'
  | 'test'
  | 'other';

/**
 * Represents an individual project artifact/deliverable.
 */
export interface BmadArtifactItem {
  id: string;
  fileName: string;
  relativePath: string;
  absolutePath: string;
  category: BmadArtifactCategoryType;
  sizeBytes: number;
  sizeFormatted: string;
  modifiedAt: string;
  extension: string;
}

/**
 * Represents a logical category containing grouped artifacts.
 */
export interface BmadArtifactCategory {
  id: BmadArtifactCategoryType;
  label: string;
  order: number;
  artifacts: BmadArtifactItem[];
}

/**
 * Tree node used by the Artifacts Tree Provider.
 */
export type BmadArtifactTreeItemType = 'category' | 'artifact';

export interface BmadArtifactTreeNode {
  type: BmadArtifactTreeItemType;
  category?: BmadArtifactCategory;
  artifact?: BmadArtifactItem;
}

/**
 * Metadata recorded in .memlog.md YAML frontmatter.
 */
export interface BmadMemlogMetadata {
  topic?: string;
  goal?: string;
  updated?: string;
  [key: string]: string | undefined;
}

/**
 * An individual entry in a .memlog.md file.
 */
export interface BmadMemlogEntry {
  id: string;
  index: number;
  type: string;
  author?: string;
  text: string;
  raw: string;
}

/**
 * Parsed structure of a .memlog.md file.
 */
export interface BmadMemlogDocument {
  filePath: string;
  metadata: BmadMemlogMetadata;
  entries: BmadMemlogEntry[];
  entryCount: number;
  availableTypes: string[];
}

/**
 * Filter criteria for memlog entries.
 */
export interface BmadMemlogFilter {
  type?: string;
  author?: string;
  query?: string;
}

/**
 * Overall quality gate verdict from rubric validation.
 */
export type BmadValidationVerdict = 'PASS' | 'CONCERNS' | 'FAIL';

/**
 * Finding severity grades according to BMAD review triage principles.
 */
export type BmadFindingSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * A single defect, gap, or improvement finding identified during review or validation.
 */
export interface BmadValidationFinding {
  id: string;
  severity: BmadFindingSeverity;
  category: string;
  title: string;
  description: string;
  recommendation?: string;
  filePath: string;
  lineNumber?: number;
  columnNumber?: number;
}

/**
 * Full scorecard report produced by rubric evaluation or parsed from review artifacts.
 */
export interface BmadValidationReport {
  id: string;
  title: string;
  targetFile: string;
  evaluatedAt: string;
  verdict: BmadValidationVerdict;
  score: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  rubricCategories: Array<{
    name: string;
    score: number;
    status: 'pass' | 'concerns' | 'fail';
    details: string;
  }>;
  findings: BmadValidationFinding[];
}

/**
 * Traceability coverage status for a functional requirement.
 */
export type BmadTraceStatus = 'covered' | 'partial' | 'uncovered';

/**
 * Mapping between a functional requirement and its verifying automated test suite.
 */
export interface BmadTeaRequirementTrace {
  id: string;
  title: string;
  description?: string;
  status: BmadTraceStatus;
  mappedTestFiles: string[];
  mappedTestCount: number;
}

/**
 * Step in the Acceptance Test-Driven Development (ATDD) workflow.
 */
export interface BmadAtddPhase {
  id: string;
  title: string;
  status: 'completed' | 'in-progress' | 'pending';
  description: string;
}

/**
 * Overall quality report produced by TEA (Test Architecture Enterprise) analysis.
 */
export interface BmadTeaQualityReport {
  qualityScore: number;
  totalRequirements: number;
  coveredRequirements: number;
  partialRequirements: number;
  uncoveredRequirements: number;
  coveragePercentage: number;
  totalTestFiles: number;
  traceabilityMatrix: BmadTeaRequirementTrace[];
  atddChecklist: BmadAtddPhase[];
  recommendations: string[];
}

