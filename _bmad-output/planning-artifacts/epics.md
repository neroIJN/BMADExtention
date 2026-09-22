---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-BMADExtention-2026-09-18/prd.md
  - _bmad-output/planning-artifacts/prds/prd-BMADExtention-2026-09-18/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md
---

# BMADExtention - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for BMADExtention (BMAD Visualizer & Helper for VS Code), decomposing the requirements from the PRD, UX Design specifications, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

- **FR-1:** BMAD Workspace Detection & Status Resolution — Automatically detects whether active workspace contains `_bmad/` structure and registers/unregisters views accordingly.
- **FR-2:** Dynamic Configuration & Path Resolver — Parses project configuration (`config.toml`, `manifest.yaml`) and dynamically resolves output paths (`{planning_artifacts}`, `{implementation_artifacts}`, `{test_artifacts}`).
- **FR-3:** Phase-Structured Workflow Tree — Native sidebar Tree View grouping skills into lifecycle phases (`0-learning` through `ship` + `anytime`) with visual required-gate indicators.
- **FR-4:** Artifact-Based Completion Detection — Automatically detects skill completion status by scanning resolved output folders for expected artifact deliverables.
- **FR-5:** Inline Tree Actions — Provides action buttons on tree nodes to run skills, open artifacts, and view documentation.
- **FR-6:** Persona Gallery & Profile Inspection — Native sidebar Tree View displaying installed agent personas (John, Winston, Amelia, Sally, Murat, Mary, CIS) with profile details.
- **FR-7:** One-Click Persona Activation & Prompt Dispatch — Allows developers to launch agent terminal sessions or copy formatted prompt directives to clipboard.
- **FR-8:** Interactive Pipeline DAG Visualizer — Webview panel rendering an interactive graph of the BMAD workflow showing prerequisites, active state, and dependencies.
- **FR-9:** Interactive Sprint Kanban Board — Webview board visualizing `sprint-status.yaml` into Backlog, Ready for Dev, In Progress, Review, and Done columns with story cards and retrospective action items.
- **FR-10:** Real-Time Live Sync & File Watcher — Debounced file system watcher that updates sidebar trees and Webview panels within 300ms of file changes on disk.
- **FR-11:** Categorized Artifact Explorer — Native sidebar view organizing deliverables into Planning, Architecture, Implementation, and Test directories.
- **FR-12:** Memlog Chronology Viewer — Visual inspector for `.memlog.md` files displaying chronological history of decisions, assumptions, events, and insights.
- **FR-13:** PRD & Specification Rubric Validator — Displays rubric gate evaluations (`PASS`, `CONCERNS`, `FAIL`) and review findings categorized by severity.
- **FR-14:** Traceability Matrix & Quality Gate Dashboard — TEA quality dashboard displaying 0-100 quality scores, ATDD checklist status, and requirements-to-test traceability.
- **FR-15:** Persistent Status Bar Indicator — VS Code status bar item showing current BMAD phase, active story, and next recommended action.
- **FR-16:** Comprehensive Command Palette Registry — Contributes commands (`BMAD: Open Dashboard`, `BMAD: Run Skill...`, `BMAD: Talk to Agent...`) with QuickPick menus.
- **FR-17:** Multi-Root Workspace Support & Dynamic Context Resolution — Detects BMAD configurations across multiple roots in a multi-folder VS Code workspace, provides quick root switching, and dynamically binds providers and Webviews to the selected project context.
- **FR-18:** Interactive Drag-and-Drop Pipeline Canvas & Visual Authoring — Extends the Webview pipeline into an interactive drag-and-drop authoring canvas allowing visual repositioning of skill nodes, edge dependency wiring, and persisting custom workflow topologies.
- **FR-19:** Production Extension Packaging & VSIX Distribution Pipeline — Implements a production-grade packaging workflow with `@vscode/vsce`, `.vscodeignore` exclusion rules, manifest metadata auditing, bundle minification, and artifact validation (< 5MB target).
- **FR-20:** Automated Integration Testing in Extension Development Host — Implements an automated end-to-end integration test runner via `@vscode/test-electron` executing inside a genuine VS Code Extension Development Host to verify activation, tree providers, commands, and Webview RPC communication.

### NonFunctional Requirements

