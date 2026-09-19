import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiveSyncCoordinator } from '../src/core/live-syncer';

describe('LiveSyncCoordinator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should correctly identify BMAD-relevant paths and filter out noise', () => {
    expect(LiveSyncCoordinator.isRelevantPath('/workspace/_bmad/config.toml')).toBe(true);
    expect(LiveSyncCoordinator.isRelevantPath('/workspace/_bmad-output/implementation-artifacts/sprint-status.yaml')).toBe(true);
    expect(LiveSyncCoordinator.isRelevantPath('/workspace/_bmad-output/planning-artifacts/prd.md')).toBe(true);
    expect(LiveSyncCoordinator.isRelevantPath('/workspace/docs/.memlog.md')).toBe(true);
    expect(LiveSyncCoordinator.isRelevantPath('/workspace/features.memlog.md')).toBe(true);

    // Filtered out noise
    expect(LiveSyncCoordinator.isRelevantPath('/workspace/node_modules/foo/index.js')).toBe(false);
    expect(LiveSyncCoordinator.isRelevantPath('/workspace/.git/HEAD')).toBe(false);
    expect(LiveSyncCoordinator.isRelevantPath('/workspace/dist/extension.js')).toBe(false);
    expect(LiveSyncCoordinator.isRelevantPath('/workspace/test.tmp')).toBe(false);
    expect(LiveSyncCoordinator.isRelevantPath('')).toBe(false);
  });

  it('should collapse rapid bursts of file changes into a single debounced sync after 300ms', async () => {
    const onSync = vi.fn();
    const coordinator = new LiveSyncCoordinator({ debounceMs: 300, onSync });

    coordinator.recordChange('/workspace/_bmad-output/implementation-artifacts/sprint-status.yaml');
    coordinator.recordChange('/workspace/_bmad-output/implementation-artifacts/spec-4-1.md');
    coordinator.recordChange('/workspace/_bmad-output/implementation-artifacts/spec-4-2.md');

    expect(coordinator.pendingCount).toBe(3);
    expect(coordinator.isPending).toBe(true);
    expect(onSync).not.toHaveBeenCalled();

    // Advance 250ms - should not have fired yet
    vi.advanceTimersByTime(250);
    expect(onSync).not.toHaveBeenCalled();

    // Add another change resetting trailing timer
    coordinator.recordChange('/workspace/_bmad-output/implementation-artifacts/spec-4-3.md');
    expect(coordinator.pendingCount).toBe(4);

    // Advance 250ms from last change - still not fired
    vi.advanceTimersByTime(250);
    expect(onSync).not.toHaveBeenCalled();

    // Advance remaining 50ms (total 300ms from last change)
    vi.advanceTimersByTime(50);

    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith([
      '/workspace/_bmad-output/implementation-artifacts/sprint-status.yaml',
      '/workspace/_bmad-output/implementation-artifacts/spec-4-1.md',
      '/workspace/_bmad-output/implementation-artifacts/spec-4-2.md',
      '/workspace/_bmad-output/implementation-artifacts/spec-4-3.md'
    ]);
    expect(coordinator.pendingCount).toBe(0);
    expect(coordinator.isPending).toBe(false);
  });

  it('should immediately flush pending changes on demand', async () => {
    const onSync = vi.fn();
    const coordinator = new LiveSyncCoordinator({ debounceMs: 300, onSync });

    coordinator.recordChange('/workspace/_bmad-output/implementation-artifacts/sprint-status.yaml');
    expect(onSync).not.toHaveBeenCalled();

    await coordinator.flush();

    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith([
      '/workspace/_bmad-output/implementation-artifacts/sprint-status.yaml'
    ]);
    expect(coordinator.pendingCount).toBe(0);
  });

  it('should cancel pending timers and clear queue on disposal', () => {
    const onSync = vi.fn();
    const coordinator = new LiveSyncCoordinator({ debounceMs: 300, onSync });

    coordinator.recordChange('/workspace/_bmad-output/implementation-artifacts/sprint-status.yaml');
    coordinator.dispose();

    vi.advanceTimersByTime(500);

    expect(onSync).not.toHaveBeenCalled();
    expect(coordinator.pendingCount).toBe(0);
  });
});
