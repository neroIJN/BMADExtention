import * as vscode from 'vscode';
import { BmadLifecyclePhase, BmadProjectStatus, BmadSkillNode } from '../core/types';
import { evaluateProjectStatus } from '../core/status-evaluator';

/**
 * Controller for the persistent VS Code Status Bar item and QuickPick recommendations.
 */
export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private currentStatus?: BmadProjectStatus;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = 'bmad.showRecommendations';
  }

  /**
   * Update the status bar item based on parsed lifecycle phases and optional active project name.
   */
  public update(phases: BmadLifecyclePhase[], projectName?: string): void {
    const status = evaluateProjectStatus(phases);
    this.currentStatus = status;

    this.statusBarItem.text = projectName
      ? `${status.statusBarText} (${projectName})`
      : status.statusBarText;
    this.statusBarItem.tooltip = projectName
      ? `${status.statusBarTooltip} (Workspace: ${projectName})`
      : status.statusBarTooltip;
    this.statusBarItem.show();
  }


  /**
   * Hide the status bar item (e.g. when no BMAD project is open).
   */
  public hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Open the QuickPick selector displaying recommended next skills for the active lifecycle state.
   */
  public async showQuickPick(): Promise<void> {
    if (!this.currentStatus) {
      vscode.window.showInformationMessage('No active BMAD project status available.');
      return;
    }

    interface RecommendationQuickPickItem extends vscode.QuickPickItem {
      skill?: BmadSkillNode;
      action?: string;
    }

    const items: RecommendationQuickPickItem[] = [];

    // Header / Section
    items.push({
      label: `Current Phase: ${this.currentStatus.activePhaseLabel} (${this.currentStatus.phaseStatus.toUpperCase()})`,
      kind: vscode.QuickPickItemKind.Separator
    });

    if (this.currentStatus.recommendations.length > 0) {
      for (const rec of this.currentStatus.recommendations) {
        const icon = rec.priority === 'high' ? '$(star-full) ' : '$(play) ';
        const menuTag = rec.skill.menuCode ? `[${rec.skill.menuCode}] ` : '';
        items.push({
          label: `${icon}${menuTag}${rec.skill.displayName}`,
          description: rec.priority === 'high' ? '[HIGH PRIORITY]' : undefined,
          detail: rec.reason,
          skill: rec.skill
        });
      }
    } else {
      items.push({
        label: '$(check) All phase gates complete',
        detail: 'Ready for next steps or epic retrospective.'
      });
    }

    // Utility actions separator
    items.push({
      label: 'Actions',
      kind: vscode.QuickPickItemKind.Separator
    });

    items.push({
      label: '$(graph) Open Visualizer Dashboard',
      action: 'bmad.openDashboard'
    });

    items.push({
      label: '$(refresh) Refresh Lifecycle Status',
      action: 'bmad.refreshLifecycle'
    });

    const selected = await vscode.window.showQuickPick(items, {
      title: 'BMAD Method — Recommended Next Steps',
      placeHolder: 'Select a recommended skill or action to execute...'
    });

    if (selected) {
      if (selected.action) {
        vscode.commands.executeCommand(selected.action);
      } else if (selected.skill) {
        vscode.commands.executeCommand('bmad.runSkill', selected.skill.id);
      }
    }
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
