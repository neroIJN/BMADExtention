import * as vscode from 'vscode';
import * as path from 'path';
import { detectBmadWorkspace } from './core/workspace-detector';
import { resolveBmadConfig } from './core/config-resolver';
import { findMemlogFiles } from './core/memlog-parser';
import { LifecycleTreeProvider } from './adapters/lifecycle-tree-provider';
import { StatusBarManager } from './adapters/status-bar-manager';
import { AgentsTreeProvider } from './adapters/agents-tree-provider';
import { ArtifactsTreeProvider } from './adapters/artifacts-tree-provider';
import { SprintTreeProvider } from './adapters/sprint-tree-provider';
import { WelcomeTreeProvider } from './adapters/welcome-tree-provider';
import { MemlogInspectorPanel } from './adapters/memlog-inspector-panel';
import { RubricValidatorPanel } from './adapters/rubric-validator-panel';
import { TeaDashboardPanel } from './adapters/tea-dashboard-panel';
import { BMADDashboardPanel } from './adapters/webview-dashboard-panel';
import { LiveSyncWatcher } from './adapters/live-sync-watcher';
import { ExecutionDispatcher } from './adapters/execution-dispatcher';
import { CommandPaletteManager } from './adapters/command-palette-manager';
import { WorkspaceContextManager } from './adapters/workspace-context-manager';
import {
  BmadAgentTreeNode,
  BmadArtifactTreeNode,
  BmadDetectionResult,
  BmadTreeNode,
  ConfigResolverResult
} from './core/types';

