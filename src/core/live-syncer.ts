export interface LiveSyncOptions {
  debounceMs?: number;
  onSync: (changedPaths: string[]) => Promise<void> | void;
}

/**
 * Pure domain trailing debounce coordinator for reactive file system synchronization (AD-1, AD-6).
 * Accumulates file changes and triggers a single consolidated synchronization callback
 * after a trailing quiet period (default 300ms), preventing UI thrashing.
 */
export class LiveSyncCoordinator {
  private readonly _debounceMs: number;
  private readonly _onSync: (changedPaths: string[]) => Promise<void> | void;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private readonly _changedPaths = new Set<string>();
  private _disposed = false;

  constructor(options: LiveSyncOptions) {
    this._debounceMs = options.debounceMs ?? 300;
    this._onSync = options.onSync;
  }

  public get pendingCount(): number {
    return this._changedPaths.size;
  }

  public get isPending(): boolean {
    return this._timer !== null;
  }

  /**
   * Filters file paths so only BMAD-relevant files trigger recomputations.
   */
  public static isRelevantPath(filePath: string): boolean {
    if (!filePath || typeof filePath !== 'string') {
      return false;
    }
    const normalized = filePath.replace(/\\/g, '/');

    // Filter out irrelevant build, VCS, and transient directories
    if (
      normalized.includes('/node_modules/') ||
      normalized.includes('/.git/') ||
      normalized.includes('/dist/') ||
      normalized.includes('/out/') ||
      normalized.endsWith('.tmp') ||
      normalized.endsWith('~')
    ) {
      return false;
    }

    // Must be in _bmad/, _bmad-output/, or be a memlog or sprint tracking file
    return (
      normalized.includes('/_bmad/') ||
      normalized.includes('/_bmad-output/') ||
      normalized.endsWith('.memlog.md') ||
      normalized.endsWith('/sprint-status.yaml') ||
      normalized.endsWith('sprint-status.yaml')
    );
  }

  /**
   * Records a file change event and resets the trailing debounce timer.
   * Returns true if the file was accepted as relevant.
   */
  public recordChange(filePath: string): boolean {
    if (this._disposed) {
      return false;
    }
    if (!LiveSyncCoordinator.isRelevantPath(filePath)) {
      return false;
    }

    this._changedPaths.add(filePath);

    if (this._timer) {
      clearTimeout(this._timer);
    }

    this._timer = setTimeout(() => {
      this._timer = null;
      this.flush();
    }, this._debounceMs);

    return true;
  }

  /**
   * Flushes any pending accumulated changes immediately without waiting for timer.
   */
  public async flush(): Promise<void> {
    if (this._disposed || this._changedPaths.size === 0) {
      return;
    }

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    const paths = Array.from(this._changedPaths);
    this._changedPaths.clear();

    try {
      await this._onSync(paths);
    } catch (err) {
      console.error('[LiveSyncCoordinator] Error in onSync callback:', err);
    }
  }

  /**
   * Cancels any pending timers and cleans up resources.
   */
  public dispose(): void {
    this._disposed = true;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._changedPaths.clear();
  }
}
