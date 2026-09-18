# Epic 1 Context: Workspace Onboarding & Project Orientation

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Enable developers opening any workspace in VS Code to automatically detect whether BMAD is installed, observe the current project lifecycle phase in the status bar, and navigate the complete lifecycle workflow tree with completion tracking and inline actions.

## Stories

- Story 1.1: Extension Scaffolding, Build Pipeline & Workspace Detection
- Story 1.2: Dynamic Configuration & Path Resolver Engine
- Story 1.3: BMAD Lifecycle Workflow Tree & Completion Detector
- Story 1.4: Inline Tree Actions & Status Bar Indicator

## Requirements & Constraints

- **Workspace Detection**: Detect presence of `_bmad/_config/manifest.yaml` and `_bmad/_config/bmad-help.csv` on workspace activation, setting context key `bmad:hasBmadProject` (FR-1).
- **Path Resolution**: Dynamically resolve path tokens `{planning_artifacts}`, `{implementation_artifacts}`, and `{output_folder}` into absolute operating system paths without double prefixes (FR-2).
- **Lifecycle Tree & Gating**: Render phase-grouped tree (`0-learning` through `ship` + `anytime`), badge completed artifacts (checkmarks for final, clocks for drafts), and highlight required gates (FR-3, FR-4).
- **Inline Actions & Status Bar**: Provide tree action buttons (Run, Open Artifact, View Docs) and a persistent status bar item `$(sparkle) BMAD: [Phase] ([Status])` with QuickPick launcher (FR-5, FR-15).
- **Performance Constraints**: Memory footprint must stay < 35MB; idle CPU utilization < 0.1%; all disk I/O must be asynchronous; tree views must support lazy loading (NFR-1).
- **Fault Tolerance**: Gracefully fall back to defaults when optional configuration files are missing without throwing unhandled exceptions (NFR-4).
- **Cross-Platform**: Support POSIX and Windows path separators seamlessly (NFR-5).

## Technical Decisions

- **Hexagonal Architecture**: Decouple pure domain logic (`src/core/`) from VS Code APIs for unit testability in Node (AR-2, AD-1).
- **Dual Bundler Pipeline**: Use `esbuild` for ultra-fast extension host compilation and `vite` for webview compilation (AR-1, AD-2).
- **Single Source of Truth**: Centralize state coordination in `StateEngine` (AD-1).
- **Dedicated Output Channel**: Route all diagnostic logging to `vscode.window.createOutputChannel("BMAD Method")`.
- **Naming Conventions**: Files in `kebab-case.ts`, classes in `PascalCase`, methods in `camelCase`.

## UX & Interaction Patterns

- **Activity Bar Brand Container**: Custom `bmad-explorer` container registered with Activity Bar icon.
- **Status Bar Integration**: Responsive status item placed in the bottom bar with click handler opening recommendation menu.
- **Tree Views**: Native VS Code TreeView with theme-aware icons and tooltips.

## Cross-Story Dependencies

- Story 1.1 scaffolds the repository, build scripts, extension activation, and workspace detector.
- Story 1.2 builds the domain configuration resolver on top of 1.1.
- Story 1.3 implements the `LifecycleTreeProvider` consuming 1.1 and 1.2.
- Story 1.4 implements inline actions and the status bar item on top of 1.3.