- **NFR-1 (Performance & Lightweight Host):** Asynchronous file I/O operations; lazy loading on tree views; memory footprint < 35MB; CPU idle utilization < 0.1%.
- **NFR-2 (Content Security Policy):** Strict CSP enforced on Webview panels with per-session nonces (`default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-...'; style-src vscode-resource: 'unsafe-inline';`).
- **NFR-3 (Native Theming & High Contrast):** 100% theme compatibility inheriting VS Code CSS variables (`var(--vscode-*)`) and full High Contrast mode support.
- **NFR-4 (Robust Error Handling & Fault Tolerance):** Safe schema validation on YAML/CSV files; invalid syntax falls back to last known good state with non-blocking warning banners.
- **NFR-5 (Cross-Platform Compatibility):** Fully compatible with Linux, macOS, and Windows file path separators and execution environments.

### Additional Requirements (from Architecture Spine)

- **AR-1 (Starter Template & Build Pipeline):** Initialize greenfield extension with TypeScript, esbuild for the extension host bundle, and Vite for the Webview Preact bundle.
- **AR-2 (Hexagonal Architecture):** Decouple pure domain logic (`src/core/`) from `vscode` API dependencies to ensure 100% unit testability in Node.
- **AR-3 (Single Source of Truth):** `StateEngine` in extension host acts as the sole owner of parsed BMAD state; Webviews receive read-only immutable projections.
- **AR-4 (Reactive File Watcher):** Trailing 300ms debounce window on file system watchers to coalesce burst writes during automated agent loops.
- **AR-5 (Execution Dispatch):** Named terminal `"BMAD Agent"` integration with automatic prompt-to-clipboard fallback.
- **AR-6 (Strict JSON-RPC Bridge):** Envelope protocol `{ id, type, command, payload, error }` with 5000ms response timeout.

### UX Design Requirements (from PRD & Addendum)

- **UX-DR1 (Activity Bar View Container):** Custom `bmad-explorer` Activity Bar icon and container housing Lifecycle, Sprint, Agents, and Artifacts tree views.
- **UX-DR2 (Status Bar Component):** Responsive status bar indicator with interactive QuickPick menu on click.
- **UX-DR3 (Pipeline DAG Graph UX):** Color-coded interactive node graph with animated status transitions and collapsible drawer for node details.
- **UX-DR4 (Kanban Board Component):** Drag-and-drop / column-based story board with story cards, retrospective action tray, and epic filters.
- **UX-DR5 (Theme Variable Styling):** Semantic styling using VS Code theme tokens across all Webview views.
- **UX-DR6 (Accessibility & Keyboard Nav):** ARIA labels, visible focus indicators, and complete keyboard navigation across all views.

### FR Coverage Map

- **FR-1:** Epic 1 - BMAD Workspace Detection & Status Resolution
- **FR-2:** Epic 1 - Dynamic Configuration & Path Resolver
- **FR-3:** Epic 1 - Phase-Structured Workflow Tree View
- **FR-4:** Epic 1 - Artifact-Based Completion Detection
- **FR-5:** Epic 1 - Inline Tree Actions
- **FR-6:** Epic 2 - Persona Gallery & Profile Inspection
- **FR-7:** Epic 2 - One-Click Persona Activation & Prompt Dispatch
- **FR-8:** Epic 4 - Interactive Pipeline DAG Visualizer
- **FR-9:** Epic 4 - Interactive Sprint Kanban Board
- **FR-10:** Epic 4 - Real-Time Live Sync & File Watcher
- **FR-11:** Epic 3 - Categorized Artifact Explorer
- **FR-12:** Epic 3 - Memlog Chronology Viewer
- **FR-13:** Epic 3 - PRD & Specification Rubric Validator
- **FR-14:** Epic 3 - Traceability Matrix & Quality Gate Dashboard (TEA)
- **FR-15:** Epic 1 - Persistent Status Bar Indicator
- **FR-16:** Epic 2 - Comprehensive Command Palette Registry
- **FR-17:** Epic 5 - Multi-Root Workspace Support & Dynamic Context Resolution
- **FR-18:** Epic 5 - Interactive Drag-and-Drop Pipeline Canvas & Visual Authoring
- **FR-19:** Epic 5 - Production Extension Packaging & VSIX Distribution Pipeline
- **FR-20:** Epic 5 - Automated Integration Testing in Extension Development Host

## Epic List

