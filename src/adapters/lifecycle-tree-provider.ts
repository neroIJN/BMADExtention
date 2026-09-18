import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  BmadLifecyclePhase,
  BmadResolvedPaths,
  BmadSkillNode,
  BmadTreeNode
} from '../core/types';
import { parseLifecycleHelp } from '../core/lifecycle-parser';

/**
 * TreeDataProvider for the BMAD Lifecycle & Workflows sidebar view.
 */
export class LifecycleTreeProvider implements vscode.TreeDataProvider<BmadTreeNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<BmadTreeNode | undefined | void> =
    new vscode.EventEmitter<BmadTreeNode | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<BmadTreeNode | undefined | void> =
    this._onDidChangeTreeData.event;

  private phases: BmadLifecyclePhase[] = [];
  private rootPath?: string;
  private paths?: BmadResolvedPaths;

  constructor() {}

  /**
   * Load lifecycle skills and artifact completion statuses from workspace.
   */
  public async load(rootPath: string, paths: BmadResolvedPaths): Promise<void> {
    this.rootPath = rootPath;
    this.paths = paths;

    const csvPath = path.join(rootPath, '_bmad', '_config', 'bmad-help.csv');
    if (!fs.existsSync(csvPath)) {
      this.phases = [];
      this._onDidChangeTreeData.fire();
      return;
    }

    try {
      const content = await fs.promises.readFile(csvPath, 'utf8');
      this.phases = parseLifecycleHelp(content, paths, rootPath);
    } catch {
      this.phases = [];
    }

    this._onDidChangeTreeData.fire();
  }

  /**
   * Trigger UI tree refresh.
   */
  public refresh(): void {
    if (this.rootPath && this.paths) {
      this.load(this.rootPath, this.paths);
    } else {
      this._onDidChangeTreeData.fire();
    }
  }

  /**
   * Returns current lifecycle phases.
   */
  public getPhases(): BmadLifecyclePhase[] {
    return this.phases;
  }

  getTreeItem(element: BmadTreeNode): vscode.TreeItem {
    if (element.type === 'phase' && element.phase) {
      const phase = element.phase;
      const completedCount = phase.skills.filter((s) => s.status === 'completed').length;
      const totalCount = phase.skills.length;

      const treeItem = new vscode.TreeItem(
        phase.label,
        vscode.TreeItemCollapsibleState.Expanded
      );
      treeItem.contextValue = 'bmadPhase';
      treeItem.iconPath = new vscode.ThemeIcon('layers');
      treeItem.description = `${completedCount}/${totalCount}`;
      treeItem.tooltip = `${phase.label} (${completedCount} of ${totalCount} completed)`;
      return treeItem;
    }

    if (element.type === 'skill' && element.skill) {
      const skill = element.skill;
      const label = skill.menuCode ? `[${skill.menuCode}] ${skill.displayName}` : skill.displayName;
      const treeItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
      treeItem.contextValue = 'bmadSkill';

      // Status indicator icons
      if (skill.status === 'completed') {
        treeItem.iconPath = new vscode.ThemeIcon(
          'pass',
          new vscode.ThemeColor('testing.iconPassed')
        );
        treeItem.description = skill.required ? 'Required • Done' : 'Done';
      } else if (skill.status === 'in-progress') {
        treeItem.iconPath = new vscode.ThemeIcon(
          'sync~spin',
          new vscode.ThemeColor('charts.orange')
        );
        treeItem.description = skill.required ? '[REQUIRED GATE] In Progress' : 'In Progress';
      } else {
        if (skill.required) {
          treeItem.iconPath = new vscode.ThemeIcon(
            'circle-outline',
            new vscode.ThemeColor('charts.red')
          );
          treeItem.description = '[REQUIRED GATE]';
        } else {
          treeItem.iconPath = new vscode.ThemeIcon('circle-outline');
        }
      }

      // Rich Markdown Tooltip
      const md = new vscode.MarkdownString();
      md.appendMarkdown(`### ${skill.displayName}\n\n`);
      md.appendMarkdown(`- **Skill ID:** \`${skill.id}\`\n`);
      md.appendMarkdown(`- **Module:** ${skill.module}\n`);
      if (skill.menuCode) {
        md.appendMarkdown(`- **Menu Code:** \`${skill.menuCode}\`\n`);
      }
      md.appendMarkdown(`- **Required Gate:** ${skill.required ? '⚠️ **Yes**' : 'No'}\n`);
      md.appendMarkdown(`- **Status:** **${skill.status.toUpperCase()}**\n`);
      if (skill.artifactPath) {
        md.appendMarkdown(`- **Artifact:** \`${skill.artifactPath}\`\n`);
      }
      if (skill.description) {
        md.appendMarkdown(`\n---\n*${skill.description}*\n`);
      }
      treeItem.tooltip = md;

      // Click action: Open artifact if exists
      if (skill.artifactPath) {
        treeItem.command = {
          command: 'vscode.open',
          title: 'Open Artifact',
          arguments: [vscode.Uri.file(skill.artifactPath)]
        };
      }

      return treeItem;
    }

    return new vscode.TreeItem('Unknown');
  }

  getChildren(element?: BmadTreeNode): vscode.ProviderResult<BmadTreeNode[]> {
    if (!element) {
      return this.phases.map((phase) => ({
        type: 'phase',
        phase
      }));
    }

    if (element.type === 'phase' && element.phase) {
      return element.phase.skills.map((skill) => ({
        type: 'skill',
        skill
      }));
    }

    return [];
  }
}
