import * as vscode from 'vscode';
import { BmadAgentNode, BmadAgentTeam, BmadLifecyclePhase, BmadSkillNode } from '../core/types';

export interface SkillQuickPickItem extends vscode.QuickPickItem {
  skill?: BmadSkillNode;
}

export interface AgentQuickPickItem extends vscode.QuickPickItem {
  agent?: BmadAgentNode;
}

/**
 * Builds and presents interactive QuickPick palettes for skills, agents, and BMAD workflows.
 */
export class CommandPaletteManager {
  /**
   * Constructs categorized QuickPick items from parsed lifecycle phases.
   */
  public static buildSkillQuickPickItems(phases: BmadLifecyclePhase[]): SkillQuickPickItem[] {
    const items: SkillQuickPickItem[] = [];

    for (const phase of phases) {
      if (phase.skills.length === 0) {
        continue;
      }

      // Add phase section separator
      items.push({
        label: phase.label,
        kind: vscode.QuickPickItemKind.Separator
      });

      for (const skill of phase.skills) {
        const menuPrefix = skill.menuCode ? `[${skill.menuCode}] ` : '';
        const requiredTag = skill.required ? ' • [REQUIRED GATE]' : '';
        const statusIcon =
          skill.status === 'completed'
            ? '$(pass) '
            : skill.status === 'in-progress'
            ? '$(sync~spin) '
            : '';

        let detail = skill.description || '';
        if (skill.outputs) {
          detail = `Outputs: ${skill.outputs} • ${detail}`;
        }

        items.push({
          label: `${statusIcon}${menuPrefix}${skill.displayName}`,
          description: `${skill.module}${requiredTag}`,
          detail,
          skill
        });
      }
    }

    return items;
  }

  /**
   * Prompts user to select a skill from a fuzzy-searchable QuickPick palette.
   */
  public static async promptSkillSelection(
    phases: BmadLifecyclePhase[]
  ): Promise<BmadSkillNode | undefined> {
    const items = CommandPaletteManager.buildSkillQuickPickItems(phases);

    if (items.length === 0) {
      vscode.window.showInformationMessage('No BMAD skills found in current workspace.');
      return undefined;
    }

    const selected = await vscode.window.showQuickPick(items, {
      title: 'BMAD Method — Run Skill',
      placeHolder: 'Search skills by name, menu code (e.g. PRD, BD, CA), module, or phase...',
      matchOnDescription: true,
      matchOnDetail: true
    });

    return selected?.skill;
  }

  /**
   * Constructs categorized QuickPick items from parsed agent teams.
   */
  public static buildAgentQuickPickItems(teams: BmadAgentTeam[]): AgentQuickPickItem[] {
    const items: AgentQuickPickItem[] = [];

    for (const team of teams) {
      if (team.agents.length === 0) {
        continue;
      }

      items.push({
        label: team.name,
        kind: vscode.QuickPickItemKind.Separator
      });

      for (const agent of team.agents) {
        items.push({
          label: `${agent.icon} ${agent.name} — ${agent.title}`,
          description: agent.module.toUpperCase(),
          detail: agent.description,
          agent
        });
      }
    }

    return items;
  }

  /**
   * Prompts user to select an agent persona from a fuzzy-searchable QuickPick palette.
   */
  public static async promptAgentSelection(
    teams: BmadAgentTeam[]
  ): Promise<BmadAgentNode | undefined> {
    const items = CommandPaletteManager.buildAgentQuickPickItems(teams);

    if (items.length === 0) {
      vscode.window.showInformationMessage('No BMAD personas found in current workspace.');
      return undefined;
    }

    const selected = await vscode.window.showQuickPick(items, {
      title: 'BMAD Personas Hub — Select Active Agent',
      placeHolder: 'Choose an agent persona to converse or consult with...',
      matchOnDescription: true,
      matchOnDetail: true
    });

    return selected?.agent;
  }
}
