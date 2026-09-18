---
title: 'Story 1.3: BMAD Lifecycle Workflow Tree & Completion Detector'
type: 'feature'
created: '2026-09-18'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - '_bmad-output/implementation-artifacts/spec-1-1-extension-scaffolding-build-pipeline-workspace-detection.md'
  - '_bmad-output/implementation-artifacts/spec-1-2-dynamic-configuration-path-resolver-engine.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Developers currently have to remember or look up the sequence of BMAD lifecycle phases (`0-learning`, `1-analysis`, `2-plan`, `3-solutioning`, `4-implementation`, `ship`, `anytime`), which skills exist within them, and whether required gates or deliverables have been produced.

**Approach:** Implement `LifecycleTreeProvider` (registered as `bmad.views.lifecycle`) with phase grouping, skill items parsed from `_bmad/_config/bmad-help.csv`, dynamic completion detection based on actual files present in `{planning_artifacts}` and `{implementation_artifacts}`, and badges for required gates (`required: true`).

## Boundaries & Constraints

**Always:**
- Implement a pure domain parser/detector in `src/core/lifecycle-parser.ts` separate from the VS Code TreeDataProvider adapter in `src/adapters/lifecycle-tree-provider.ts` (Hexagonal Architecture / AR-2).
- Parse skills and phases directly from `bmad-help.csv`.
- Match output artifacts in resolved directories (`planningArtifacts`, `implementationArtifacts`, `testArtifacts`) to reflect completion state.
- Render phase categories as expandable tree nodes with their child skills.
- Show required gates clearly in item descriptions or tooltips.

**Never:**
- Never block the UI thread during file existence checks; keep tree item resolution asynchronous.
- Never crash when `bmad-help.csv` contains unexpected columns or missing phases.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Complete Workspace** | Valid `bmad-help.csv` with 50+ skills across phases | Tree items grouped by phase (`0-learning`, `1-analysis`, `2-plan`, etc.) | Graceful parsing |
| **Artifact Present (Done)** | PRD exists in `planning-artifacts/prds/.../prd.md` | PRD skill item displays green checkmark (`$(pass)`) icon | State reflected |
| **Draft Artifact** | Draft PRD without completion marker | PRD skill item displays in-progress indicator (`$(sync~spin)` or `$(edit)`) | State reflected |
| **Missing Artifact** | No matching artifact created yet | Skill item displays default/circle icon (`$(circle-outline)`) | Clean empty state |
| **Required Gate** | Skill marked `required: true` (e.g. PRD, Arch Spine) | Item displays `[REQUIRED]` badge or description tag | Emphasized in UI |

</frozen-after-approval>

## Code Map

- `src/core/types.ts` -- Define `BmadLifecyclePhase`, `BmadSkillNode`, and `ArtifactStatus`
- `src/core/lifecycle-parser.ts` -- Pure domain parser for `bmad-help.csv` and artifact detection
- `src/adapters/lifecycle-tree-provider.ts` -- VS Code `TreeDataProvider` implementation
- `src/extension.ts` -- Register `bmad.views.lifecycle` TreeDataProvider
- `test/lifecycle-parser.test.ts` -- Unit tests for CSV parsing and completion detection

## Tasks & Acceptance

**Execution:**
- [ ] `src/core/types.ts` -- Add lifecycle and tree node data structures
- [ ] `src/core/lifecycle-parser.ts` -- Implement phase ordering, CSV parsing, and completion detection
- [ ] `src/adapters/lifecycle-tree-provider.ts` -- Implement `vscode.TreeDataProvider<BmadTreeNode>`
- [ ] `src/extension.ts` -- Register provider with `vscode.window.registerTreeDataProvider`
- [ ] `test/lifecycle-parser.test.ts` -- Unit tests verifying phase ordering, skill categorization, and artifact completion checks

**Acceptance Criteria:**
- Given an active BMAD workspace, the "Lifecycle & Workflows" tree view renders phases in canonical order.
- Given skills under each phase, their menu codes and names are displayed with appropriate completion icons based on filesystem artifacts.
- All unit tests pass and build succeeds cleanly.

## Implementation Notes

## Spec Change Log

## Review Triage Log
