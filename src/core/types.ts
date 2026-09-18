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
