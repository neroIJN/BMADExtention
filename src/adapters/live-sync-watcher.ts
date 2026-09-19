import * as vscode from 'vscode';
import { LiveSyncCoordinator } from '../core/live-syncer';

export interface LiveSyncWatcherOptions {
  workspaceRoot: string;
  debounceMs?: number;
  onSync: (changedPaths: string[]) => Promise<void> | void;
}

/**
 * Adapter bridging VS Code file system change events to the debounced LiveSyncCoordinator.
 * Triggers recomputations across tree views, status bar, and Webview dashboard (AD-1, AD-6).
 */
export class LiveSyncWatcher implements vscode.Disposable {
  private readonly _watcher: vscode.FileSystemWatcher;
  private readonly _coordinator: LiveSyncCoordinator;
  private readonly _disposables: vscode.Disposable[] = [];

  constructor(options: LiveSyncWatcherOptions) {
    this._coordinator = new LiveSyncCoordinator({
      debounceMs: options.debounceMs ?? 300,
      onSync: options.onSync
    });

    // Watch files across workspace
    this._watcher = vscode.workspace.createFileSystemWatcher('**/*');
    this._disposables.push(this._watcher);

    this._disposables.push(
      this._watcher.onDidChange((uri) => {
        this._coordinator.recordChange(uri.fsPath);
      }),
      this._watcher.onDidCreate((uri) => {
        this._coordinator.recordChange(uri.fsPath);
      }),
      this._watcher.onDidDelete((uri) => {
        this._coordinator.recordChange(uri.fsPath);
      })
    );
  }

  public get coordinator(): LiveSyncCoordinator {
    return this._coordinator;
  }

  public dispose(): void {
    this._coordinator.dispose();
    while (this._disposables.length) {
      const item = this._disposables.pop();
      if (item) {
        item.dispose();
      }
    }
  }
}
