import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');
    const testWorkspace = path.resolve(__dirname, '../test/fixtures/sample-bmad-project');

    console.log('[Test Runner] Launching VS Code Extension Development Host...');
    console.log(`[Test Runner] Extension Path: ${extensionDevelopmentPath}`);
    console.log(`[Test Runner] Tests Path: ${extensionTestsPath}`);
    console.log(`[Test Runner] Fixture Workspace: ${testWorkspace}`);

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        testWorkspace,
        '--disable-extensions',
        '--disable-gpu'
      ]
    });

    console.log('[Test Runner] Extension Development Host tests completed successfully.');
  } catch (err) {
    console.error('[Test Runner] Failed to run tests inside Extension Development Host:', err);
    process.exit(1);
  }
}

main();
