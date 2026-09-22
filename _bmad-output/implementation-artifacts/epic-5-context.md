# Epic 5 Context: Advanced v2 Platform Enhancements, Packaging & Host Verification

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Elevate BMADExtention into a scalable v2 platform supporting multi-root workspaces, interactive drag-and-drop workflow canvas authoring, production-grade VSIX packaging, and automated end-to-end integration testing in the live VS Code Extension Development Host.

## Stories

- Story 5.1: Multi-Root Workspace Support & Dynamic Context Resolution
- Story 5.2: Interactive Drag-and-Drop Pipeline Canvas & Visual Authoring
- Story 5.3: Production Extension Packaging & VSIX Distribution Pipeline
- Story 5.4: Automated Integration Testing in Extension Development Host

## Requirements & Constraints

### Multi-Root Workspace Support (Story 5.1)
- Support VS Code multi-root workspaces (`workspace.workspaceFolders`), identifying all folders containing `_bmad/` structure (`_bmad/_config/manifest.yaml`).
- Expose an active project selector in the VS Code Status Bar and Lifecycle View title bar.
- Dynamically bind tree providers (`LifecycleTreeProvider`, `AgentsTreeProvider`, `ArtifactsTreeProvider`), Webview dashboards, and commands to the currently active project folder without requiring window reload.
- Handle edge cases gracefully: empty workspace, workspaces where no folder has BMAD, or workspaces where folders are added or removed dynamically.

### Interactive Drag-and-Drop Pipeline Canvas (Story 5.2)
- Upgrade the Webview Pipeline DAG into an interactive visual canvas allowing fluid dragging of skill nodes with snap-to-grid alignment.
- Support visual connector linking to establish or remove `preceded-by` and `followed-by` dependencies directly on canvas.
- Provide interactive workflow authoring capabilities allowing architects to customize skill execution order and persist topology changes back to `_bmad/` configuration via JSON-RPC.

### Production Extension Packaging & Distribution (Story 5.3)
- Integrate `@vscode/vsce` packaging scripts into `package.json` (`npm run package`).
- Author a comprehensive `.vscodeignore` to strip all development sources (`src/`, `test/`), planning artifacts, dev dependencies, and temporary files.
- Optimize production bundle sizes to strictly maintain package footprint under 5MB.
- Validate `package.json` metadata for full Marketplace compliance (publisher, repository, icon, license, engine constraints `^1.85.0`).

### Automated Testing in Extension Development Host (Story 5.4)
- Setup `@vscode/test-electron` test harness to execute integration and end-to-end tests inside the real VS Code Extension Development Host.
- Provide `.vscode/launch.json` and `.vscode/tasks.json` debug configurations for interactive Extension Host debugging.
- Implement comprehensive integration tests verifying extension activation, tree view population, command execution, and Webview JSON-RPC round trips.
- Enable headless execution in Linux/CI environments (`npm run test:e2e`).

## Technical Decisions

- **AD-1 & Hexagonal Architecture:** Domain core logic remains decoupled from the `vscode` API, while adapters and integration test runners verify VS Code API contracts directly in the Extension Development Host.
- **AD-2:** Webview canvas utilizes Preact SVG/canvas primitives with reactive JSON-RPC synchronization.
- **Packaging Standard:** Production packaging relies on `@vscode/vsce` with `esbuild` and `vite` minification and strict `.vscodeignore` exclusions.
- **Testing Pyramid:** Fast unit tests continue running in Vitest for pure core logic, complemented by `@vscode/test-electron` running real Extension Host integration suites.

## Cross-Story Dependencies

- Story 5.1 establishes multi-folder context resolution across all adapters before canvas authoring or packaging tests.
- Story 5.2 builds on Webview infrastructure from Epic 4 to enable two-way visual editing.
- Story 5.3 standardizes bundling and packaging assets required for distribution and production verification.
- Story 5.4 validates the full integrated extension (covering Epics 1-5) inside the real VS Code runtime.
