---
title: 'Story 4.4: Debounced Real-Time Live Synchronization'
type: 'feature'
created: '2026-09-19'
status: 'done'
baseline_commit: '5cd4fd6'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/implementation-artifacts/epic-4-context.md'
  - '_bmad-output/implementation-artifacts/spec-4-1-webview-dashboard-infrastructure-json-rpc-bridge.md'
  - '_bmad-output/implementation-artifacts/spec-4-2-interactive-pipeline-dag-visualizer.md'
  - '_bmad-output/implementation-artifacts/spec-4-3-interactive-sprint-kanban-board.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** When background AI agents generate new artifacts, modify `.memlog.md`, or update `sprint-status.yaml`, developers currently have to reload windows or click manual refresh buttons. Rapid bursts of file writes by agents can cause excessive recomputations, flickering UI, or race conditions without a trailing debounced live synchronization engine.

**Approach:** Implement a pure domain trailing debounce engine (`src/core/live-syncer.ts`) with configurable 300ms debounce interval and path relevance filtering. Create a VS Code file system watcher adapter (`src/adapters/live-sync-watcher.ts`) monitoring `_bmad/`, `_bmad-output/`, and `.memlog.md` files that recomputes workspace state on file writes and broadcasts `stateUpdated` JSON-RPC events to the Webview dashboard and refreshes all tree views seamlessly.

## Boundaries & Constraints

**Always:**
- Keep pure debounce timing and path relevance filtering strictly in `src/core/live-syncer.ts` with zero VS Code API imports (Hexagonal Architecture / AR-2).
- Use trailing debounce defaulting to 300ms (`bmad.refreshDebounceMs`), collapsing rapid agent write bursts into a single unified update.
- Filter out non-relevant file modifications (`node_modules`, `.git`, `dist`, temp files).
- Broadcast state update events via `BMADDashboardPanel.currentPanel.notifyStateUpdated()` without causing full Webview page reloads or loss of scroll position.
- Refresh all active explorer tree views (`LifecycleTreeProvider`, `AgentsTreeProvider`, `ArtifactsTreeProvider`, `StatusBarManager`).
- Cleanly dispose all file system watchers and timer handles on extension deactivation.

**Never:**
- Never trigger immediate recomputation on every individual write during burst I/O.
- Never crash if watched directories are temporarily locked or deleted.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Agent Modifies sprint-status.yaml** | File write to `_bmad-output/implementation-artifacts/sprint-status.yaml` | Trailing 300ms timer fires; pushes `stateUpdated` event; Kanban board updates | Seamless refresh without reload |
| **Rapid Burst of 10 Artifact Writes** | Agent generates 10 files in 100ms | All 10 events collapse into 1 sync dispatch after 300ms trailing pause | Prevents UI thrashing |
| **Irrelevant File Modification** | File write in `dist/`, `.git/`, or `node_modules/` | Ignored by relevance filter; no sync triggered | Zero CPU waste |
| **Dashboard Webview Closed** | File changes occur when dashboard is closed | Tree views and status bar refresh; no RPC error logged | Safe execution |
| **Extension Deactivation** | User closes VS Code workspace | Disposables disposed, debounce timers cancelled cleanly | No memory leaks |

</frozen-after-approval>

## Code Map

- `src/core/live-syncer.ts` -- Pure domain debounce engine and path relevance evaluator.
- `src/adapters/live-sync-watcher.ts` -- VS Code FileSystemWatcher adapter bridging file events to `LiveSyncCoordinator` and dispatching view refreshes.
- `src/extension.ts` -- Initialize `LiveSyncWatcher` on activation and register in subscriptions.
- `test/live-syncer.test.ts` -- Comprehensive unit test suite for trailing debounce, path filtering, and disposal.

## Tasks & Acceptance

**Execution:**
- [x] `src/core/live-syncer.ts` -- Implement `LiveSyncCoordinator` with trailing debounce and path relevance filtering.
- [x] `src/adapters/live-sync-watcher.ts` -- Implement `LiveSyncWatcher` with `createFileSystemWatcher` and multi-view refresh dispatch.
- [x] `src/extension.ts` -- Wire `LiveSyncWatcher` into activation lifecycle with `bmad.refreshDebounceMs` setting.
- [x] `test/live-syncer.test.ts` -- Write unit tests for trailing debounce, path filtering, and cancellation.

**Acceptance Criteria:**
- Given an agent modifies `sprint-status.yaml`, `.memlog.md`, or creates a new artifact, when the file write finishes, then the trailing 300ms debounced file watcher triggers a state recomputation and pushes update events to all active views.
- The Kanban board and tree views update seamlessly in < 300ms without flickering, page reloads, or losing scroll position.

## Implementation Notes

- Implemented `LiveSyncCoordinator` in `src/core/live-syncer.ts` managing 300ms trailing edge debounce timers and filtering out node_modules, .git, and transient temp files.
- Built `LiveSyncWatcher` adapter in `src/adapters/live-sync-watcher.ts` with `vscode.workspace.createFileSystemWatcher`.
- Wired live sync into extension activation, reloading configuration, tree views, status bar, and triggering `notifyStateUpdated()` to push `stateUpdated` JSON-RPC envelopes to active Webview panels.
- Verified with 4 unit tests in `test/live-syncer.test.ts`.

## Spec Change Log

## Review Triage Log
