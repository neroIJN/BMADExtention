import * as vscode from 'vscode';
import {
  createAgentExecutionPayload,
  createSkillExecutionPayload,
  ExecutionPayload
} from '../core/command-formatter';
import { BmadAgentNode, BmadSkillNode } from '../core/types';

/**
 * Dispatches skill and persona executions to a dedicated named VS Code Terminal
 * ("BMAD Agent") or copies the command to the clipboard based on user configuration.
 */
export class ExecutionDispatcher {
  private static readonly TERMINAL_NAME = 'BMAD Agent';

  /**
   * Dispatches execution of a BMAD skill.
   */
  public async dispatchSkill(skill: BmadSkillNode | string, args?: string): Promise<void> {
    const payload = createSkillExecutionPayload(skill, args);
    await this.dispatchPayload(payload);
  }

  /**
   * Dispatches consultation or activation of an agent persona.
   */
  public async dispatchAgent(agent: BmadAgentNode, userIntent?: string): Promise<void> {
    const payload = createAgentExecutionPayload(agent, userIntent);
    await this.dispatchPayload(payload);
  }

  /**
   * Core dispatcher handling terminal execution with fallback to clipboard.
   */
  public async dispatchPayload(payload: ExecutionPayload): Promise<void> {
    const config = vscode.workspace.getConfiguration('bmad');
    const runner = config.get<string>('cliRunner', 'terminal');

    if (runner === 'terminal') {
      try {
        const terminal = this.getOrCreateTerminal();
        terminal.show(false);
        terminal.sendText(payload.cliCommand);
        vscode.window.showInformationMessage(
          `Dispatched ${payload.targetName} to "${ExecutionDispatcher.TERMINAL_NAME}" terminal.`
        );
        return;
      } catch (err) {
        // Fallback to clipboard if terminal operations fail
        vscode.window.showWarningMessage(
          `Could not access terminal. Falling back to clipboard for ${payload.targetName}.`
        );
      }
    }

    // Clipboard Runner Mode
    await vscode.env.clipboard.writeText(payload.clipboardPrompt);
    vscode.window.showInformationMessage(
      `Copied invocation for ${payload.targetName} to clipboard: "${payload.clipboardPrompt}"`
    );
  }

  /**
   * Reuses an existing named terminal or creates a new one.
   */
  private getOrCreateTerminal(): vscode.Terminal {
    const existing = vscode.window.terminals.find(
      (t) => t.name === ExecutionDispatcher.TERMINAL_NAME
    );
    if (existing) {
      return existing;
    }
    return vscode.window.createTerminal(ExecutionDispatcher.TERMINAL_NAME);
  }
}
