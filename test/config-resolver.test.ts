import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { resolveBmadConfig, expandTokens } from '../src/core/config-resolver';

describe('ConfigResolver', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bmad-config-test-'));
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe('expandTokens', () => {
    it('should expand {project-root} to rootPath', () => {
      const tokens = { 'project-root': tempDir };
      const expanded = expandTokens('{project-root}/_bmad-output', tokens, tempDir);
      expect(expanded).toBe(path.normalize(`${tempDir}/_bmad-output`));
    });

    it('should expand nested tokens recursively', () => {
      const outputDir = path.normalize(`${tempDir}/custom-out`);
      const tokens = {
        'project-root': tempDir,
        'output_folder': outputDir
      };
      const expanded = expandTokens('{output_folder}/planning-artifacts', tokens, tempDir);
      expect(expanded).toBe(path.normalize(`${outputDir}/planning-artifacts`));
    });

    it('should resolve relative paths without tokens against rootPath', () => {
      const tokens = {};
      const expanded = expandTokens('relative/path/to/artifacts', tokens, tempDir);
      expect(expanded).toBe(path.resolve(tempDir, 'relative/path/to/artifacts'));
    });

    it('should handle cyclic tokens safely without infinite loop', () => {
      const tokens = {
        'a': '{b}',
        'b': '{a}'
      };
      // Should terminate after maxIterations without crashing
      const expanded = expandTokens('{a}', tokens, tempDir, 5);
      expect(typeof expanded).toBe('string');
    });
  });

  describe('resolveBmadConfig', () => {
    it('should return default paths when no config files exist', async () => {
      const result = await resolveBmadConfig(tempDir);
      expect(result.isSuccess).toBe(true);
      expect(result.paths.outputFolder).toBe(path.join(tempDir, '_bmad-output'));
      expect(result.paths.planningArtifacts).toBe(path.join(tempDir, '_bmad-output', 'planning-artifacts'));
      expect(result.paths.implementationArtifacts).toBe(path.join(tempDir, '_bmad-output', 'implementation-artifacts'));
      expect(result.paths.testArtifacts).toBe(path.join(tempDir, '_bmad-output', 'test-artifacts'));
      expect(result.sourceFiles.length).toBe(0);
      expect(result.diagnostics.length).toBe(0);
    });

    it('should resolve custom paths from _bmad/bmm/config.yaml', async () => {
      const bmmDir = path.join(tempDir, '_bmad', 'bmm');
      await fs.promises.mkdir(bmmDir, { recursive: true });

      const yamlContent = `
output_folder: "{project-root}/custom-output"
planning_artifacts: "{output_folder}/custom-plans"
implementation_artifacts: "{output_folder}/custom-impl"
project_name: "TestProject"
user_name: "Alice"
`;
      await fs.promises.writeFile(path.join(bmmDir, 'config.yaml'), yamlContent);

      const result = await resolveBmadConfig(tempDir);
      expect(result.isSuccess).toBe(true);
      expect(result.paths.outputFolder).toBe(path.join(tempDir, 'custom-output'));
      expect(result.paths.planningArtifacts).toBe(path.join(tempDir, 'custom-output', 'custom-plans'));
      expect(result.paths.implementationArtifacts).toBe(path.join(tempDir, 'custom-output', 'custom-impl'));
      expect(result.config.projectName).toBe('TestProject');
      expect(result.config.userName).toBe('Alice');
      expect(result.sourceFiles.length).toBe(1);
    });

    it('should resolve paths and modules from _bmad/config.toml', async () => {
      const bmadDir = path.join(tempDir, '_bmad');
      await fs.promises.mkdir(bmadDir, { recursive: true });

      const tomlContent = `
[core]
project_name = "TomlProject"
document_output_language = "English"
output_folder = "{project-root}/toml-output"

[modules.bmm]
planning_artifacts = "{project-root}/toml-output/plans"
implementation_artifacts = "{project-root}/toml-output/impl"
`;
      await fs.promises.writeFile(path.join(bmadDir, 'config.toml'), tomlContent);

      const result = await resolveBmadConfig(tempDir);
      expect(result.isSuccess).toBe(true);
      expect(result.paths.outputFolder).toBe(path.join(tempDir, 'toml-output'));
      expect(result.paths.planningArtifacts).toBe(path.join(tempDir, 'toml-output', 'plans'));
      expect(result.config.projectName).toBe('TomlProject');
      expect(result.config.documentOutputLanguage).toBe('English');
    });

    it('should gracefully handle malformed YAML without throwing', async () => {
      const bmmDir = path.join(tempDir, '_bmad', 'bmm');
      await fs.promises.mkdir(bmmDir, { recursive: true });
      await fs.promises.writeFile(path.join(bmmDir, 'config.yaml'), ': : bad yaml: [unclosed');

      const result = await resolveBmadConfig(tempDir);
      expect(result.isSuccess).toBe(true);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.paths.outputFolder).toBe(path.join(tempDir, '_bmad-output'));
    });

    it('should gracefully handle malformed TOML without throwing', async () => {
      const bmadDir = path.join(tempDir, '_bmad');
      await fs.promises.mkdir(bmadDir, { recursive: true });
      await fs.promises.writeFile(path.join(bmadDir, 'config.toml'), '[core\ninvalid_toml = ');

      const result = await resolveBmadConfig(tempDir);
      expect(result.isSuccess).toBe(true);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.paths.outputFolder).toBe(path.join(tempDir, '_bmad-output'));
    });

    it('should accurately resolve real configuration for BMADExtention workspace', async () => {
      const realRoot = path.resolve(__dirname, '..');
      const result = await resolveBmadConfig(realRoot);

      expect(result.isSuccess).toBe(true);
      expect(result.paths.outputFolder).toBe(path.join(realRoot, '_bmad-output'));
      expect(result.paths.planningArtifacts).toBe(path.join(realRoot, '_bmad-output', 'planning-artifacts'));
      expect(result.paths.implementationArtifacts).toBe(path.join(realRoot, '_bmad-output', 'implementation-artifacts'));
      expect(result.config.projectName).toBe('BMADExtention');
      expect(result.sourceFiles.length).toBeGreaterThan(0);
    });
  });
});
