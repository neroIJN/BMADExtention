import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TreeDataProvider for the BMAD Welcome view shown when no active BMAD project is detected.
 */
export class WelcomeTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> =
    new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private extensionPath?: string;

  constructor(extensionPath?: string) {
    this.extensionPath = extensionPath;
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    if (element) {
      return [];
    }

    const items: vscode.TreeItem[] = [];

    // If extensionPath has a valid BMAD directory, offer direct open options
    if (this.extensionPath) {
      const sampleFixturePath = path.join(this.extensionPath, 'test', 'fixtures', 'sample-bmad-project');
      if (fs.existsSync(sampleFixturePath)) {
        const openSampleItem = new vscode.TreeItem(
          'Open Sample BMAD Project (Recommended)',
          vscode.TreeItemCollapsibleState.None
        );
        openSampleItem.iconPath = new vscode.ThemeIcon('beaker', new vscode.ThemeColor('charts.green'));
        openSampleItem.description = 'Isolated test workspace';
        openSampleItem.tooltip = `Open ${sampleFixturePath} in this window to test all BMAD views without workspace conflicts`;
        openSampleItem.command = {
          command: 'bmad.openFolder',
          title: 'Open Sample BMAD Project',
          arguments: [sampleFixturePath]
        };
        items.push(openSampleItem);
      }

      const manifestPath = path.join(this.extensionPath, '_bmad', '_config', 'manifest.yaml');
      if (fs.existsSync(manifestPath)) {
        const repoName = path.basename(this.extensionPath);
        const openCurrentRepo = new vscode.TreeItem(
          `Open This Project (${repoName})`,
          vscode.TreeItemCollapsibleState.None
        );
        openCurrentRepo.iconPath = new vscode.ThemeIcon('folder-active');
        openCurrentRepo.description = 'May switch to main window';
        openCurrentRepo.tooltip = `Open ${this.extensionPath} in this VS Code window`;
        openCurrentRepo.command = {
          command: 'bmad.openFolder',
          title: 'Open This Project',
          arguments: [this.extensionPath]
        };
        items.push(openCurrentRepo);
      }
    }

    const openFolder = new vscode.TreeItem('Browse & Open BMAD Folder...', vscode.TreeItemCollapsibleState.None);
    openFolder.iconPath = new vscode.ThemeIcon('folder-opened');
    openFolder.description = 'Select directory with _bmad/';
    openFolder.tooltip = 'Open a file picker to select a workspace folder containing a BMAD Method installation (_bmad/)';
    openFolder.command = {
      command: 'bmad.openFolder',
      title: 'Browse & Open BMAD Folder...'
    };
    items.push(openFolder);

    const switchProj = new vscode.TreeItem('Switch Workspace Project...', vscode.TreeItemCollapsibleState.None);
    switchProj.iconPath = new vscode.ThemeIcon('arrow-swap');
    switchProj.description = 'Multi-root workspace';
    switchProj.tooltip = 'Switch to a detected BMAD project folder in a multi-root workspace';
    switchProj.command = {
      command: 'bmad.switchWorkspaceProject',
      title: 'Switch Project'
    };
    items.push(switchProj);

    const statusCheck = new vscode.TreeItem('Check Project Status', vscode.TreeItemCollapsibleState.None);
    statusCheck.iconPath = new vscode.ThemeIcon('sparkle');
    statusCheck.description = 'Verify installation';
    statusCheck.tooltip = 'Check for BMAD installation and show recommendations';
    statusCheck.command = {
      command: 'bmad.statusCheck',
      title: 'Check Status'
    };
    items.push(statusCheck);

    const runSkill = new vscode.TreeItem('Run BMAD Skill...', vscode.TreeItemCollapsibleState.None);
    runSkill.iconPath = new vscode.ThemeIcon('play');
    runSkill.description = 'Launch skill runner';
    runSkill.tooltip = 'Open QuickPick fuzzy search to invoke any BMAD skill';
    runSkill.command = {
      command: 'bmad.runSkill',
      title: 'Run Skill'
    };
    items.push(runSkill);

    return items;
  }
}