let outputChannel: vscode.OutputChannel | undefined;
let activeConfig: ConfigResolverResult | undefined;
let liveSyncWatcher: LiveSyncWatcher | undefined;
let lifecycleProvider: LifecycleTreeProvider | undefined;
let agentsProvider: AgentsTreeProvider | undefined;
let sprintProvider: SprintTreeProvider | undefined;
let artifactsProvider: ArtifactsTreeProvider | undefined;
let welcomeProvider: WelcomeTreeProvider | undefined;
let statusBarManager: StatusBarManager | undefined;
let executionDispatcher: ExecutionDispatcher | undefined;
let workspaceContextManager: WorkspaceContextManager | undefined;
let activeRootPath: string | undefined;
let activeDetectionResult: BmadDetectionResult = {
  isBmad: false,
  hasManifest: false,
  hasHelpCatalog: false
};

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
  sprintProvider = new SprintTreeProvider();
  artifactsProvider = new ArtifactsTreeProvider();
  welcomeProvider = new WelcomeTreeProvider(context.extensionPath);
  statusBarManager = new StatusBarManager();
  executionDispatcher = new ExecutionDispatcher();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('bmad.views.lifecycle', lifecycleProvider),
    vscode.window.registerTreeDataProvider('bmad.views.agents', agentsProvider),
    vscode.window.registerTreeDataProvider('bmad.views.sprint', sprintProvider),
    vscode.window.registerTreeDataProvider('bmad.views.artifacts', artifactsProvider),
    vscode.window.registerTreeDataProvider('bmad.views.welcome', welcomeProvider),
    statusBarManager
  );

  // 3. Workspace Context Manager & Multi-Root Support (Story 5.1)
  const setupLiveWatcher = (targetRoot: string) => {
    if (liveSyncWatcher) {
      liveSyncWatcher.dispose();
      liveSyncWatcher = undefined;
    }
    const debounceMs = vscode.workspace
      .getConfiguration('bmad')
      .get<number>('refreshDebounceMs', 300);

    liveSyncWatcher = new LiveSyncWatcher({
      workspaceRoot: targetRoot,
      debounceMs,
      onSync: async (changedPaths) => {
        outputChannel?.appendLine(
          `[BMAD LiveSync] Refreshing workspace state (${changedPaths.length} file changes debounced)`
        );
        await loadActiveWorkspace(targetRoot);
      }
    });
    context.subscriptions.push(liveSyncWatcher);
  };

  const loadActiveWorkspace = async (targetRoot: string) => {
    activeRootPath = targetRoot;
    activeDetectionResult = await detectBmadWorkspace(targetRoot);
    await vscode.commands.executeCommand('setContext', 'bmad:hasBmadProject', activeDetectionResult.isBmad);

    if (activeDetectionResult.isBmad) {
      const allProjects = workspaceContextManager?.getDetectedProjects() || [];
      const projectName = allProjects.length > 1 ? path.basename(targetRoot) : undefined;

      outputChannel?.appendLine(
        `[BMAD] Active workspace: ${path.basename(targetRoot)} (v${activeDetectionResult.version ?? 'unknown'})`
      );
      if (activeDetectionResult.modules && activeDetectionResult.modules.length > 0) {
        outputChannel?.appendLine(`[BMAD] Active modules: ${activeDetectionResult.modules.join(', ')}`);
      }

      try {
        activeConfig = await resolveBmadConfig(targetRoot);
        outputChannel?.appendLine(`[BMAD] Output folder: ${activeConfig.paths.outputFolder}`);
        outputChannel?.appendLine(`[BMAD] Planning artifacts: ${activeConfig.paths.planningArtifacts}`);
        outputChannel?.appendLine(`[BMAD] Implementation artifacts: ${activeConfig.paths.implementationArtifacts}`);
        if (activeConfig.diagnostics.length > 0) {
          for (const diag of activeConfig.diagnostics) {
            outputChannel?.appendLine(`[BMAD Warning] ${diag}`);
          }
        }

        await lifecycleProvider?.load(targetRoot, activeConfig.paths);
        await agentsProvider?.load(targetRoot);
        await sprintProvider?.load(targetRoot, activeConfig.paths);
        await artifactsProvider?.load(targetRoot, activeConfig.paths);
        if (lifecycleProvider) {
          statusBarManager?.update(lifecycleProvider.getPhases(), projectName);
        }
        setupLiveWatcher(targetRoot);
        BMADDashboardPanel.currentPanel?.notifyStateUpdated();
      } catch (err: any) {
        outputChannel?.appendLine(`[BMAD Error] Failed to resolve config: ${err?.message || String(err)}`);
      }
    } else {
      outputChannel?.appendLine('[BMAD] No active BMAD installation detected in current workspace.');
      statusBarManager?.hide();
      welcomeProvider?.refresh();
    }
  };

  workspaceContextManager = new WorkspaceContextManager();
  context.subscriptions.push(workspaceContextManager);

  workspaceContextManager.onDidChangeActiveWorkspace(async (newRoot) => {
    outputChannel?.appendLine(`[BMAD] Switching active workspace context to: ${newRoot}`);
    await loadActiveWorkspace(newRoot);
  });

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      outputChannel?.appendLine('[BMAD] Workspace folders changed, refreshing project contexts...');
      await workspaceContextManager!.refresh();
      const active = workspaceContextManager!.getActiveRootPath();
      if (active) {
        await loadActiveWorkspace(active);
      } else {
        await vscode.commands.executeCommand('setContext', 'bmad:hasBmadProject', false);
        statusBarManager?.hide();
        welcomeProvider?.refresh();
      }
    })
  );

  await workspaceContextManager.refresh();
  const initialRoot = workspaceContextManager.getActiveRootPath();
  if (initialRoot) {
    await loadActiveWorkspace(initialRoot);
  } else {
    await vscode.commands.executeCommand('setContext', 'bmad:hasBmadProject', false);
    outputChannel.appendLine('[BMAD] No active BMAD installation detected in current workspace.');
    statusBarManager.hide();
    welcomeProvider?.refresh();
  }

  // 5. Register Commands
  const openFolderCmd = vscode.commands.registerCommand('bmad.openFolder', async (targetPath?: string) => {
    if (typeof targetPath === 'string') {
      const uri = vscode.Uri.file(targetPath);
      await vscode.commands.executeCommand('vscode.openFolder', uri);
      return;
    }
    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select BMAD Project Folder'
    });
    if (uris && uris.length > 0) {
      await vscode.commands.executeCommand('vscode.openFolder', uris[0]);
    }
  });
  context.subscriptions.push(openFolderCmd);

  const switchWorkspaceCmd = vscode.commands.registerCommand('bmad.switchWorkspaceProject', async () => {
    if (workspaceContextManager) {
      await workspaceContextManager.promptSwitchProject();
    }
  });
  context.subscriptions.push(switchWorkspaceCmd);

  const openDashboardCmd = vscode.commands.registerCommand('bmad.openDashboard', async () => {
    if (!activeDetectionResult.isBmad || !activeRootPath) {
      vscode.window.showWarningMessage('No BMAD project detected in current workspace.');
      return;
    }
    await BMADDashboardPanel.render(context.extensionUri, activeRootPath, executionDispatcher);
  });


  const statusCheckCmd = vscode.commands.registerCommand('bmad.statusCheck', async () => {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      const refreshed = await detectBmadWorkspace(folders[0].uri.fsPath);
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
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      const rootPath = folders[0].uri.fsPath;
      const detectionResult = await detectBmadWorkspace(rootPath);
      await vscode.commands.executeCommand('setContext', 'bmad:hasBmadProject', detectionResult.isBmad);
      if (detectionResult.isBmad) {
        activeConfig = await resolveBmadConfig(rootPath);
        await lifecycleProvider?.load(rootPath, activeConfig.paths);
        await agentsProvider?.load(rootPath);
        await sprintProvider?.load(rootPath, activeConfig.paths);
        await artifactsProvider?.load(rootPath, activeConfig.paths);
        if (lifecycleProvider) {
          statusBarManager?.update(lifecycleProvider.getPhases());
        }
        vscode.window.showInformationMessage('BMAD workspace state and manifests refreshed.');
      } else {
        statusBarManager?.hide();
        welcomeProvider?.refresh();
        vscode.window.showWarningMessage('No BMAD installation detected in current workspace.');
      }
    }
  });

  const refreshSprintCmd = vscode.commands.registerCommand('bmad.refreshSprint', async () => {
    if (activeRootPath && activeConfig) {
      await sprintProvider?.load(activeRootPath, activeConfig.paths);
    } else {
      sprintProvider?.refresh();
    }
    vscode.window.showInformationMessage('BMAD Sprint & Stories refreshed.');
  });
  context.subscriptions.push(refreshSprintCmd);

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
    if (activeRootPath && agentsProvider) {
      await agentsProvider.load(activeRootPath);
      outputChannel?.appendLine('[BMAD] Agents tree view refreshed.');
    }
  });

  const refreshLifecycleCmd = vscode.commands.registerCommand('bmad.refreshLifecycle', async () => {
    if (activeRootPath && activeConfig && lifecycleProvider) {
      await lifecycleProvider.load(activeRootPath, activeConfig.paths);
      const allProjects = workspaceContextManager?.getDetectedProjects() || [];
      const projectName = allProjects.length > 1 ? path.basename(activeRootPath) : undefined;
      statusBarManager?.update(lifecycleProvider.getPhases(), projectName);
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
    if (activeRootPath && artifactsProvider) {
      await artifactsProvider.load(activeRootPath, activeConfig?.paths);
      outputChannel?.appendLine('[BMAD] Artifacts explorer refreshed.');
    }
  });

  const inspectMemlogCmd = vscode.commands.registerCommand(
    'bmad.inspectMemlog',
    async (targetPath?: string) => {
      if (!activeRootPath) {
        vscode.window.showWarningMessage('No workspace open to locate memory logs.');
        return;
      }

      let memlogPath = targetPath;
      if (!memlogPath) {
        const foundFiles = await findMemlogFiles(activeRootPath);
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
            label: `$(history) ${path.relative(activeRootPath!, fp)}`,
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

      if (!targetPath && activeRootPath) {
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

  const openTeaDashboardCmd = vscode.commands.registerCommand(
    'bmad.openTeaDashboard',
    async () => {
      if (!activeRootPath) {
        vscode.window.showWarningMessage('No workspace open to inspect TEA quality & traceability.');
        return;
      }
      await TeaDashboardPanel.createOrShow(context.extensionUri, activeRootPath, executionDispatcher);
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
    openTeaDashboardCmd,
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