### Epic 1: Workspace Onboarding & Project Orientation
**Goal:** Enable developers to open any workspace in VS Code and instantly detect BMAD status, see active project phase in the status bar, and navigate the complete lifecycle workflow tree with completion tracking and inline actions.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-15 (Addresses AR-1, AR-2, AR-3, UX-DR1, UX-DR2, NFR-1, NFR-4, NFR-5)

### Epic 2: Agent Team Collaboration & Execution Dispatch
**Goal:** Enable developers to visually explore installed BMAD personas (John, Winston, Amelia, Murat, etc.), inspect their profile guidelines, and dispatch skill execution via a dedicated VS Code integrated terminal or direct clipboard prompt copy.
**FRs covered:** FR-6, FR-7, FR-16 (Addresses AR-5)

### Epic 3: Artifact Inspection & Governance Hub
**Goal:** Provide developers with a dedicated explorer to browse, preview, and audit all deliverables produced across the BMAD lifecycle, inspect `.memlog.md` chronological decisions, and view TEA quality matrices and rubric scores.
**FRs covered:** FR-11, FR-12, FR-13, FR-14 (Addresses NFR-4)

### Epic 4: Visual Cockpit & Sprint Kanban Management
**Goal:** Deliver an interactive Webview dashboard featuring a visual BMAD Pipeline DAG and a live, drag-and-drop Kanban sprint board backed by `sprint-status.yaml` with sub-300ms reactive file watcher synchronization.
**FRs covered:** FR-8, FR-9, FR-10 (Addresses AR-4, AR-6, UX-DR3, UX-DR4, UX-DR5, UX-DR6, NFR-2, NFR-3)

### Epic 5: Advanced v2 Platform Enhancements, Packaging & Host Verification
**Goal:** Elevate BMADExtention into a scalable v2 platform supporting multi-root workspaces, interactive drag-and-drop workflow canvas authoring, production-grade VSIX packaging, and automated end-to-end integration testing in the live VS Code Extension Development Host.
**FRs covered:** FR-17, FR-18, FR-19, FR-20 (Addresses AR-1, AR-2, AR-4, NFR-1, NFR-4, NFR-5)

---

## Epic 1: Workspace Onboarding & Project Orientation

Enable developers to open any workspace in VS Code and instantly detect BMAD status, see active project phase in the status bar, and navigate the complete lifecycle workflow tree with completion tracking and inline actions.

### Story 1.1: Extension Scaffolding, Build Pipeline & Workspace Detection

As a developer opening VS Code,
I want the extension to automatically detect if the open folder is a BMAD project,
So that the BMAD tooling activates seamlessly with zero manual setup.

**Acceptance Criteria:**

**Given** a project containing `_bmad/_config/manifest.yaml` and `_bmad/_config/bmad-help.csv`,
**When** the user opens the workspace in VS Code,
**Then** the extension activates, registers the `"BMAD Method"` output channel, and sets the VS Code context key `bmad:hasBmadProject` to `true`.
**And** if opened in a workspace without `_bmad/`, the context key `bmad:hasBmadProject` is set to `false` and no heavy background processes are started.

### Story 1.2: Dynamic Configuration & Path Resolver Engine

As a developer using custom BMAD output folder paths,
I want the extension to resolve configuration tokens dynamically from `_bmad/`,
So that the extension always finds planning and implementation artifacts accurately.

**Acceptance Criteria:**

**Given** `_bmad/bmm/config.yaml` or `_bmad/config.toml` containing tokens like `{planning_artifacts}` and `{output_folder}`,
**When** `ConfigResolver.resolve()` is executed in the pure domain core,
**Then** all tokens resolve to normalized, absolute operating system paths without double prefixes.
**And** if optional configuration files or keys are missing, sensible defaults are applied without throwing unhandled exceptions.

### Story 1.3: BMAD Lifecycle Workflow Tree & Completion Detector

As a developer planning or shipping a feature,
I want a phase-grouped sidebar tree showing all skills with completion checkmarks,
So that I immediately know where the project stands in the BMAD lifecycle.

**Acceptance Criteria:**

