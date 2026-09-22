---
title: 'Story 5.2: Interactive Drag-and-Drop Pipeline Canvas & Visual Authoring'
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

**Problem:** The v1 Pipeline DAG in the Webview dashboard is a read-only visual projection. Developers and architects creating custom BMAD modules or workflows cannot reposition nodes, rearrange execution sequences, or author workflow dependency links visually.

**Approach:** Upgrade `src/webview/components/pipeline-dag.tsx` into an interactive visual canvas. Add drag-and-drop node movement with snap-to-grid alignment and dynamic SVG bezier curve edge routing. Enable drag-to-connect dependency wiring between skills, and implement JSON-RPC endpoints allowing users to save modified pipeline topologies back to the workspace configuration.

## Boundaries & Constraints

**Always:**
- Keep visual rendering performant using Preact SVG/canvas primitives without heavy external canvas runtimes.
- Maintain CSS token inheritance (`var(--vscode-*)`) and strict CSP nonces inside the Webview.
- Validate topological consistency (prevent cyclic dependency deadlocks) before permitting links to be created.
- Request user confirmation before saving modified workflow definitions to disk.

**Never:**
- Never execute destructive file writes to `_bmad/` without explicit user confirmation.
- Never block the Webview rendering thread during canvas dragging operations.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Node Dragging** | User mousedowns and drags node card | Node moves smoothly; connecting dependency curves update in real-time | Boundaries clamped to canvas |
| **Dependency Wiring** | User drags connector from Node A to Node B | Draws preview line; on drop, adds `preceded-by` link if acyclic | Rejects cyclic loop with toast |
| **Save Workflow** | User clicks "Save Workflow" | Emits JSON-RPC request to Host; saves to `_bmad/` configuration | Non-blocking error alert if write fails |
| **Reset Layout** | User clicks "Reset Layout" | Restores default auto-layout DAG positions | N/A |

</frozen-after-approval>

## Code Map

- `src/core/dag-builder.ts` -- Add cycle detection and topology update helper methods (`validateAcyclic`, `updateDependencies`).
- `src/webview/components/pipeline-dag.tsx` -- Add drag-and-drop state, mouse gesture handlers, connector port nodes, and interactive connection wire rendering.
- `src/core/types.ts` -- Define canvas coordinate types and `saveWorkflowTopology` RPC payload.
- `src/adapters/webview-dashboard-panel.ts` -- Register `saveWorkflowTopology` RPC handler on extension host.
- `test/dag-builder.test.ts` -- Unit tests verifying cycle detection and dependency graph validation.

## Tasks & Acceptance

**Execution:**
- [ ] `src/core/dag-builder.ts` -- Implement DAG topological validation and acyclic integrity checking.
- [ ] `src/webview/components/pipeline-dag.tsx` -- Implement interactive node dragging and connection handle dragging.
- [ ] `src/adapters/webview-dashboard-panel.ts` -- Add RPC handlers for saving pipeline topologies.
- [ ] `test/dag-builder.test.ts` -- Test graph manipulation and loop prevention.
