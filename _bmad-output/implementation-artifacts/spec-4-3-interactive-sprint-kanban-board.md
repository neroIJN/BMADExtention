---
title: 'Story 4.3: Interactive Sprint Kanban Board'
type: 'feature'
created: '2026-09-19'
status: 'done'
baseline_commit: 'd47c1c7'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/implementation-artifacts/epic-4-context.md'
  - '_bmad-output/implementation-artifacts/spec-4-1-webview-dashboard-infrastructure-json-rpc-bridge.md'
  - '_bmad-output/implementation-artifacts/spec-4-2-interactive-pipeline-dag-visualizer.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Tracking user story progress across development phases in BMAD requires inspecting `sprint-status.yaml` by hand. Developers lack an interactive, graphical sprint kanban board inside VS Code to visualize story workflows, inspect retrospective action items, and jump straight into story markdown files.

**Approach:** Implement a pure domain Kanban parser (`src/core/kanban-parser.ts`) that extracts user stories, column allocations (`backlog`, `ready-for-dev`, `in-progress`, `review`, `done`), completion metrics, and retrospective action items from `sprint-status.yaml`. Build an interactive Kanban board component (`src/webview/components/SprintBoard.tsx`) featuring columns with story cards, action item trays, and one-click navigation to story files via JSON-RPC.

## Boundaries & Constraints

**Always:**
- Strictly isolate domain YAML parsing and board metrics in `src/core/kanban-parser.ts` without importing `vscode` (Hexagonal Architecture / AR-2).
- Organize stories into 5 canonical columns: `backlog`, `ready-for-dev`, `in-progress`, `review`, `done`.
- Filter out epic status keys (e.g. `epic-1`, `epic-2`) and retrospective markers (`epic-1-retrospective`) from story columns into appropriate grouping metadata.
- Display retrospective action items in a collapsible tray with status badges (`open`, `in-progress`, `done`).
- Clicking any story card dispatches `openStory` RPC request to open the corresponding markdown file in the editor.
- Fall back gracefully if `sprint-status.yaml` is missing or uninitialized.

**Never:**
- Never perform direct file writes from inside the Webview bundle (AD-1).
- Never crash on malformed or divergent YAML schema (AD-5).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Render Active Sprint** | Valid `sprint-status.yaml` with stories across 4 epics | Kanban columns populated with cards; completion percentage calculated | Renders metrics and columns |
| **Click Story Card** | User clicks card for `4-1-webview-dashboard-...` | Sends `openStory` RPC request; opens markdown file in VS Code editor | Displays error if story file not found |
| **Retrospective Action Items** | YAML contains `action_items` list with open items | Renders collapsible tray at bottom showing action item cards | Displays empty notice if no action items |
| **Missing sprint-status.yaml** | Workspace without tracking file | Shows empty state with guidance to initialize sprint planning | Does not crash |
| **Malformed YAML** | Corrupted YAML syntax in file | Logs warning and falls back to empty board structure | Safe error state |

</frozen-after-approval>

## Code Map

- `src/core/types.ts` -- Define Kanban models: `BmadKanbanCard`, `BmadKanbanColumn`, `BmadKanbanBoard`.
- `src/core/kanban-parser.ts` -- Pure domain parser parsing `sprint-status.yaml` and calculating board metrics.
- `src/adapters/webview-dashboard-panel.ts` -- Project Kanban state via `getState` and wire `openStory` RPC handler.
- `src/webview/components/SprintBoard.tsx` -- Interactive Preact Kanban board with columns, cards, and action items tray.
- `src/webview/main.tsx` -- Embed `SprintBoard` into the Sprint Board tab.
- `test/kanban-parser.test.ts` -- Unit tests validating YAML parsing, column categorization, action items, and fallback handling.

## Tasks & Acceptance

**Execution:**
- [x] `src/core/types.ts` -- Add `BmadKanbanCard`, `BmadKanbanColumn`, `BmadKanbanBoard` types.
- [x] `src/core/kanban-parser.ts` -- Implement `parseKanbanBoard` parsing sprint YAML into columns and action items.
- [x] `src/adapters/webview-dashboard-panel.ts` -- Attach parsed Kanban board to `BmadDashboardState`.
- [x] `src/webview/components/SprintBoard.tsx` -- Implement Preact Kanban board with column cards and action items tray.
- [x] `src/webview/main.tsx` -- Integrate `SprintBoard` into the Sprint Board tab.
- [x] `test/kanban-parser.test.ts` -- Unit test suite for Kanban parsing, column mapping, and error resilience.

**Acceptance Criteria:**
- Given `sprint-status.yaml` exists, when the user views the Sprint Board tab, then stories are rendered as cards in columns matching their YAML status (`backlog`, `ready-for-dev`, `in-progress`, `review`, `done`).
- Retrospective action items are displayed in a collapsible tray with status badges (`open`, `in-progress`, `done`).
- Clicking any story card opens its corresponding markdown story file in the editor.

## Implementation Notes

- Created `parseKanbanBoard` in `src/core/kanban-parser.ts` converting `sprint-status.yaml` entries into structured columns, calculating completion metrics, and parsing retrospective action items.
- Connected Kanban board projection through `BMADDashboardPanel` and JSON-RPC.
- Built `SprintBoard.tsx` with metrics header, progress bar, epic filter, search filtering, 5 status columns with colored top indicators, story cards linking to markdown files, and an expandable retrospective tray.
- Added comprehensive unit tests in `test/kanban-parser.test.ts` verifying metrics calculation, column distribution, and error handling.

## Spec Change Log

## Review Triage Log