**Given** a valid BMAD workspace,
**When** the user opens the BMAD view container in the Activity Bar,
**Then** the `LifecycleTreeProvider` displays phases (`0-learning` through `ship` + `anytime`) and their child skills with menu codes (e.g. `[PRD]`, `[CA]`, `[BD]`).
**And** if an expected artifact file exists in `{planning_artifacts}` or `{implementation_artifacts}`, the node displays a completion checkmark (if final) or in-progress indicator (if draft).
**And** skills marked `required: true` display a visible required-gate badge.

### Story 1.4: Inline Tree Actions & Status Bar Indicator

As a developer working in code,
I want a persistent status bar indicator and inline tree buttons,
So that I can open artifacts or launch skills with a single click.

**Acceptance Criteria:**

**Given** an active BMAD workspace,
**When** the user glances at the VS Code Status Bar,
**Then** an item displays `$(sparkle) BMAD: [Phase] ([Status])` representing current lifecycle state.
**And** clicking the status bar item opens a QuickPick menu listing recommended next skills.
**And** hovering over any skill in the lifecycle tree reveals action buttons to run the skill, open its artifact, or view its documentation.

---

## Epic 2: Agent Team Collaboration & Execution Dispatch

Enable developers to visually explore installed BMAD personas (John, Winston, Amelia, Murat, etc.), inspect their profile guidelines, and dispatch skill execution via a dedicated VS Code integrated terminal or direct clipboard prompt copy.

### Story 2.1: Agents & Personas Hub Tree View

As a developer collaborating with AI personas,
I want a dedicated sidebar tree displaying all installed agents and their roles,
So that I can quickly learn who to consult for architecture, testing, product, or coding tasks.

**Acceptance Criteria:**

**Given** installed BMAD agents defined in `manifest.yaml` and module manifests,
**When** the user expands the "Agents & Personas" sidebar view,
**Then** all agent profiles (John, Winston, Amelia, Sally, Murat, Mary, CIS specialists) are listed with their avatars, titles, and team tags.
**And** clicking any agent opens a side panel or editor preview displaying their core principles, communication style, and focus areas.

### Story 2.2: Terminal & Clipboard Execution Dispatcher

As a developer needing to run a BMAD skill or persona session,
I want the extension to launch the command in a dedicated terminal or copy the prompt for my AI chat,
So that I can engage the agent without typing long shell commands.

**Acceptance Criteria:**

**Given** a user triggers "Run Skill" or "Talk to Agent",
**When** the execution mode is set to `terminal`,
**Then** the extension reveals or spawns a dedicated terminal named `"BMAD Agent"` and sends the appropriate CLI invocation command.
**And** if the execution mode is set to `clipboard` (or terminal launch is unavailable), the extension formats the complete agent directive, copies it to the system clipboard, and shows a non-blocking toast notification.

### Story 2.3: Interactive Command Palette Registry

As a keyboard-first developer,
I want full Command Palette support for all BMAD skills and agent actions,
So that I can navigate and invoke any workflow without touching the mouse.

**Acceptance Criteria:**

**Given** the user opens the VS Code Command Palette (Ctrl+Shift+P / Cmd+Shift+P),
**When** they type `BMAD: Run Skill`,
**Then** a fuzzy-searchable QuickPick lists all registered skills with their menu code, phase, and description.
**And** selecting a skill prompts for any required arguments and dispatches it through the execution dispatcher.

---

## Epic 3: Artifact Inspection & Governance Hub

Provide developers with a dedicated explorer to browse, preview, and audit all deliverables produced across the BMAD lifecycle, inspect `.memlog.md` chronological decisions, and view TEA quality matrices and rubric scores.

### Story 3.1: Categorized Artifacts Explorer

As a developer reviewing project documentation,
I want all generated artifacts organized into neat categories in the sidebar,
So that I can locate PRDs, architecture spines, test designs, and sprint status files immediately.

**Acceptance Criteria:**

**Given** output artifacts exist in `_bmad-output/` or `docs/`,
**When** the user expands the "Artifacts Explorer" view,
**Then** files are neatly categorized under Planning, Architecture, Implementation, and Tests folders with file size and timestamp metadata.
**And** clicking any file opens it directly in the active editor.

### Story 3.2: Memlog Chronological Timeline Inspector

As a developer or agent resuming a project,
I want to view the chronological log of decisions and assumptions recorded in `.memlog.md`,
So that I understand the context and rationale behind past architectural calls.

**Acceptance Criteria:**

