import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as yaml from 'js-yaml';
import { JsonRpcBridge } from '../core/json-rpc-bridge';
import {
  BmadDashboardState,
  BmadSkillNode,
  BmadAgentNode,
  BmadSprintStatusData
} from '../core/types';
import { detectBmadWorkspace } from '../core/workspace-detector';
import { resolveBmadConfig } from '../core/config-resolver';
import { parseLifecycleHelp } from '../core/lifecycle-parser';
import { loadAgentsFromWorkspace } from '../core/agent-parser';
import { buildPipelineDag } from '../core/dag-builder';
import { ExecutionDispatcher } from './execution-dispatcher';

/**
 * Adapter managing the dedicated Webview Dashboard panel for the BMAD Cockpit.
 * Houses the Vite-bundled Preact application and mediates JSON-RPC messaging
 * with strict CSP isolation and theme synchronization (AD-1, AD-2, AD-6).
 */
export class BMADDashboardPanel {
  public static currentPanel: BMADDashboardPanel | undefined;
  public static readonly viewType = 'bmad.dashboard';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _workspaceRoot: string;
  private readonly _executionDispatcher?: ExecutionDispatcher;
  private readonly _bridge: JsonRpcBridge;
  private _activeTab: 'pipeline' | 'sprint' = 'pipeline';
  private _disposables: vscode.Disposable[] = [];

