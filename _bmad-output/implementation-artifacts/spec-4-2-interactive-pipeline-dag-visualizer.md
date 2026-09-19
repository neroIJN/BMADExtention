---
title: 'Story 4.2: Interactive Pipeline DAG Visualizer'
type: 'feature'
created: '2026-09-19'
status: 'done'
baseline_commit: 'dc6a07b'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/implementation-artifacts/epic-4-context.md'
  - '_bmad-output/implementation-artifacts/spec-4-1-webview-dashboard-infrastructure-json-rpc-bridge.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The BMAD framework defines a multi-phase lifecycle with distinct skills and strict phase gates (Phase 0 Setup -> Phase 1 Analysis -> Phase 2 Planning -> Phase 3 Solutioning -> Phase 4 Implementation -> Phase 5 Ship -> Anytime). Currently, users must infer the workflow order from documentation, lacking an interactive graphical node visualization to see dependencies, active stage, and prerequisite blockers.

**Approach:** Implement a pure domain DAG builder (`src/core/dag-builder.ts`) that transforms BMAD lifecycle skills into an acyclic dependency graph with computed phase ranks, prerequisite dependency links (`preceded-by`, `followed-by`), and gate blocker detection. Enhance the Webview dashboard with an interactive visual DAG (`src/webview/components/PipelineDag.tsx`) featuring SVG connection paths, status color badges, and an interactive slide-out detail drawer for skill inspection and direct execution.

## Boundaries & Constraints

**Always:**
- Keep domain DAG graph computation strictly in `src/core/dag-builder.ts` with zero VS Code API imports (Hexagonal Architecture / AR-2).
- Render nodes with real-time status colors: Pending (`#888888`), In Progress (`#569CD6`), Completed (`#4EC9B0`), Required Gate Blocked (`#F14C4C`).
- Connect dependent nodes with SVG dependency edges showing workflow direction.
- Provide a slide-out Detail Drawer when a node is clicked, showing description, prerequisites, artifacts, and a "Run Skill" execution trigger.
- Inherit native VS Code CSS variables (`var(--vscode-*)`) so DAG visualizer seamlessly conforms to any user theme.

**Never:**
- Never block UI thread on large graphs.
- Never crash on missing lifecycle files or cyclical dependencies.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Render Complete Pipeline** | Workspace with 7 canonical phases and standard skills | DAG rendered with phase columns, nodes, and directed dependency links | Gracefully lays out orphan skills |
| **Prerequisite Gate Blocked** | Downstream skill whose prerequisite phase is incomplete | Node marked with `blocked` status and warning border | Shows missing prerequisite in detail drawer |
| **Node Click Selection** | User clicks a skill node | Slide-out detail drawer opens with description, inputs, outputs, run button | Clicking outside or close button dismisses drawer |
| **Skill Execution from Drawer** | User clicks "Run Skill" inside detail drawer | Sends `executeSkill` RPC request to Extension Host and shows executing state | Catches and displays execution errors |
| **No Skills Configured** | Empty or non-BMAD workspace | Displays clean empty state with setup guidance | Does not crash |

</frozen-after-approval>

## Code Map

- `src/core/types.ts` -- Define DAG types: `BmadDagNode`, `BmadDagEdge`, `BmadPipelineDag`, `BmadDagNodeStatus`.
- `src/core/dag-builder.ts` -- Pure domain DAG builder constructing topological stages, dependency links, and gate blocker detection.
- `src/webview/components/PipelineDag.tsx` -- Interactive Preact SVG/card visualizer component with responsive layout and detail drawer.
- `src/webview/main.tsx` -- Embed `PipelineDag` into the Pipeline DAG tab with real-time state projection.
- `test/dag-builder.test.ts` -- Unit test suite validating dependency resolution, blocker detection, and graph layout.

## Tasks & Acceptance

**Execution:**
- [x] `src/core/types.ts` -- Add `BmadDagNode`, `BmadDagEdge`, `BmadPipelineDag`, `BmadDagNodeStatus` types.
- [x] `src/core/dag-builder.ts` -- Implement `buildPipelineDag` constructing graph nodes, edges, ranks, and gate statuses.
- [x] `src/webview/components/PipelineDag.tsx` -- Build interactive visual DAG with SVG connectors, node cards, and detail drawer.
- [x] `src/webview/main.tsx` -- Integrate `PipelineDag` component into the Pipeline DAG tab.
- [x] `test/dag-builder.test.ts` -- Write unit tests for DAG construction, dependency linking, and blocker detection.

**Acceptance Criteria:**
- Given the Webview dashboard is open, when the user views the Pipeline DAG tab, then all BMAD skills are rendered as nodes connected by `preceded-by` and `followed-by` dependency links.
- Nodes display real-time status colors (Pending, In Progress, Completed, Required Gate Blocked).
- Clicking any node opens a detail drawer showing description, inputs, outputs, and execution buttons.

## Implementation Notes

- Implemented pure domain `buildPipelineDag` in `src/core/dag-builder.ts` computing canonical phase grouping, dependency links, and prerequisite gate blocker detection.
- Extended `BmadDashboardState` to project `dag` structure to the Webview client over JSON-RPC.
- Created `PipelineDag.tsx` featuring horizontal phase workflow columns, status cards with badge indicators, and a slide-out Detail Drawer with prerequisites, inputs/outputs, and execution trigger.
- Verified with 5 unit tests in `test/dag-builder.test.ts`.

## Spec Change Log

## Review Triage Log