**Given** a `.memlog.md` file in any run workspace,
**When** the user opens the Memlog Inspector,
**Then** entries are parsed and rendered chronologically with color-coded tags (`decision`, `assumption`, `insight`, `event`, `override`).
**And** the user can filter entries by type or search for specific keywords.

### Story 3.3: PRD & Specification Rubric Validator Viewer

As a product manager or tech lead,
I want to see the validation scorecards and review findings for specifications,
So that I can verify requirements readiness before authorizing implementation.

**Acceptance Criteria:**

**Given** a validation report or review findings artifact,
**When** viewed in the extension,
**Then** the overall verdict (`PASS`, `CONCERNS`, `FAIL`) is prominently displayed alongside critical, high, and medium findings.
**And** each finding includes direct clickable links to the file and line number containing the issue.

### Story 3.4: TEA Quality & Traceability Dashboard

As a QA lead or test architect,
I want to inspect test coverage traceability and audit scores,
So that I know whether all functional requirements are guarded by automated tests.

**Acceptance Criteria:**

**Given** test artifacts in `_bmad-output/test-artifacts/`,
**When** the user views the TEA Quality panel,
**Then** the 0-100 test quality score and ATDD scaffold progress are displayed.
**And** any functional requirement without corresponding test coverage is highlighted with an action to scaffold tests.

---

## Epic 4: Visual Cockpit & Sprint Kanban Management

Deliver an interactive Webview dashboard featuring a visual BMAD Pipeline DAG and a live, drag-and-drop Kanban sprint board backed by `sprint-status.yaml` with sub-300ms reactive file watcher synchronization.

### Story 4.1: Webview Dashboard Infrastructure & JSON-RPC Bridge

As a developer,
I want a secure, high-performance Webview dashboard adhering to native VS Code themes,
So that the visual cockpit feels native, responsive, and secure.

**Acceptance Criteria:**

**Given** command `BMAD: Open Visualizer Dashboard`,
**When** executed,
**Then** a dedicated editor tab Webview panel opens loading the Preact bundle built with Vite.
**And** the Webview enforces strict Content Security Policy (CSP) with unique nonces and inherits VS Code CSS variables.
**And** the asynchronous JSON-RPC communication bridge resolves requests within 5000ms.

### Story 4.2: Interactive Pipeline DAG Visualizer

As a developer visualizer user,
I want an interactive node graph representing the BMAD workflow pipeline,
So that I can see the end-to-end flow, prerequisite dependencies, and active stage visually.

**Acceptance Criteria:**

**Given** the Webview dashboard is open,
**When** the user views the Pipeline DAG tab,
**Then** all BMAD skills are rendered as nodes connected by `preceded-by` and `followed-by` dependency links.
**And** nodes display real-time status colors (Pending, In Progress, Completed, Required Gate Blocked).
**And** clicking any node opens a detail drawer showing description, inputs, outputs, and execution buttons.

### Story 4.3: Interactive Sprint Kanban Board

As a developer executing a sprint,
I want a Kanban board rendered directly from `sprint-status.yaml`,
So that I can track stories across Backlog, Ready for Dev, In Progress, Review, and Done.

**Acceptance Criteria:**

**Given** `_bmad-output/implementation-artifacts/sprint-status.yaml` exists,
**When** the user views the Sprint Board tab,
**Then** stories are rendered as cards in columns matching their YAML status (`backlog`, `ready-for-dev`, `in-progress`, `review`, `done`).
**And** retrospective action items are displayed in a collapsible tray with status badges (`open`, `in-progress`, `done`).
**And** clicking any story card opens its corresponding markdown story file in the editor.

### Story 4.4: Debounced Real-Time Live Synchronization

As a developer running background AI agents,
I want the UI to automatically update whenever files change on disk,
So that my dashboard and tree views always reflect the latest state without manual reloads.

**Acceptance Criteria:**

**Given** an agent modifies `sprint-status.yaml`, `.memlog.md`, or creates a new artifact,
**When** the file write finishes,
**Then** the trailing 300ms debounced file watcher triggers a state recomputation and pushes update events to all active views.
**And** the Kanban board and tree views update seamlessly in < 300ms without flickering, page reloads, or losing scroll position.

---

## Epic 5: Advanced v2 Platform Enhancements, Packaging & Host Verification