  public static async render(
    extensionUri: vscode.Uri,
    workspaceRoot: string,
    executionDispatcher?: ExecutionDispatcher
  ): Promise<BMADDashboardPanel> {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (BMADDashboardPanel.currentPanel) {
      BMADDashboardPanel.currentPanel._panel.reveal(column || vscode.ViewColumn.One);
      return BMADDashboardPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      BMADDashboardPanel.viewType,
      'BMAD Visualizer Cockpit',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist', 'webview'),
          vscode.Uri.joinPath(extensionUri, 'media')
        ]
      }
    );

    BMADDashboardPanel.currentPanel = new BMADDashboardPanel(
      panel,
      extensionUri,
      workspaceRoot,
      executionDispatcher
    );

    return BMADDashboardPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    workspaceRoot: string,
    executionDispatcher?: ExecutionDispatcher
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._workspaceRoot = workspaceRoot;
    this._executionDispatcher = executionDispatcher;

    this._bridge = new JsonRpcBridge((envelope) => {
      this._panel.webview.postMessage(envelope);
    });

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message) => {
        this._bridge.handleMessage(message);
      },
      null,
      this._disposables
    );

    this._registerRpcHandlers();
    this._panel.webview.html = this._getWebviewContent(this._panel.webview);
  }

  public get bridge(): JsonRpcBridge {
    return this._bridge;
  }

  private _registerRpcHandlers(): void {
    // Ping handler for connectivity check
    this._bridge.registerHandler('ping', () => {
      return { pong: true, timestamp: Date.now() };
    });

    // Main state getter
    this._bridge.registerHandler('getState', async () => {
      return await this._buildDashboardState();
    });

    // Tab switching
    this._bridge.registerHandler('switchTab', (payload: { tab: 'pipeline' | 'sprint' }) => {
      if (payload && (payload.tab === 'pipeline' || payload.tab === 'sprint')) {
        this._activeTab = payload.tab;
      }
      return { activeTab: this._activeTab };
    });

    // Skill execution
    this._bridge.registerHandler('executeSkill', async (payload: { skillId: string; command?: string }) => {
      if (!this._executionDispatcher) {
        throw new Error('Execution dispatcher not available');
      }
      const target = payload.command || payload.skillId;
      await this._executionDispatcher.dispatch(target);
      return { success: true, target };
    });

    // Open file in editor
    this._bridge.registerHandler('openFile', async (payload: { filePath: string }) => {
      if (!payload?.filePath) {
        throw new Error('filePath is required');
      }
      const targetPath = path.isAbsolute(payload.filePath)
        ? payload.filePath
        : path.join(this._workspaceRoot, payload.filePath);

      if (!fs.existsSync(targetPath)) {
        throw new Error(`File does not exist: ${targetPath}`);
      }

      const doc = await vscode.workspace.openTextDocument(targetPath);
      await vscode.window.showTextDocument(doc, { preview: false });
      return { opened: true, path: targetPath };
    });

    // Open story file matching a story key
    this._bridge.registerHandler('openStory', async (payload: { storyKey: string }) => {
      if (!payload?.storyKey) {
        throw new Error('storyKey is required');
      }

      const artifactsDir = path.join(this._workspaceRoot, '_bmad-output', 'implementation-artifacts');
      if (!fs.existsSync(artifactsDir)) {
        throw new Error('No implementation artifacts directory found');
      }

      const files = fs.readdirSync(artifactsDir);
      const match = files.find(
        (f) => f.toLowerCase().includes(payload.storyKey.toLowerCase()) && f.endsWith('.md')
      );

      if (!match) {
        throw new Error(`Could not find story file for key: ${payload.storyKey}`);
      }

      const targetPath = path.join(artifactsDir, match);
      const doc = await vscode.workspace.openTextDocument(targetPath);
      await vscode.window.showTextDocument(doc, { preview: false });
      return { opened: true, path: targetPath };
    });
  }

  private async _buildDashboardState(): Promise<BmadDashboardState> {
    const detection = await detectBmadWorkspace(this._workspaceRoot);
    let skills: BmadSkillNode[] = [];
    let agents: BmadAgentNode[] = [];
    let sprintStatus: BmadSprintStatusData | undefined;

    if (detection.isBmad) {
      try {
        const configResult = await resolveBmadConfig(this._workspaceRoot);
        const helpCsvPath = path.join(this._workspaceRoot, '_bmad', '_config', 'bmad-help.csv');
        if (fs.existsSync(helpCsvPath)) {
          const content = fs.readFileSync(helpCsvPath, 'utf8');
          const phases = parseLifecycleHelp(content, this._workspaceRoot, configResult.paths);
          skills = phases.flatMap((p) => p.skills);
        }
      } catch (err) {
        console.warn('[BMADDashboardPanel] Failed to load lifecycle skills:', err);
      }

      try {
        agents = await loadAgentsFromWorkspace(this._workspaceRoot);
      } catch (err) {
        console.warn('[BMADDashboardPanel] Failed to load agents:', err);
      }

      try {
        const sprintPath = path.join(
          this._workspaceRoot,
          '_bmad-output',
          'implementation-artifacts',
          'sprint-status.yaml'
        );
        if (fs.existsSync(sprintPath)) {
          const rawYaml = fs.readFileSync(sprintPath, 'utf8');
          const parsed = yaml.load(rawYaml) as any;
          if (parsed && typeof parsed === 'object') {
            sprintStatus = {
              project: parsed.project,
              lastUpdated: parsed.last_updated,
              developmentStatus: parsed.development_status || {},
              actionItems: Array.isArray(parsed.action_items) ? parsed.action_items : []
            };
          }
        }
      } catch (err) {
        console.warn('[BMADDashboardPanel] Failed to load sprint-status.yaml:', err);
      }
    }

    const dag = buildPipelineDag(skills);

    return {
      workspaceRoot: this._workspaceRoot,
      isBmad: detection.isBmad,
      version: detection.version,
      modules: detection.modules,
      activeTab: this._activeTab,
      skills,
      agents,
      sprintStatus,
      dag,
      timestamp: new Date().toISOString()
    };
  }

  public notifyStateUpdated(): void {
    this._buildDashboardState()
      .then((state) => {
        this._bridge.sendEvent('stateUpdated', state);
      })
      .catch((err) => {
        console.warn('[BMADDashboardPanel] Failed to broadcast state update:', err);
      });
  }

  private _getWebviewContent(webview: vscode.Webview): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'bundle.js')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BMAD Visualizer Cockpit</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      height: 100vh;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  public dispose(): void {
    BMADDashboardPanel.currentPanel = undefined;

    this._bridge.dispose();
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
