import * as vscode from 'vscode';
import * as path from 'path';
import { detectBmadWorkspace } from './core/workspace-detector';
import { resolveBmadConfig } from './core/config-resolver';
import { findMemlogFiles } from './core/memlog-parser';
import { LifecycleTreeProvider } from './adapters/lifecycle-tree-provider';
import { StatusBarManager } from './adapters/status-bar-manager';
import { AgentsTreeProvider } from './adapters/agents-tree-provider';
import { ArtifactsTreeProvider } from './adapters/artifacts-tree-provider';
import { MemlogInspectorPanel } from './adapters/memlog-inspector-panel';
import { RubricValidatorPanel } from './adapters/rubric-validator-panel';
import { ExecutionDispatcher } from './adapters/execution-dispatcher';
import { CommandPaletteManager } from './adapters/command-palette-manager';
import {
  BmadAgentTreeNode,
  BmadArtifactTreeNode,
  BmadDetectionResult,
  BmadTreeNode,
  ConfigResolverResult
} from './core/types';

let outputChannel: vscode.OutputChannel | undefined;
let activeConfig: ConfigResolverResult | undefined;
let lifecycleProvider: LifecycleTreeProvider | undefined;
let agentsProvider: AgentsTreeProvider | undefined;
let artifactsProvider: ArtifactsTreeProvider | undefined;
let statusBarManager: StatusBarManager | undefined;
let executionDispatcher: ExecutionDispatcher | undefined;

