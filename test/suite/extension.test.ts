import * as assert from 'assert';
import * as vscode from 'vscode';

suite('BMAD Extension Host Integration Test Suite', () => {
  vscode.window.showInformationMessage('Running BMAD Extension Host Integration Tests...');

  test('Extension should be present and activated in host', async () => {
    const ext = vscode.extensions.getExtension('neroIJN.bmad-method-visualizer');
    assert.ok(ext, 'Extension neroIJN.bmad-method-visualizer should be found in host registry');

    if (!ext.isActive) {
      await ext.activate();
    }
    assert.strictEqual(ext.isActive, true, 'Extension must be active in host');
  });

  test('BMAD core commands should be registered in the VS Code command palette', async () => {
    const commands = await vscode.commands.getCommands(true);
    const expectedCommands = [
      'bmad.openDashboard',
      'bmad.statusCheck',
      'bmad.runSkill',
      'bmad.talkToAgent',
      'bmad.refreshLifecycle',
      'bmad.refreshAgents',
      'bmad.refreshArtifacts',
      'bmad.switchWorkspaceProject',
      'bmad.showRecommendations'
    ];

    for (const cmd of expectedCommands) {
      assert.ok(
        commands.includes(cmd),
        `Command ${cmd} should be registered in host command registry`
      );
    }
  });

  test('Should execute bmad.statusCheck command without error', async () => {
    // Should execute safely in active host
    await vscode.commands.executeCommand('bmad.statusCheck');
    assert.ok(true, 'statusCheck executed cleanly');
  });

  test('Should execute bmad.showRecommendations command without error', async () => {
    await vscode.commands.executeCommand('bmad.showRecommendations');
    assert.ok(true, 'showRecommendations executed cleanly');
  });

  test('Should execute bmad.switchWorkspaceProject without throwing', async () => {
    await vscode.commands.executeCommand('bmad.switchWorkspaceProject');
    assert.ok(true, 'switchWorkspaceProject executed cleanly');
  });
});
