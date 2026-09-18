---
title: 'Story 3.1: Categorized Artifacts Explorer'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'artifacts'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/implementation-artifacts/spec-2-3-interactive-command-palette-registry.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Deliverables produced across the BMAD lifecycle (PRD, Architecture Spine, Epics/Stories, Implementation Specs, Retrospectives, QA Test Plans, Traceability matrices) are stored across various nested folders under `_bmad-output/` or `docs/`. Developers lack a structured, centralized view inside VS Code to inspect, audit, and open these deliverables without manually digging through directories in the generic file explorer.

**Approach:** Implement a pure domain artifact scanner (`src/core/artifact-scanner.ts`) and a dedicated VS Code TreeDataProvider (`src/adapters/artifacts-tree-provider.ts`) registered under `bmad.views.artifacts`. The view groups discovered artifacts into canonical categories (Planning & Product, Architecture & System Design, Implementation & Sprint, Testing & Quality), displays file metadata (size, modification time, file extension icon), and enables one-click opening in the active editor.

## Boundaries & Constraints

**Always:**
- Keep pure file system scanning and categorizing logic in `src/core/artifact-scanner.ts` with zero VS Code API dependencies (Hexagonal Architecture / AR-2).
- Use resolved paths from `BmadResolvedPaths` (from `ConfigResolver`) to locate output directories dynamically (`outputFolder`, `planningArtifacts`, `implementationArtifacts`, `testArtifacts`).
- Group artifacts into canonical categories:
  1. `Planning & Product` (`_bmad-output/planning-artifacts/prds/`, `epics.md`, briefs)
  2. `Architecture & System Design` (`_bmad-output/planning-artifacts/architecture/`, architecture spines)
  3. `Implementation & Sprint` (`_bmad-output/implementation-artifacts/`, specs, `sprint-status.yaml`)
  4. `Testing & Quality` (`_bmad-output/test-artifacts/`, test plans, trace matrices)
- Provide metadata: file size formatted (e.g., `2.4 KB`, `850 B`), relative path, and last-modified time.
- Clicking an artifact item executes `bmad.openArtifact` to open the file in the VS Code text editor.
- Non-blocking: handle missing directories or empty project folders gracefully without crashing.

**Never:**
- Never scan `node_modules/`, `.git/`, `dist/`, or root configuration files into the artifacts tree.
- Never crash or throw unhandled exceptions if an artifact file is locked, missing, or empty.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Standard BMAD Project** | Populated `_bmad-output/` with PRD, Spine, Specs | Tree shows 4 categories; clicking leaf node opens document | Clean recursive scan |
| **Empty Output Directory** | `_bmad-output/` exists but is empty | Tree displays categories with 0 count or friendly welcome message | Non-blocking |
| **Missing Output Directory** | Workspace with no `_bmad-output/` folder yet | Safe fallback with empty categories array | Graceful handling |
| **Large Artifact Directory** | Deeply nested test or report files | Scans files up to safe depth (e.g. 5) without freezing host | Asynchronous scan |
| **Open File Command** | User clicks leaf artifact node | Document opened via `vscode.window.showTextDocument` | Verifies existence |

</frozen-after-approval>

## Code Map

- `src/core/types.ts` -- Define `BmadArtifactItem`, `BmadArtifactCategory`, `BmadArtifactTreeNode`
- `src/core/artifact-scanner.ts` -- Pure domain scanner and categorizer for project deliverables
- `src/adapters/artifacts-tree-provider.ts` -- VS Code `TreeDataProvider` for `bmad.views.artifacts`
- `src/extension.ts` -- Register `bmad.views.artifacts`, `bmad.openArtifact`, and `bmad.refreshArtifacts`
- `package.json` -- Register `bmad.refreshArtifacts` and `bmad.openArtifact` commands and title menus
- `test/artifact-scanner.test.ts` -- Unit tests verifying directory scanning, categorization, metadata formatting, and error tolerance

## Tasks & Acceptance

**Execution:**
- [x] `src/core/types.ts` -- Define artifact data models
- [x] `src/core/artifact-scanner.ts` -- Implement recursive scanner and category partitioner
- [x] `test/artifact-scanner.test.ts` -- Unit tests for artifact scanning and metadata extraction
- [x] `src/adapters/artifacts-tree-provider.ts` -- Implement `vscode.TreeDataProvider` for artifacts explorer
- [x] `package.json` & `src/extension.ts` -- Wire tree provider, commands, and refresh actions

**Acceptance Criteria:**
- "Artifacts Explorer" tree view displays all generated artifacts grouped under Planning, Architecture, Implementation, and Testing.
- Leaf nodes display file name, size, and icons; clicking an item opens the file in the editor.
- All unit tests pass and extension builds cleanly.

## Implementation Notes
- Created pure domain scanner in `src/core/artifact-scanner.ts` providing depth-limited recursive traversal, robust file metadata extraction, human-readable file sizing (`formatFileSize`), and directory-aware artifact categorization (`determineArtifactCategory`).
- Built `ArtifactsTreeProvider` (`src/adapters/artifacts-tree-provider.ts`) implementing `vscode.TreeDataProvider<BmadArtifactTreeNode>` with category grouping, file extension themed icons, and formatted Markdown tooltips.
- Registered commands `bmad.openArtifact` and `bmad.refreshArtifacts` in `src/extension.ts` and `package.json`, along with inline and title navigation icons.
- Added comprehensive unit test coverage in `test/artifact-scanner.test.ts` verifying parsing, categorization, file sizing, and resilience against missing directories. All 70 unit tests pass.

## Spec Change Log
- 2026-09-19: Completed Story 3.1 implementation and verified all acceptance criteria.

## Review Triage Log
