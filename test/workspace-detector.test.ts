import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { detectBmadWorkspace, detectAllBmadWorkspaces } from '../src/core/workspace-detector';

describe('WorkspaceDetector', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bmad-test-'));
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('should return isBmad: false when workspace is empty', async () => {
    const result = await detectBmadWorkspace(tempDir);
    expect(result.isBmad).toBe(false);
    expect(result.hasManifest).toBe(false);
    expect(result.hasHelpCatalog).toBe(false);
  });

  it('should return isBmad: false for invalid or null path', async () => {
    const result = await detectBmadWorkspace('');
    expect(result.isBmad).toBe(false);
  });

  it('should return isBmad: false for partial workspace with only manifest.yaml', async () => {
    const configDir = path.join(tempDir, '_bmad', '_config');
    await fs.promises.mkdir(configDir, { recursive: true });
    await fs.promises.writeFile(path.join(configDir, 'manifest.yaml'), 'installation:\n  version: 6.12.0\n');

    const result = await detectBmadWorkspace(tempDir);
    expect(result.isBmad).toBe(false);
    expect(result.hasManifest).toBe(true);
    expect(result.hasHelpCatalog).toBe(false);
  });

  it('should return isBmad: true when both manifest.yaml and bmad-help.csv exist', async () => {
    const configDir = path.join(tempDir, '_bmad', '_config');
    await fs.promises.mkdir(configDir, { recursive: true });
    const manifestYaml = `
installation:
  version: 6.12.0
modules:
  - name: core
  - name: bmm
  - name: tea
`;
    await fs.promises.writeFile(path.join(configDir, 'manifest.yaml'), manifestYaml);
    await fs.promises.writeFile(path.join(configDir, 'bmad-help.csv'), 'module,skill,name\n');

    const result = await detectBmadWorkspace(tempDir);
    expect(result.isBmad).toBe(true);
    expect(result.hasManifest).toBe(true);
    expect(result.hasHelpCatalog).toBe(true);
    expect(result.version).toBe('6.12.0');
    expect(result.modules).toEqual(['core', 'bmm', 'tea']);
  });

  it('should handle malformed manifest.yaml gracefully without throwing', async () => {
    const configDir = path.join(tempDir, '_bmad', '_config');
    await fs.promises.mkdir(configDir, { recursive: true });
    await fs.promises.writeFile(path.join(configDir, 'manifest.yaml'), 'invalid: [yaml: unclosed');
    await fs.promises.writeFile(path.join(configDir, 'bmad-help.csv'), 'module,skill,name\n');

    const result = await detectBmadWorkspace(tempDir);
    expect(result.isBmad).toBe(true);
    expect(result.warning).toBeDefined();
  });

  it('should accurately detect the actual BMADExtention project repository when present', async () => {
    const repoPath = path.resolve(__dirname, '..');
    const result = await detectBmadWorkspace(repoPath);
    if (fs.existsSync(path.join(repoPath, '_bmad', '_config', 'manifest.yaml'))) {
      expect(result.isBmad).toBe(true);
      expect(result.hasManifest).toBe(true);
      expect(result.hasHelpCatalog).toBe(true);
      expect(result.version).toBe('6.12.0');
      expect(result.modules).toContain('core');
      expect(result.modules).toContain('bmm');
    } else {
      expect(result.isBmad).toBe(false);
    }
  });

  it('should filter and return only folders that contain BMAD in detectAllBmadWorkspaces', async () => {
    const dirA = path.join(tempDir, 'project-a');
    const dirB = path.join(tempDir, 'project-b');
    const dirC = path.join(tempDir, 'project-c');

    await fs.promises.mkdir(dirA, { recursive: true });
    await fs.promises.mkdir(dirB, { recursive: true });
    await fs.promises.mkdir(dirC, { recursive: true });

    // Setup dirB as valid BMAD
    const configB = path.join(dirB, '_bmad', '_config');
    await fs.promises.mkdir(configB, { recursive: true });
    await fs.promises.writeFile(path.join(configB, 'manifest.yaml'), 'installation:\n  version: 6.12.0\n');
    await fs.promises.writeFile(path.join(configB, 'bmad-help.csv'), 'module,skill,name\n');

    // Setup dirC as valid BMAD
    const configC = path.join(dirC, '_bmad', '_config');
    await fs.promises.mkdir(configC, { recursive: true });
    await fs.promises.writeFile(path.join(configC, 'manifest.yaml'), 'installation:\n  version: 6.13.0\n');
    await fs.promises.writeFile(path.join(configC, 'bmad-help.csv'), 'module,skill,name\n');

    const results = await detectAllBmadWorkspaces([dirA, dirB, dirC, '']);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.rootPath)).toEqual([dirB, dirC]);
    expect(results[0].version).toBe('6.12.0');
    expect(results[1].version).toBe('6.13.0');
  });

  it('should return empty array for empty or invalid roots list', async () => {
    expect(await detectAllBmadWorkspaces([])).toEqual([]);
    expect(await detectAllBmadWorkspaces(null as any)).toEqual([]);
  });
});

