import * as vscode from 'vscode';
import { BmadAgentNode, BmadAgentTeam, BmadAgentTreeNode } from '../core/types';
import { loadAgentsFromWorkspace } from '../core/agent-parser';

/**
 * TreeDataProvider for the BMAD Agents & Personas sidebar view.
 */
export class AgentsTreeProvider implements vscode.TreeDataProvider<BmadAgentTreeNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<BmadAgentTreeNode | undefined | void> =
    new vscode.EventEmitter<BmadAgentTreeNode | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<BmadAgentTreeNode | undefined | void> =
    this._onDidChangeTreeData.event;

  private teams: BmadAgentTeam[] = [];
  private rootPath?: string;

  constructor() {}

  /**
   * Load agents and personas from the BMAD workspace.
   */
  public async load(rootPath: string): Promise<void> {
    this.rootPath = rootPath;
    try {
      this.teams = await loadAgentsFromWorkspace(rootPath);
    } catch {
      this.teams = [];
    }
    this._onDidChangeTreeData.fire();
  }

  /**
   * Refresh agent tree data.
   */
  public refresh(): void {
    if (this.rootPath) {
      this.load(this.rootPath);
    } else {
      this._onDidChangeTreeData.fire();
    }
  }

  /**
   * Returns currently loaded agent teams.
   */
  public getTeams(): BmadAgentTeam[] {
    return this.teams;
  }

  getTreeItem(element: BmadAgentTreeNode): vscode.TreeItem {
    if (element.type === 'team' && element.team) {
      const team = element.team;
      const treeItem = new vscode.TreeItem(
        team.name,
        vscode.TreeItemCollapsibleState.Expanded
      );
      treeItem.contextValue = 'bmadAgentTeam';
      treeItem.iconPath = new vscode.ThemeIcon('organization');
      treeItem.description = `${team.agents.length} personas`;
      treeItem.tooltip = `${team.name} (${team.agents.length} active personas)`;
      return treeItem;
    }

    if (element.type === 'agent' && element.agent) {
      const agent = element.agent;
      const label = `${agent.icon} ${agent.name} — ${agent.title}`;
      const treeItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
      treeItem.contextValue = 'bmadAgent';
      treeItem.description = agent.module.toUpperCase();

      // Rich Markdown Tooltip
      const md = new vscode.MarkdownString();
      md.appendMarkdown(`### ${agent.icon} ${agent.name}\n\n`);
      md.appendMarkdown(`**Role:** ${agent.title}\n\n`);
      md.appendMarkdown(`**Module:** \`${agent.module}\` | **Team:** \`${agent.team}\`\n\n`);
      if (agent.description) {
        md.appendMarkdown(`---\n\n*${agent.description}*\n`);
      }
      treeItem.tooltip = md;

      // Click action: Inspect agent persona details
      treeItem.command = {
        command: 'bmad.inspectAgent',
        title: 'Inspect Agent Persona',
        arguments: [element]
      };

      return treeItem;
    }

    return new vscode.TreeItem('Unknown Agent');
  }

  getChildren(element?: BmadAgentTreeNode): vscode.ProviderResult<BmadAgentTreeNode[]> {
    if (!element) {
      return this.teams.map((team) => ({
        type: 'team',
        team
      }));
    }

    if (element.type === 'team' && element.team) {
      return element.team.agents.map((agent) => ({
        type: 'agent',
        agent
      }));
    }

    return [];
  }
}