Elevate BMADExtention into a scalable v2 platform supporting multi-root workspaces, interactive drag-and-drop workflow canvas authoring, production-grade VSIX packaging, and automated end-to-end integration testing in the live VS Code Extension Development Host.

### Story 5.1: Multi-Root Workspace Support & Dynamic Context Resolution

As a developer working in a monorepo or multi-project workspace,
I want BMADExtention to detect all BMAD projects across workspace roots and allow switching between them,
So that I can monitor and orchestrate distinct BMAD lifecycles without opening separate VS Code windows.

**Acceptance Criteria:**

**Given** a VS Code multi-root workspace containing multiple open folders where one or more folders contain a valid `_bmad/` structure,
**When** the workspace is loaded or workspace folders are added or removed,
**Then** `WorkspaceDetector` identifies all BMAD-enabled root folders and exposes a project picker in the Status Bar and Lifecycle View title.
**And** selecting a workspace root dynamically rebinds `ConfigResolver`, `LifecycleTreeProvider`, `AgentsTreeProvider`, `ArtifactsTreeProvider`, and Webview state to that folder.
**And** if no open folders contain `_bmad/`, the views fall back gracefully to the welcome view without throwing unhandled exceptions.

### Story 5.2: Interactive Drag-and-Drop Pipeline Canvas & Visual Authoring

As a lead architect or workflow author,
I want an interactive drag-and-drop visual canvas for the BMAD pipeline DAG,
So that I can rearrange skill execution sequences, visually connect dependency links, and author custom workflow pipelines.

**Acceptance Criteria:**

**Given** the visualizer dashboard is open to the Pipeline Canvas tab,
**When** the user drags a skill node on the canvas,
**Then** the node moves fluidly with visual snap-to-grid alignment and dynamic SVG connection edge rerouting.
**And** users can drag connection handles between skill nodes to add or remove `preceded-by` and `followed-by` dependency links.
**And** clicking "Save Workflow" or exporting topology writes the updated workflow definitions back to `_bmad/` configuration via the JSON-RPC bridge with confirmation prompts.

### Story 5.3: Production Extension Packaging & VSIX Distribution Pipeline

As an extension maintainer or contributor,
I want an automated, standardized packaging pipeline using `@vscode/vsce` and strict `.vscodeignore` rules,
So that the extension can be packaged into a secure, minimal, production-ready `.vsix` bundle ready for the Marketplace or local installation.

**Acceptance Criteria:**

**Given** the extension repository with all dependencies and build scripts,
**When** running `npm run package` (or `npx vsce package`),
**Then** the build pipeline triggers `vscode:prepublish` (compiling extension bundle with esbuild and webview bundle with Vite) and packages a valid `.vsix` file.
**And** a comprehensive `.vscodeignore` excludes all development sources (`src/`, `test/`), planning and test artifacts (`_bmad-output/`, `_bmad/`), unit test configurations, and dev dependencies, yielding a package size under 5MB.
**And** `package.json` validates with all required Marketplace fields: publisher, repository, engine compatibility (`^1.85.0`), license, categories, and icon metadata without warnings or errors.

### Story 5.4: Automated Integration Testing in Extension Development Host

As a software engineer maintaining BMADExtention,
I want automated end-to-end integration tests that run inside the real VS Code Extension Development Host,
So that we verify real VS Code API behavior, command execution, tree views, and Webview lifecycle under genuine runtime conditions.

**Acceptance Criteria:**

**Given** the test infrastructure configured with `@vscode/test-electron`,
**When** running `npm run test:e2e` (or `npm run test:extension-host`),
**Then** the runner downloads a compatible VS Code test instance, launches the Extension Development Host in a sandbox workspace fixture, and executes integration test suites.
**And** integration tests verify that:
  1. The extension successfully activates and context key `bmad:hasBmadProject` evaluates to `true`.
  2. Tree views (`bmad.views.lifecycle`, `bmad.views.agents`, `bmad.views.artifacts`) register properly and return real items for an active BMAD workspace.
  3. Commands (`bmad.openDashboard`, `bmad.runSkill`, `bmad.talkToAgent`, `bmad.showRecommendations`) execute without throwing errors.
  4. Webview panels instantiate, set appropriate CSP headers with nonces, and maintain functional communication channels.
**And** launch and debug configurations (`.vscode/launch.json` and `.vscode/tasks.json`) are provided for interactive debugging in the Extension Host.
