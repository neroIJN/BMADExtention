---
title: 'Story 5.1: Multi-Root Workspace Support & Dynamic Context Resolution'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Currently, the extension assumes a single root workspace (`vscode.workspace.workspaceFolders?.[0]`). In monorepos or multi-folder setups where multiple projects are opened concurrently in VS Code, BMADExtention fails to discover BMAD installations in secondary roots, and cannot switch active project context dynamically.

**Approach:** Extend `WorkspaceDetector` in `src/core/workspace-detector.ts` to scan all workspace folders (`workspaceFolders`), returning all detected BMAD project paths. Introduce a centralized `WorkspaceContextManager` that tracks the currently selected active BMAD project root, provides a project picker in the Status Bar and tree view titles, and notifies listeners on workspace change to trigger live updates across all sidebar trees and Webview panels.

## Boundaries & Constraints

**Always:**
- Keep multi-root detection logic in `src/core/workspace-detector.ts` pure TypeScript without direct `vscode` imports (Hexagonal Architecture / AR-2).
- Support single-folder workspaces seamlessly with zero configuration overhead (backward compatibility).
- In multi-root workspaces, auto-select the first valid BMAD folder if no specific selection has been made, and remember user's project selection per session.
- Emit context change events through `WorkspaceContextManager` so all adapters (`LifecycleTreeProvider`, `AgentsTreeProvider`, `ArtifactsTreeProvider`, `BMADDashboardPanel`) immediately reload state for the newly active root.

**Never:**
- Never crash when a workspace contains folders on different drives or remote filesystems.
- Never re-render views if the selected workspace root has not changed.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Single BMAD Root** | Single open folder with `_bmad/` | Automatically set as active root; normal extension operation | N/A |
| **Multi-Root: Multiple BMAD** | 3 folders open, 2 have `_bmad/` | Detects both; status bar and view title show project picker; defaults to first | Informative switcher QuickPick |
| **Multi-Root: 1 BMAD, 2 Other** | 3 folders open, only 1 has `_bmad/` | Automatically targets the BMAD folder; context key `bmad:hasBmadProject` is true | Non-BMAD folders ignored |
| **Folder Added/Removed** | `onDidChangeWorkspaceFolders` fired | Rescans workspace folders, updates active project list, prompts if active folder removed | Fallback to next available BMAD folder or welcome view |

</frozen-after-approval>

## Code Map

- `src/core/workspace-detector.ts` -- Add `detectAllBmadProjects(rootDirs: string[]): string[]` and multi-root inspection helpers.
- `src/core/types.ts` -- Define `BmadWorkspaceFolder` metadata interfaces and workspace selection events.
- `src/adapters/workspace-context-manager.ts` -- Adapter managing the active workspace root selection, folder change subscriptions, and context switching QuickPick.
- `src/adapters/status-bar-manager.ts` -- Display active project name when multiple BMAD roots are present.
- `src/extension.ts` -- Hook `vscode.workspace.onDidChangeWorkspaceFolders` into `WorkspaceContextManager`.
- `test/workspace-detector.test.ts` -- Unit tests covering multi-folder discovery, filtering, and priority resolution.

## Tasks & Acceptance

**Execution:**
- [ ] `src/core/workspace-detector.ts` -- Implement `detectAllBmadProjects` for array of folders.
- [ ] `src/adapters/workspace-context-manager.ts` -- Implement context manager and project switcher command `bmad.switchWorkspaceProject`.
- [ ] Connect `WorkspaceContextManager` to `LifecycleTreeProvider`, `AgentsTreeProvider`, `ArtifactsTreeProvider`, and `BMADDashboardPanel`.
- [ ] `test/workspace-detector.test.ts` -- Add multi-root unit tests.
