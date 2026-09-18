import * as vscode from 'vscode';
import {
  BmadArtifactCategory,
  BmadArtifactItem,
  BmadArtifactTreeNode,
  BmadResolvedPaths
} from '../core/types';
import { scanWorkspaceArtifacts } from '../core/artifact-scanner';

/**
 * TreeDataProvider for the BMAD Artifacts Explorer sidebar view.
 */
export class ArtifactsTreeProvider implements vscode.TreeDataProvider<BmadArtifactTreeNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<BmadArtifactTreeNode | undefined | void> =
    new vscode.EventEmitter<BmadArtifactTreeNode | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<BmadArtifactTreeNode | undefined | void> =
    this._onDidChangeTreeData.event;

  private categories: BmadArtifactCategory[] = [];
  private workspaceRoot?: string;
  private resolvedPaths?: BmadResolvedPaths;

  constructor() {}

  /**
   * Scans and loads deliverables from the workspace.
   */
  public async load(workspaceRoot: string, resolvedPaths?: BmadResolvedPaths): Promise<void> {
    this.workspaceRoot = workspaceRoot;
    this.resolvedPaths = resolvedPaths;
    try {
      this.categories = await scanWorkspaceArtifacts(workspaceRoot, resolvedPaths);
    } catch {
      this.categories = [];
    }
    this._onDidChangeTreeData.fire();
  }

  /**
   * Refresh artifacts tree data.
   */
  public refresh(): void {
    if (this.workspaceRoot) {
      this.load(this.workspaceRoot, this.resolvedPaths);
    } else {
      this._onDidChangeTreeData.fire();
    }
  }

  /**
   * Returns currently loaded artifact categories.
   */
  public getCategories(): BmadArtifactCategory[] {
    return this.categories;
  }

  getTreeItem(element: BmadArtifactTreeNode): vscode.TreeItem {
    if (element.type === 'category' && element.category) {
      const category = element.category;
      const count = category.artifacts.length;
      const treeItem = new vscode.TreeItem(
        category.label,
        vscode.TreeItemCollapsibleState.Expanded
      );
      treeItem.contextValue = 'bmadArtifactCategory';
      treeItem.description = `(${count})`;
      treeItem.tooltip = `${category.label} (${count} artifact${count === 1 ? '' : 's'})`;

      switch (category.id) {
        case 'planning':
          treeItem.iconPath = new vscode.ThemeIcon('book');
          break;
        case 'architecture':
          treeItem.iconPath = new vscode.ThemeIcon('circuit-board');
          break;
        case 'implementation':
          treeItem.iconPath = new vscode.ThemeIcon('repo');
          break;
        case 'test':
          treeItem.iconPath = new vscode.ThemeIcon('beaker');
          break;
        default:
          treeItem.iconPath = new vscode.ThemeIcon('folder');
          break;
      }

      return treeItem;
    }

    if (element.type === 'artifact' && element.artifact) {
      const artifact = element.artifact;
      const treeItem = new vscode.TreeItem(artifact.fileName, vscode.TreeItemCollapsibleState.None);
      treeItem.contextValue = 'bmadArtifactItem';
      treeItem.description = artifact.sizeFormatted;

      // Select icon based on file extension
      switch (artifact.extension) {
        case '.md':
          treeItem.iconPath = new vscode.ThemeIcon('markdown');
          break;
        case '.yaml':
        case '.yml':
          treeItem.iconPath = new vscode.ThemeIcon('symbol-structure');
          break;
        case '.json':
          treeItem.iconPath = new vscode.ThemeIcon('json');
          break;
        case '.csv':
          treeItem.iconPath = new vscode.ThemeIcon('table');
          break;
        case '.ts':
        case '.js':
          treeItem.iconPath = new vscode.ThemeIcon('file-code');
          break;
        default:
          treeItem.iconPath = new vscode.ThemeIcon('file-text');
          break;
      }

      // Rich Markdown Tooltip
      const md = new vscode.MarkdownString();
      md.appendMarkdown(`### 📄 ${artifact.fileName}\n\n`);
      md.appendMarkdown(`**Relative Path:** \`${artifact.relativePath}\`\n\n`);
      md.appendMarkdown(`**Category:** \`${artifact.category}\`\n\n`);
      md.appendMarkdown(`**Size:** ${artifact.sizeFormatted} (${artifact.sizeBytes.toLocaleString()} bytes)\n\n`);
      if (artifact.modifiedAt) {
        md.appendMarkdown(`**Modified:** ${new Date(artifact.modifiedAt).toLocaleString()}\n`);
      }
      treeItem.tooltip = md;

      // Single-click opens file in editor
      treeItem.command = {
        command: 'bmad.openArtifact',
        title: 'Open Artifact',
        arguments: [artifact.absolutePath]
      };

      return treeItem;
    }

    return new vscode.TreeItem('Unknown Artifact');
  }

  getChildren(element?: BmadArtifactTreeNode): vscode.ProviderResult<BmadArtifactTreeNode[]> {
    if (!element) {
      return this.categories.map((category) => ({
        type: 'category',
        category
      }));
    }

    if (element.type === 'category' && element.category) {
      return element.category.artifacts.map((artifact) => ({
        type: 'artifact',
        artifact
      }));
    }

    return [];
  }
}