/**
 * Extension activation entrypoint.
 * Called by VS Code when activationEvents criteria are met.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // 1. Initialize dedicated Output Channel
  outputChannel = vscode.window.createOutputChannel('BMAD Method');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine('[BMAD] Initializing BMAD Method Visualizer & Helper...');

  // 2. Initialize Tree View Providers, Status Bar Manager & Execution Dispatcher
  lifecycleProvider = new LifecycleTreeProvider();
  agentsProvider = new AgentsTreeProvider();
  artifactsProvider = new ArtifactsTreeProvider();
  statusBarManager = new StatusBarManager();
  executionDispatcher = new ExecutionDispatcher();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('bmad.views.lifecycle', lifecycleProvider),
    vscode.window.registerTreeDataProvider('bmad.views.agents', agentsProvider),
    vscode.window.registerTreeDataProvider('bmad.views.artifacts', artifactsProvider),
    statusBarManager
  );

  // 3. Detect workspace status
  const workspaceFolders = vscode.workspace.workspaceFolders;
  let detectionResult: BmadDetectionResult = {
    isBmad: false,
    hasManifest: false,
    hasHelpCatalog: false
  };

  let rootPath: string | undefined;

  if (workspaceFolders && workspaceFolders.length > 0) {
    rootPath = workspaceFolders[0].uri.fsPath;
    detectionResult = await detectBmadWorkspace(rootPath);
  }

  // 4. Set context key to govern view visibility in package.json
  await vscode.commands.executeCommand('setContext', 'bmad:hasBmadProject', detectionResult.isBmad);

  if (detectionResult.isBmad && rootPath) {
    outputChannel.appendLine(
      `[BMAD] Detected BMAD installation v${detectionResult.version ?? 'unknown'}`
    );
    if (detectionResult.modules && detectionResult.modules.length > 0) {
      outputChannel.appendLine(`[BMAD] Active modules: ${detectionResult.modules.join(', ')}`);
    }

    // Resolve paths & configuration dynamically
    try {
      activeConfig = await resolveBmadConfig(rootPath);
      outputChannel.appendLine(`[BMAD] Output folder: ${activeConfig.paths.outputFolder}`);
      outputChannel.appendLine(`[BMAD] Planning artifacts: ${activeConfig.paths.planningArtifacts}`);
      outputChannel.appendLine(`[BMAD] Implementation artifacts: ${activeConfig.paths.implementationArtifacts}`);
      if (activeConfig.diagnostics.length > 0) {
        for (const diag of activeConfig.diagnostics) {
          outputChannel.appendLine(`[BMAD Warning] ${diag}`);
        }
      }

      // Populate Lifecycle tree view, Agents tree view, Artifacts tree view, and update status bar
      await lifecycleProvider.load(rootPath, activeConfig.paths);
      await agentsProvider.load(rootPath);
      await artifactsProvider.load(rootPath, activeConfig.paths);
      statusBarManager.update(lifecycleProvider.getPhases());
    } catch (err: any) {
      outputChannel.appendLine(`[BMAD Error] Failed to resolve config: ${err?.message || String(err)}`);
    }
  } else {
    outputChannel.appendLine('[BMAD] No active BMAD installation detected in current workspace.');
    statusBarManager.hide();
  }

  // 5. Register Commands
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
        const choice = await vscode.window.showInformationMessage(
          `BMAD Method v${refreshed.version ?? 'unknown'} active. Modules: ${refreshed.modules?.join(', ')}`,
          'View Recommendations',
          'Dismiss'
        );
        if (choice === 'View Recommendations') {
          vscode.commands.executeCommand('bmad.showRecommendations');
        }
      } else {
        vscode.window.showWarningMessage('No BMAD installation detected in the current workspace.');
      }
    } else {
      vscode.window.showWarningMessage('No workspace folder open.');
    }
  });

  const runSkillCmd = vscode.commands.registerCommand('bmad.runSkill', async (skillId?: string) => {
    if (skillId && executionDispatcher) {
      await executionDispatcher.dispatchSkill(skillId);
      return;
    }

    if (lifecycleProvider && executionDispatcher) {
      const selectedSkill = await CommandPaletteManager.promptSkillSelection(
        lifecycleProvider.getPhases()
      );
      if (selectedSkill) {
        await executionDispatcher.dispatchSkill(selectedSkill);
      }
    }
  });

  const refreshWorkspaceCmd = vscode.commands.registerCommand('bmad.refreshWorkspace', async () => {
    if (workspaceFolders && workspaceFolders.length > 0) {
      rootPath = workspaceFolders[0].uri.fsPath;
      detectionResult = await detectBmadWorkspace(rootPath);
      await vscode.commands.executeCommand('setContext', 'bmad:hasBmadProject', detectionResult.isBmad);
      if (detectionResult.isBmad) {
        activeConfig = await resolveBmadConfig(rootPath);
        await lifecycleProvider?.load(rootPath, activeConfig.paths);
        await agentsProvider?.load(rootPath);
        await artifactsProvider?.load(rootPath, activeConfig.paths);
        if (lifecycleProvider) {
          statusBarManager?.update(lifecycleProvider.getPhases());
        }
        vscode.window.showInformationMessage('BMAD workspace state and manifests refreshed.');
      } else {
        statusBarManager?.hide();
        vscode.window.showWarningMessage('No BMAD installation detected in current workspace.');
      }
    }
  });

  const talkToAgentCmd = vscode.commands.registerCommand('bmad.talkToAgent', async (agentId?: string) => {
    if (!agentsProvider || !executionDispatcher) {
      return;
    }

    const teams = agentsProvider.getTeams();
    const allAgents = teams.flatMap((t) => t.agents);
    if (allAgents.length === 0) {
      vscode.window.showInformationMessage('No BMAD personas found in current workspace.');
      return;
    }

    if (agentId) {
      const match = allAgents.find((a) => a.id === agentId);
      if (match) {
        await executionDispatcher.dispatchAgent(match);
        return;
      }
    }

    const selectedAgent = await CommandPaletteManager.promptAgentSelection(teams);
    if (selectedAgent) {
      await executionDispatcher.dispatchAgent(selectedAgent);
    }
  });

  const inspectAgentCmd = vscode.commands.registerCommand(
    'bmad.inspectAgent',
    async (node?: BmadAgentTreeNode) => {
      const agent = node?.agent;
      if (!agent) {
        return;
      }
      const choice = await vscode.window.showInformationMessage(
        `${agent.icon} ${agent.name} — ${agent.title} (${agent.module.toUpperCase()})\n\n"${agent.description}"`,
        { modal: true },
        `Talk to ${agent.name}`,
        'Close'
      );
      if (choice === `Talk to ${agent.name}` && executionDispatcher) {
        await executionDispatcher.dispatchAgent(agent);
      }
    }
  );

  const talkToAgentFromTreeCmd = vscode.commands.registerCommand(
    'bmad.talkToAgentFromTree',
    async (node?: BmadAgentTreeNode) => {
      const agent = node?.agent;
      if (agent && executionDispatcher) {
        await executionDispatcher.dispatchAgent(agent);
      }
    }
  );

  const refreshAgentsCmd = vscode.commands.registerCommand('bmad.refreshAgents', async () => {
    if (rootPath && agentsProvider) {
      await agentsProvider.load(rootPath);
      outputChannel?.appendLine('[BMAD] Agents tree view refreshed.');
    }
  });

  const refreshLifecycleCmd = vscode.commands.registerCommand('bmad.refreshLifecycle', async () => {
    if (rootPath && activeConfig && lifecycleProvider) {
      await lifecycleProvider.load(rootPath, activeConfig.paths);
      statusBarManager?.update(lifecycleProvider.getPhases());
      outputChannel?.appendLine('[BMAD] Lifecycle tree view and status indicator refreshed.');
    }
  });

  const showRecommendationsCmd = vscode.commands.registerCommand(
    'bmad.showRecommendations',
    async () => {
      await statusBarManager?.showQuickPick();
    }
  );

  const runSkillFromTreeCmd = vscode.commands.registerCommand(
    'bmad.runSkillFromTree',
    async (node?: BmadTreeNode) => {
      const skill = node?.skill;
      if (skill && executionDispatcher) {
        await executionDispatcher.dispatchSkill(skill);
      } else {
        vscode.commands.executeCommand('bmad.runSkill');
      }
    }
  );

  const openArtifactFromTreeCmd = vscode.commands.registerCommand(
    'bmad.openArtifactFromTree',
    async (node?: BmadTreeNode) => {
      if (node?.skill?.artifactPath) {
        await vscode.commands.executeCommand(
          'vscode.open',
          vscode.Uri.file(node.skill.artifactPath)
        );
      } else {
        vscode.window.showInformationMessage(
          `No artifact generated yet for ${node?.skill?.displayName || 'this skill'}.`
        );
      }
    }
  );

  const openArtifactCmd = vscode.commands.registerCommand(
    'bmad.openArtifact',
    async (filePathOrNode?: string | BmadArtifactTreeNode) => {
      let filePath: string | undefined;
      if (typeof filePathOrNode === 'string') {
        filePath = filePathOrNode;
      } else if (filePathOrNode?.artifact) {
        filePath = filePathOrNode.artifact.absolutePath;
      }

      if (filePath) {
        try {
          await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath));
        } catch (err: any) {
          vscode.window.showErrorMessage(`Failed to open artifact: ${err?.message || String(err)}`);
        }
      } else {
        vscode.window.showWarningMessage('No artifact file specified to open.');
      }
    }
  );

  const refreshArtifactsCmd = vscode.commands.registerCommand('bmad.refreshArtifacts', async () => {
    if (rootPath && artifactsProvider) {
      await artifactsProvider.load(rootPath, activeConfig?.paths);
      outputChannel?.appendLine('[BMAD] Artifacts explorer refreshed.');
    }
  });

  const inspectMemlogCmd = vscode.commands.registerCommand(
    'bmad.inspectMemlog',
    async (targetPath?: string) => {
      if (!rootPath) {
        vscode.window.showWarningMessage('No workspace open to locate memory logs.');
        return;
      }

      let memlogPath = targetPath;
      if (!memlogPath) {
        const foundFiles = await findMemlogFiles(rootPath);
        if (foundFiles.length === 0) {
          const choice = await vscode.window.showInformationMessage(
            'No .memlog.md files detected in this project yet.',
            'Learn About Memlog',
            'Close'
          );
          if (choice === 'Learn About Memlog') {
            vscode.commands.executeCommand('bmad.runSkill', 'bmad-help');
          }
          return;
        } else if (foundFiles.length === 1) {
          memlogPath = foundFiles[0];
        } else {
          const items = foundFiles.map((fp) => ({
            label: `$(history) ${path.relative(rootPath!, fp)}`,
            description: fp,
            filePath: fp
          }));
          const selected = await vscode.window.showQuickPick(items, {
            title: 'BMAD Memlog — Select Working Memory Log',
            placeHolder: 'Choose a .memlog.md to inspect its chronological timeline...'
          });
          if (!selected) {
            return;
          }
          memlogPath = selected.filePath;
        }
      }

      await MemlogInspectorPanel.createOrShow(context.extensionUri, memlogPath);
    }
  );

  const validateDocumentCmd = vscode.commands.registerCommand(
    'bmad.validateDocument',
    async (targetArg?: any) => {
      let targetPath: string | undefined;
      if (typeof targetArg === 'string') {
        targetPath = targetArg;
      } else if (targetArg && 'fsPath' in targetArg) {
        targetPath = (targetArg as vscode.Uri).fsPath;
      } else if (targetArg && 'artifact' in targetArg && targetArg.artifact) {
        targetPath = targetArg.artifact.absolutePath;
      }

      if (!targetPath && rootPath) {
        // Collect candidate markdown documents from artifactsProvider
        const artifactItems = artifactsProvider?.getCategories().flatMap((c) => c.artifacts) || [];
        const mdArtifacts = artifactItems.filter((a) => a.extension === '.md');
        if (mdArtifacts.length > 0) {
          const items = mdArtifacts.map((a) => ({
            label: `$(file-text) ${a.fileName}`,
            description: a.relativePath,
            filePath: a.absolutePath
          }));
          const selected = await vscode.window.showQuickPick(items, {
            title: 'BMAD Rubric — Select Document to Validate',
            placeHolder: 'Select a PRD, specification, or review report to evaluate...'
          });
          if (selected) {
            targetPath = selected.filePath;
          }
        }
      }

      if (targetPath) {
        await RubricValidatorPanel.createOrShow(context.extensionUri, targetPath);
      } else {
        vscode.window.showInformationMessage('No document selected to validate.');
      }
    }
  );

  context.subscriptions.push(
    openDashboardCmd,
    statusCheckCmd,
    runSkillCmd,
    talkToAgentCmd,
    inspectAgentCmd,
    talkToAgentFromTreeCmd,
    refreshAgentsCmd,
    refreshLifecycleCmd,
    refreshWorkspaceCmd,
    refreshArtifactsCmd,
    openArtifactCmd,
    inspectMemlogCmd,
    validateDocumentCmd,
    showRecommendationsCmd,
    runSkillFromTreeCmd,
    openArtifactFromTreeCmd
  );
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

