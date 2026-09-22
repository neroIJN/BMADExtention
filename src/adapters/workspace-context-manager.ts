import * as vscode from 'vscode';
import * as path from 'path';
import { BmadDetectionResult } from '../core/types';
import { detectAllBmadWorkspaces, detectBmadWorkspace } from '../core/workspace-detector';

/**
 * Manages multi-root BMAD project contexts, allowing developers to switch
 * between multiple BMAD projects in a single multi-root workspace window.
 */
export class WorkspaceContextManager implements vscode.Disposable {
  private activeRootPath: string | undefined;
  private detectedProjects: BmadDetectionResult[] = [];
  private onDidChangeActiveWorkspaceEmitter = new vscode.EventEmitter<string>();
  public readonly onDidChangeActiveWorkspace = this.onDidChangeActiveWorkspaceEmitter.event;

  constructor() {}

  /**
   * Rescans all workspace folders, updates detected BMAD projects list,
   * and sets or preserves the active BMAD root path.
   */
  public async refresh(): Promise<BmadDetectionResult[]> {
    const folders = vscode.workspace.workspaceFolders || [];
    const rootPaths = folders.map((f) => f.uri.fsPath);

    this.detectedProjects = await detectAllBmadWorkspaces(rootPaths);

    if (this.detectedProjects.length === 0) {
      this.activeRootPath = undefined;
    } else {
      // If current activeRootPath is not in detected projects, default to first detected project
      const stillActive = this.detectedProjects.some((p) => p.rootPath === this.activeRootPath);
      if (!stillActive) {
        this.activeRootPath = this.detectedProjects[0].rootPath;
      }
    }

    return this.detectedProjects;
  }

  public getActiveRootPath(): string | undefined {
    return this.activeRootPath;
  }

  public getDetectedProjects(): BmadDetectionResult[] {
    return this.detectedProjects;
  }

  public setActiveRootPath(rootPath: string): void {
    if (this.activeRootPath !== rootPath) {
      this.activeRootPath = rootPath;
      this.onDidChangeActiveWorkspaceEmitter.fire(rootPath);
    }
  }

  /**
   * Shows an interactive QuickPick allowing the user to select the active BMAD project
   * when working in a multi-root workspace.
   */
  public async promptSwitchProject(): Promise<string | undefined> {
    await this.refresh();

    if (this.detectedProjects.length === 0) {
      vscode.window.showInformationMessage('No active BMAD projects detected in the current workspace.');
      return undefined;
    }

    if (this.detectedProjects.length === 1) {
      vscode.window.showInformationMessage(
        `Only one BMAD project open: ${path.basename(this.detectedProjects[0].rootPath || '')}`
      );
      return this.detectedProjects[0].rootPath;
    }

    interface ProjectQuickPickItem extends vscode.QuickPickItem {
      rootPath: string;
    }

    const items: ProjectQuickPickItem[] = this.detectedProjects.map((p) => {
      const folderName = path.basename(p.rootPath || '');
      const isActive = p.rootPath === this.activeRootPath;
      return {
        label: `${isActive ? '$(check) ' : ''}${folderName}`,
        description: `v${p.version || 'unknown'} (${(p.modules || []).join(', ')})`,
        detail: p.rootPath,
        rootPath: p.rootPath!
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select active BMAD project root'
    });

    if (selected) {
      this.setActiveRootPath(selected.rootPath);
      vscode.window.showInformationMessage(`Switched active BMAD project to ${path.basename(selected.rootPath)}`);
      return selected.rootPath;
    }

    return undefined;
  }

  public dispose(): void {
    this.onDidChangeActiveWorkspaceEmitter.dispose();
  }
}
