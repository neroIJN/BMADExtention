import * as vscode from 'vscode';
import { detectBmadWorkspace } from './core/workspace-detector';
import { BmadDetectionResult } from './core/types';

let outputChannel: vscode.OutputChannel | undefined;

/**
 * Extension activation entrypoint.
 * Called by VS Code when activationEvents criteria are met.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // 1. Initialize dedicated Output Channel
  outputChannel = vscode.window.createOutputChannel('BMAD Method');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine('[BMAD] Initializing BMAD Method Visualizer & Helper...');

  // 2. Detect workspace status
  const workspaceFolders = vscode.workspace.workspaceFolders;
  let detectionResult: BmadDetectionResult = {
    isBmad: false,
    hasManifest: false,
    hasHelpCatalog: false
  };

  if (workspaceFolders && workspaceFolders.length > 0) {
    const rootPath = workspaceFolders[0].uri.fsPath;
    detectionResult = await detectBmadWorkspace(rootPath);
  }

  // 3. Set context key to govern view visibility in package.json
  await vscode.commands.executeCommand('setContext', 'bmad:hasBmadProject', detectionResult.isBmad);

  if (detectionResult.isBmad) {
    outputChannel.appendLine(
      `[BMAD] Detected BMAD installation v${detectionResult.version ?? 'unknown'}`
    );
    if (detectionResult.modules && detectionResult.modules.length > 0) {
      outputChannel.appendLine(`[BMAD] Active modules: ${detectionResult.modules.join(', ')}`);
    }
  } else {
    outputChannel.appendLine('[BMAD] No active BMAD installation detected in current workspace.');
  }

  // 4. Register Commands
  const openDashboardCmd = vscode.commands.registerCommand('bmad.openDashboard', () => {
    if (!detectionResult.isBmad) {
      vscode.window.showWarningMessage('No BMAD project detected in current workspace.');
      return;
    }
    vscode.window.showInformationMessage('BMAD Visualizer Dashboard will open here.');
  });

  const statusCheckCmd = vscode.commands.registerCommand('bmad.statusCheck', async () => {
    if (workspaceFolders && workspaceFolders.length > 0) {
      const refreshed = await detectBmadWorkspace(workspaceFolders[0].uri.fsPath);
      if (refreshed.isBmad) {
        vscode.window.showInformationMessage(
          `BMAD Method v${refreshed.version ?? 'unknown'} active. Modules: ${refreshed.modules?.join(', ')}`
        );
      } else {
        vscode.window.showWarningMessage('No BMAD installation detected in the current workspace.');
      }
    } else {
      vscode.window.showWarningMessage('No workspace folder open.');
    }
  });

  const runSkillCmd = vscode.commands.registerCommand('bmad.runSkill', () => {
    vscode.window.showInformationMessage('BMAD Run Skill palette initialized.');
  });

  const talkToAgentCmd = vscode.commands.registerCommand('bmad.talkToAgent', () => {
    vscode.window.showInformationMessage('BMAD Persona Selector initialized.');
  });

  context.subscriptions.push(openDashboardCmd, statusCheckCmd, runSkillCmd, talkToAgentCmd);
  outputChannel.appendLine('[BMAD] Activation complete.');
}

/**
 * Extension deactivation entrypoint.
 */
export function deactivate(): void {
  if (outputChannel) {
    outputChannel.appendLine('[BMAD] Extension deactivated.');
  }
}
