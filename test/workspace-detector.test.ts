import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { detectBmadWorkspace } from '../src/core/workspace-detector';

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
});
