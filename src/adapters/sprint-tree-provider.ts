import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  BmadKanbanBoard,
  BmadKanbanCard,
  BmadKanbanColumn,
  BmadResolvedPaths,
  BmadSprintActionItem
} from '../core/types';
import { parseKanbanBoard } from '../core/kanban-parser';

export type SprintTreeNodeType = 'column' | 'story' | 'action-root' | 'action-item' | 'info';

export interface SprintTreeNode {
  type: SprintTreeNodeType;
  column?: BmadKanbanColumn;
  card?: BmadKanbanCard;
  actionItem?: BmadSprintActionItem;
  label: string;
  description?: string;
  tooltip?: string;
  icon?: string;
  filePath?: string;
}

/**
 * TreeDataProvider for the BMAD Sprint & Stories sidebar view.
 */
export class SprintTreeProvider implements vscode.TreeDataProvider<SprintTreeNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<SprintTreeNode | undefined | void> =
    new vscode.EventEmitter<SprintTreeNode | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<SprintTreeNode | undefined | void> =
    this._onDidChangeTreeData.event;

  private kanbanBoard?: BmadKanbanBoard;
  private workspaceRoot?: string;
  private resolvedPaths?: BmadResolvedPaths;

  constructor() {}

  public async load(workspaceRoot: string, resolvedPaths?: BmadResolvedPaths): Promise<void> {
    this.workspaceRoot = workspaceRoot;
    this.resolvedPaths = resolvedPaths;

    const implDir =
      resolvedPaths?.implementationArtifacts ||
      path.join(workspaceRoot, '_bmad-output', 'implementation-artifacts');
    const sprintFile = path.join(implDir, 'sprint-status.yaml');

    if (fs.existsSync(sprintFile)) {
      try {
        const content = await fs.promises.readFile(sprintFile, 'utf8');
        this.kanbanBoard = parseKanbanBoard(content, implDir);
      } catch (err) {
        console.warn('[SprintTreeProvider] Failed to parse sprint-status.yaml:', err);
        this.kanbanBoard = undefined;
      }
    } else {
      this.kanbanBoard = undefined;
    }
    this._onDidChangeTreeData.fire();
  }

  public refresh(): void {
    if (this.workspaceRoot) {
      this.load(this.workspaceRoot, this.resolvedPaths);
    } else {
      this._onDidChangeTreeData.fire();
    }
  }

  public getBoard(): BmadKanbanBoard | undefined {
    return this.kanbanBoard;
  }

  getTreeItem(element: SprintTreeNode): vscode.TreeItem {
    if (element.type === 'column' && element.column) {
      const col = element.column;
      const count = col.cards.length;
      const item = new vscode.TreeItem(
        col.label,
        count > 0
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed
      );
      item.description = `${count} ${count === 1 ? 'story' : 'stories'}`;
      item.tooltip = `${col.label}: ${count} stories`;
      item.contextValue = 'bmadSprintColumn';

      switch (col.id) {
        case 'done':
          item.iconPath = new vscode.ThemeIcon('check-all');
          break;
        case 'review':
          item.iconPath = new vscode.ThemeIcon('eye');
          break;
        case 'in-progress':
          item.iconPath = new vscode.ThemeIcon('play-circle');
          break;
        case 'ready-for-dev':
          item.iconPath = new vscode.ThemeIcon('circle-outline');
          break;
        case 'backlog':
        default:
          item.iconPath = new vscode.ThemeIcon('inbox');
          break;
      }
      return item;
    }

    if (element.type === 'story' && element.card) {
      const card = element.card;
      const item = new vscode.TreeItem(
        `[${card.key}] ${card.title}`,
        vscode.TreeItemCollapsibleState.None
      );
      item.contextValue = 'bmadSprintStory';
      item.description = card.epicNum ? `Epic ${card.epicNum}` : undefined;
      item.tooltip = `${card.title} (${card.key}) - Status: ${card.status}`;

      switch (card.status) {
        case 'done':
          item.iconPath = new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('testing.iconPassed'));
          break;
        case 'review':
          item.iconPath = new vscode.ThemeIcon('eye', new vscode.ThemeColor('charts.purple'));
          break;
        case 'in-progress':
          item.iconPath = new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('charts.blue'));
          break;
        case 'ready-for-dev':
          item.iconPath = new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('charts.yellow'));
          break;
        case 'backlog':
        default:
          item.iconPath = new vscode.ThemeIcon('circle-slash');
          break;
      }

      if (element.filePath && fs.existsSync(element.filePath)) {
        item.command = {
          command: 'bmad.openArtifact',
          title: 'Open Story Artifact',
          arguments: [element.filePath]
        };
      }
      return item;
    }

    if (element.type === 'action-root') {
      const count = this.kanbanBoard?.actionItems.length || 0;
      const item = new vscode.TreeItem('Retrospective Action Items', vscode.TreeItemCollapsibleState.Collapsed);
      item.description = `${count} items`;
      item.iconPath = new vscode.ThemeIcon('tasklist');
      item.contextValue = 'bmadActionRoot';
      return item;
    }

    if (element.type === 'action-item' && element.actionItem) {
      const action = element.actionItem;
      const item = new vscode.TreeItem(action.title, vscode.TreeItemCollapsibleState.None);
      item.description = action.status;
      item.tooltip = `${action.title} [${action.id}] - ${action.status}`;
      item.iconPath =
        action.status === 'done'
          ? new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
          : new vscode.ThemeIcon('circle-outline');
      return item;
    }

    const infoItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    infoItem.description = element.description;
    infoItem.tooltip = element.tooltip;
    if (element.icon) {
      infoItem.iconPath = new vscode.ThemeIcon(element.icon);
    }
    return infoItem;
  }

  getChildren(element?: SprintTreeNode): vscode.ProviderResult<SprintTreeNode[]> {
    if (!element) {
      if (!this.kanbanBoard || this.kanbanBoard.totalStories === 0) {
        return [
          {
            type: 'info',
            label: 'No active sprint stories found',
            description: 'Run bmad-sprint-planning',
            icon: 'info',
            tooltip: 'Run sprint planning or bmad-build to generate stories in sprint-status.yaml'
          }
        ];
      }

      const rootNodes: SprintTreeNode[] = this.kanbanBoard.columns.map((col) => ({
        type: 'column',
        column: col,
        label: col.label
      }));

      if (this.kanbanBoard.actionItems && this.kanbanBoard.actionItems.length > 0) {
        rootNodes.push({
          type: 'action-root',
          label: 'Retrospective Action Items'
        });
      }

      return rootNodes;
    }

    if (element.type === 'column' && element.column) {
      const col = element.column;
      if (col.cards.length === 0) {
        return [
          {
            type: 'info',
            label: `No stories in ${col.label.toLowerCase()}`,
            icon: 'dash'
          }
        ];
      }

      const implDir =
        this.resolvedPaths?.implementationArtifacts ||
        (this.workspaceRoot
          ? path.join(this.workspaceRoot, '_bmad-output', 'implementation-artifacts')
          : '');

      return col.cards.map((card) => {
        const filePath = card.specFileName && implDir ? path.join(implDir, card.specFileName) : undefined;
        return {
          type: 'story',
          card,
          label: card.title,
          filePath
        };
      });
    }

    if (element.type === 'action-root' && this.kanbanBoard?.actionItems) {
      return this.kanbanBoard.actionItems.map((actionItem) => ({
        type: 'action-item',
        actionItem,
        label: actionItem.title
      }));
    }

    return [];
  }
}
