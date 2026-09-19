# Epic 4 Context: Visual Cockpit & Sprint Kanban Management

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Deliver an interactive Webview dashboard featuring a visual BMAD Pipeline DAG and a live, drag-and-drop Kanban sprint board backed by sprint-status.yaml with sub-300ms reactive file watcher synchronization.

## Stories

- Story 4.1: Webview Dashboard Infrastructure & JSON-RPC Bridge
- Story 4.2: Interactive Pipeline DAG Visualizer
- Story 4.3: Interactive Sprint Kanban Board
- Story 4.4: Debounced Real-Time Live Synchronization

## Requirements & Constraints

- Webview must render inside a dedicated editor tab panel (`bmad.openDashboard`).
- Strict Content Security Policy (CSP) with per-session nonces must be enforced on all scripts and styles.
- Must inherit VS Code theme CSS variables (`var(--vscode-*)`) so UI matches dark/light/high-contrast themes naturally.
- Asynchronous JSON-RPC 2-way communication bridge (`{ id, type, command, payload, error? }`) between Webview and Extension Host with mandatory 5000ms request timeout.
- Pipeline DAG renders all skills with dependency links (`preceded-by`, `followed-by`), live status badges (Pending, In Progress, Completed, Required Gate Blocked), and node detail drawer.
- Sprint Kanban board parses `sprint-status.yaml` into columns (`backlog`, `ready-for-dev`, `in-progress`, `review`, `done`), displays story cards with title, owner, and status, and renders retrospective action items tray.
- Clicking story cards or nodes opens the underlying markdown story or specification in the editor.
- File watcher must use trailing debounce (300ms) watching `_bmad/` and `_bmad-output/` to push updates without flickering, page reloads, or loss of user scroll/focus state.

## Technical Decisions

- **AD-1:** Single-source-of-truth state engine on Extension Host. Webview is a read-only projection surface receiving immutable snapshots via JSON-RPC. Webview never performs direct file I/O.
- **AD-2:** UI stack is Preact + Vite + isolated bundling (`dist/webview/`).
- **AD-5:** Defensive parsing for all YAML/CSV inputs with fallback states on schema divergence.
- **AD-6:** Robust JSON-RPC envelope: `{ id: string, type: 'request' | 'response' | 'event', command: string, payload: unknown, error?: string }`.
- Webview panel lifecycle manages singleton panel instance (`BMADDashboardPanel.currentPanel`), disposing event listeners cleanly on panel closure.

## UX & Interaction Patterns

- Tabbed dashboard navigation: Pipeline DAG view and Sprint Board view.
- Real-time reactivity: UI state updates seamlessly within 300ms of file changes without page reloads.
- Node selection opens a slide-out detail drawer with skill overview and execute button.
- Story cards display status badges and link to story files.
- Empty/uninitialized state gives clear guidance when `sprint-status.yaml` is missing.

## Cross-Story Dependencies

- Story 4.1 provides the foundational Webview panel, Preact container, and JSON-RPC bridge that Stories 4.2 (Pipeline DAG) and 4.3 (Kanban Board) mount into.
- Story 4.4 attaches the debounced file watcher to the JSON-RPC event bus to broadcast state changes to the Webview.
