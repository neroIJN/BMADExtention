---
title: BMAD Visualizer & Helper for VS Code
status: draft
created: 2026-09-18
updated: 2026-09-18
---

# PRD: BMAD Visualizer & Helper for VS Code
*Working title — VS Code Extension for BMad Method Visualization, Lifecycle Orchestration, and Developer Guidance.*

## 0. Document Purpose

This Product Requirements Document (PRD) defines the functional, UX, and architectural requirements for a native Visual Studio Code extension that serves as the official visualizer, cockpit, and interactive assistant for the **BMad Method (BMAD)**. It bridges the gap between BMAD's terminal/AI-prompt-centric multi-agent methodology and the developer's everyday IDE. 

This document maps all BMAD components—installed modules (`core`, `bmm`, `bmb`, `cis`, `tea`, `bmad-loop`), personas/agents, skill catalogs (`bmad-help.csv`), lifecycle phases, gating dependencies, planning & implementation artifacts, and execution tracking—directly into first-class VS Code user interface paradigms (Activity Bar Views, Tree Data Providers, interactive Webview Dashboards, Status Bar indicators, and Command Palette shortcuts).

## 1. Vision

The **BMad Method** provides unmatched discipline for AI pair programming and autonomous software engineering through structured discovery, planning, solutioning, test architecture, and verifiable delivery. However, today's developers must mentally track their phase in the lifecycle, memorize 50+ skill commands and menu codes, manually inspect directories for output artifacts, and track sprint progression across raw YAML files.

The **BMAD Visualizer & Helper for VS Code** transforms BMAD from a prompt-driven framework into a rich, tangible IDE operating environment. With zero cognitive overhead, developers can look at their sidebar or interactive dashboard to see exactly where they are in the BMAD lifecycle, what artifact was just generated, which agent is active, what gate must be cleared next, and trigger skills or personas with a single click. It serves as both a **transparent HUD** for ongoing agent workflows and a **guiding copilot** for human developers leading their project from initial idea to production-ready code.

## 2. Target User & Stakeholders

### 2.1 Jobs To Be Done (JTBD)
- **Functional JTBD 1 (Orientation & Discovery):** When working on a BMAD-enabled project, I want to instantly see the active phase, completed milestones, and required next steps so that I never get lost in the multi-agent workflow.
- **Functional JTBD 2 (Execution & Prompt Assist):** When I need to trigger a skill or persona, I want a categorized visual palette with autocompletion and parameter validation so that I don't have to look up flags or menu codes in CSV catalogs.
- **Functional JTBD 3 (Artifact Inspection & Traceability):** When an agent produces a PRD, Architecture document, or Sprint Plan, I want immediate visual feedback, formatted previews, and diffing against previous versions right within VS Code.
- **Functional JTBD 4 (Sprint & Story Management):** When running iterative development (`bmad-build` or `bmad-loop`), I want an interactive Kanban board reflecting `sprint-status.yaml` so I can see story progress, blockers, and test status in real time.
- **Emotional JTBD:** As a solo developer or tech lead, I want to feel confident that AI agents are adhering to architectural and testing discipline rather than hallucinating in a black box.

### 2.2 Non-Users (v1)
- Developers working in IDEs other than VS Code / VS Code-compatible forks (e.g., pure CLI users, JetBrains IDEs, Neovim) in v1.
- Projects that do not adopt or install the `_bmad` structure.

### 2.3 Key User Journeys

#### UJ-1: Alex kicks off a greenfield project with BMAD in VS Code
- **Persona + Context:** Alex, a senior developer starting a new microservice in VS Code with BMAD installed.
- **Entry State:** Fresh VS Code workspace containing `_bmad/`.
- **Path:**
  1. Alex opens VS Code; the BMAD extension automatically detects `_bmad/` and lights up a status bar icon: `$(sparkle) BMAD: 1-Discovery (Not Started)`.
  2. Alex clicks the BMAD Activity Bar icon, revealing the **BMAD Lifecycle Tree** and the **Agents Hub**.
  3. The Lifecycle tree shows `1-Discovery` highlighted with a prompt: *"Next: Product Brief [CB] or PRD [PRD]"*.
  4. Alex clicks the play button next to `bmad-prd` (or clicks John, the Product Manager in the Agents Hub).
  5. The extension offers a choice: "Copy Prompt for AI", "Start in Integrated Terminal", or "Insert into Copilot/Chat". Alex picks "Copy Prompt for AI" and feeds it to his agent.
- **Climax:** As the agent writes `prd.md`, the VS Code extension file-watcher detects the artifact, badges `1-Discovery` as `In Progress`, and opens a live split-preview with checklist validation.
- **Resolution:** Alex sees the requirements document live, marks the phase complete, and sees the pipeline transition smoothly to `2-Planning (Architecture & UX)`.

#### UJ-2: Elena tracks and drives sprint execution via the Kanban Board
- **Persona + Context:** Elena, an engineering lead executing a 5-story sprint using `bmad-build` and `bmad-loop`.
- **Entry State:** PRD, Architecture, and `sprint-status.yaml` already exist in `_bmad-output/`.
- **Path:**
  1. Elena runs the command `BMAD: Open Visualizer Dashboard`.
  2. A dedicated Webview tab opens showing the interactive **BMAD Pipeline DAG** and the **Sprint Kanban Board**.
  3. The Kanban board displays columns: *Backlog*, *Ready for Dev*, *In Progress*, *Review*, *Done*, populated directly from `sprint-status.yaml`.
  4. Elena sees story `1-2-auth-jwt` in *In Progress* and clicks on it. The extension reveals the story file, linked acceptance criteria, and recent `.memlog.md` entries.
  5. When the background dev agent finishes the build and runs code review, `sprint-status.yaml` updates on disk; the Kanban card animates across to *Review* with zero manual refresh required.
- **Climax:** Elena sees real-time test execution results and review findings rendered directly on the story card.
- **Resolution:** Elena approves the change; the status updates to *Done*, and the status bar updates the sprint completion percentage.

#### UJ-3: Marcus audits quality and test coverage using the TEA Inspector
- **Persona + Context:** Marcus, a QA/Test Architect auditing a project's compliance against TEA (Test Architecture Enterprise).
- **Entry State:** Tests and TEA artifacts generated in `_bmad-output/test-artifacts/`.
- **Path:**
  1. Marcus clicks the **TEA Quality & Traceability** view in the BMAD sidebar.
  2. The view displays a 0-100 quality audit score, ATDD checklist status, and an interactive Traceability Matrix mapping PRD functional requirements to test scaffolds.
  3. Marcus spots an unmapped requirement (FR-4 without an automated test), clicks the "Generate ATDD Scaffold" action, which pre-fills the `bmad-testarch-atdd` command for Amelia.
- **Climax:** The gap is immediately closed, and the Traceability Matrix updates to green.
- **Resolution:** Marcus exports the quality gate decision report directly to markdown.

---

## 3. Glossary

- **BMAD (BMad Method):** The multi-agent development methodology and framework installed in the target workspace under `_bmad/`.
- **Module:** A self-contained package of skills and configurations within BMAD (e.g., `core`, `bmm`, `bmb`, `cis`, `tea`, `bmad-loop`).
- **Skill:** An executable agent capability or workflow defined by a `SKILL.md` file and cataloged in `_bmad/_config/bmad-help.csv`.
- **Menu Code:** The short 2-3 letter uppercase identifier used by BMAD to invoke skills (e.g., `PRD` for `bmad-prd`, `CA` for `bmad-architecture`, `BD` for `bmad-build`).
- **Phase:** A stage in the BMAD project lifecycle (e.g., `0-learning`, `1-discovery`, `2-planning`, `3-solutioning`, `4-implementation`, `ship`, `anytime`).
- **Required Gate:** A skill flagged with `required: true` in `bmad-help.csv` that must complete before advancing to subsequent phases.
- **Preceded-By / Followed-By:** The DAG dependency relationships that determine recommended sequencing between skills.
- **Persona / Agent:** An AI role profile with a specialized mindset, title, avatar, and system instructions (e.g., John the PM, Winston the Architect, Amelia the Developer, Murat the Test Architect).
- **Artifact:** A generated markdown, YAML, or HTML deliverable stored in `{output_folder}` (e.g., `prd.md`, `architecture.md`, `sprint-status.yaml`).
- **Memlog:** The chronological, append-only markdown log (`.memlog.md`) maintaining run state and key decisions across sessions.
- **Dashboard / Visualizer:** The interactive VS Code Webview panel displaying the visual DAG pipeline, sprint board, and quality metrics.
- **Lifecycle Tree:** The native VS Code Tree View located in the Activity Bar sidebar displaying phases, skills, and artifacts.

---

## 4. Features & Functional Requirements

### 4.1 Workspace Discovery & Configuration Engine
**Description:** On startup or folder open, the extension automatically inspects the workspace to determine if BMAD is installed, resolves configuration paths, reads module manifests, and tracks project settings. It watches `_bmad/` for configuration changes.

#### FR-1: BMAD Workspace Detection & Status Resolution
The extension can automatically detect whether the active workspace contains a valid BMAD installation by checking for `_bmad/_config/manifest.yaml` and `_bmad/_config/bmad-help.csv`.
- **Consequences (testable):**
  - When a workspace containing `_bmad/` is opened, the extension activates, initializes the BMAD Activity Bar view container, and registers the status bar item.
  - When opened in a folder without `_bmad/`, the extension remains idle or displays a lightweight welcome node: "No BMAD installation detected. Run BMAD setup or initialize project."
  - Changes to `_bmad/config.toml` or `_bmad/config.user.toml` trigger an automatic reload of the internal configuration cache within 500ms.

#### FR-2: Dynamic Configuration & Path Resolver
The extension can parse project settings (including `user_name`, `communication_language`, `planning_artifacts`, `implementation_artifacts`, `output_folder`) matching the output of `resolve_config.py`.
- **Consequences (testable):**
  - Resolves path variables like `{project-root}`, `{output_folder}`, `{planning_artifacts}`, and `{implementation_artifacts}` dynamically to absolute file paths on the user's operating system.
  - Gracefully falls back to default conventions if optional configs are omitted without throwing unhandled exceptions.

---

### 4.2 BMAD Lifecycle & Workflow Navigation Tree
**Description:** A native VS Code Tree View in the BMAD sidebar that maps the full progression of the project through BMAD phases. It categorizes skills into phases, badges them based on completion evidence, and highlights the recommended next step.

#### FR-3: Phase-Structured Workflow Tree
The extension can render a hierarchical tree view grouped by BMAD phases (`0-learning`, `1-discovery`, `2-planning`, `3-solutioning`, `4-implementation`, `ship`, `anytime`). Realizes UJ-1.
- **Consequences (testable):**
  - Each phase node displays an icon, phase name, and aggregated status (e.g., `Completed`, `In Progress`, `Pending`, `Blocked`).
  - Expanding a phase node reveals child skills registered for that phase in `bmad-help.csv`.
  - Skills marked `required: true` display an explicit "Required Gate" indicator or badge (`[!]` or lock icon).

#### FR-4: Artifact-Based Completion Detection
The extension can scan resolved `output-location` directories for matching `outputs` patterns to determine whether a skill has been started or completed. Realizes UJ-1.
- **Consequences (testable):**
  - If a file matching the skill's output exists (e.g., `prd.md`), the tree item shows a checkmark or progress indicator.
  - If frontmatter or content indicates a draft (e.g., `status: draft`), the node shows an "In Progress" badge; if `status: final`, it shows "Completed".
  - Hovering over a completed skill displays a tooltip with artifact paths, modification timestamp, and quick link to open the file.

#### FR-5: Inline Tree Actions
The extension can provide inline action buttons on tree items for executing skills, viewing outputs, and viewing documentation.
- **Consequences (testable):**
  - Clicking a skill's play button triggers `BMAD: Run Skill` with that skill pre-selected.
  - Clicking the document icon opens the resolved artifact in an editor tab.
  - Clicking the info icon opens the skill's `SKILL.md` or external doc URL (from `_meta` rows).

---

### 4.3 Agents & Personas Hub
**Description:** A dedicated sidebar tree view and quick-picker for all installed BMAD personas (John, Winston, Amelia, Sally, Murat, Mary, and CIS specialists), allowing developers to inspect persona profiles and dispatch instructions.

#### FR-6: Persona Gallery & Profile Inspection
The extension can list all installed agent personas discovered from the configuration and module manifests, displaying their icon, name, title, module, and team. Realizes UJ-1.
- **Consequences (testable):**
  - Renders avatars/emojis (e.g., 📋 John - Product Manager, 🏗️ Winston - System Architect, 💻 Amelia - Developer, 🧪 Murat - Test Architect).
  - Clicking a persona displays their detailed profile, core principles, and speaking style in a dedicated side panel or modal.

#### FR-7: One-Click Persona Activation & Prompt Dispatch
The extension can provide quick actions to activate or interact with any persona.
- **Consequences (testable):**
  - Provides a "Copy Agent Prompt" command that copies the persona's activation directive to the system clipboard.
  - Provides a "Start Terminal Session" action that launches an integrated terminal with the appropriate BMAD CLI call or environment.
  - Supports sending the prompt directly to open AI chat interfaces (VS Code Copilot Chat, Claude Code, or Antigravity) via registered extension URI/command hooks.

---

### 4.4 Interactive Webview Dashboard (Visualizer Cockpit)
**Description:** A full-featured, responsive Webview dashboard offering a rich graphical visualization of the project pipeline, an interactive Kanban sprint board, and deep telemetry.

#### FR-8: Interactive Pipeline DAG Visualizer
The extension can render an interactive directed acyclic graph (DAG) of the BMAD workflow in a VS Code Webview panel. Realizes UJ-1, UJ-2.
- **Consequences (testable):**
  - Displays nodes for each skill connected by edges representing `preceded-by` and `followed-by` relationships.
  - Highlights the current active stage and critical path.
  - Nodes reflect live status: Gray (Pending), Blue (In Progress), Green (Completed), Yellow (Action Required), Red (Gate Blocked).
  - Clicking any node opens a slide-out drawer showing skill description, arguments, inputs, outputs, and action buttons.

#### FR-9: Interactive Sprint Kanban Board
The extension can parse `{implementation_artifacts}/sprint-status.yaml` and render an interactive Kanban board within the Webview dashboard. Realizes UJ-2.
- **Consequences (testable):**
  - Renders columns for story statuses: `Backlog`, `Ready for Dev`, `In Progress`, `Review`, `Done`.
  - Cards represent epics and stories with story IDs (e.g., `1-1-user-auth`), title, and assigned status.
  - Displays retrospective action items in a dedicated collapsible tray with owner and status badges (`open`, `in-progress`, `done`).
  - Supports quick filtering by Epic, assignee/owner, or status.
  - Clicking a card opens the underlying story specification file directly in the editor.

#### FR-10: Real-Time Live Sync & File Watcher
The Webview dashboard can automatically refresh its state in real time whenever underlying files in `_bmad/` or `_bmad-output/` change on disk. Realizes UJ-2.
- **Consequences (testable):**
  - Modifications to `sprint-status.yaml` update the Kanban board within 300ms without flickering or losing scroll/selection state.
  - New artifacts written to `planning-artifacts` or `implementation-artifacts` instantly update the Pipeline DAG node colors.

---

### 4.5 Artifact Explorer & Inspector
**Description:** A dedicated view for browsing, inspecting, and validating artifacts generated by BMAD workflows across the project lifecycle.

#### FR-11: Categorized Artifact Explorer
The extension can present a tree view grouping all project deliverables into clean folders: Planning Artifacts (PRDs, Briefs, UX Specs), Architecture, Implementation (Sprint Plans, Walkthroughs, Stories), Tests (Test Designs, Scaffolds, Traceability), and Memory Logs (`.memlog.md`). Realizes UJ-1, UJ-3.
- **Consequences (testable):**
  - Tree items link directly to files; clicking opens the file in the editor.
  - Displays file size, last modified timestamp, and validation status badges.

#### FR-12: Memlog Chronology Viewer
The extension can parse `.memlog.md` files from active run workspaces and display an interactive, filterable chronological timeline of decisions, assumptions, events, and insights. Realizes UJ-1, UJ-2.
- **Consequences (testable):**
  - Displays entries with color-coded tags: `(decision)`, `(assumption)`, `(insight)`, `(event)`, `(override)`.
  - Allows searching and filtering by entry type or author.

#### FR-13: PRD & Specification Rubric Validator
The extension can trigger or display results of the BMAD validation rubrics (e.g. against `prd-validation-checklist.md` or review lenses).
- **Consequences (testable):**
  - Displays gate evaluation summaries (`PASS`, `CONCERNS`, `FAIL`) and review findings categorized by severity (`Critical`, `High`, `Medium`, `Low`).

---

### 4.6 TEA (Test Architecture Enterprise) Quality & Traceability View
**Description:** A specialized view tailored to the `tea` module, supporting Murat's testing discipline.

#### FR-14: Traceability Matrix & Quality Gate Dashboard
The extension can display test coverage traceability mapping requirements (FRs from PRD) to test scaffolds and test execution results. Realizes UJ-3.
- **Consequences (testable):**
  - Highlights unmapped requirements that lack test coverage.
  - Displays the 0-100 quality score from `test-review` reports.
  - Displays ATDD scaffold checklist progress.

---

### 4.7 Status Bar, Command Palette & Developer Helpers

#### FR-15: Persistent Status Bar Indicator
The extension can register a persistent VS Code Status Bar item indicating current BMAD phase, active story/task, and next recommended action. Realizes UJ-1.
- **Consequences (testable):**
  - Displays text such as `$(sparkle) BMAD: 2-Planning (PRD) $(chevron-right)` or `$(gear~spin) BMAD: Story 1-2 (In Progress)`.
  - Clicking the status bar item opens a QuickPick menu with quick actions: "Open Dashboard", "Run Next Recommended Skill", "Show Sprint Status", "Select Agent".

#### FR-16: Comprehensive Command Palette Registry
The extension can contribute commands to the VS Code Command Palette:
- `BMAD: Open Visualizer Dashboard`
- `BMAD: Run Skill...` (interactive fuzzy search with parameter prompts)
- `BMAD: Talk to Agent / Switch Persona...`
- `BMAD: Show Sprint Status & Progress`
- `BMAD: Validate Current Artifact`
- `BMAD: Refresh Workspace State`
- `BMAD: Edit Configuration`

---

## 5. Non-Goals (Explicit for v1)

- **Not an LLM Execution Engine:** The extension itself will not bundle an internal proprietary LLM runtime. It acts as the visualizer, orchestrator, and helper for the agents operating in the workspace (via terminal, Copilot Chat, Claude Code, or Antigravity).
- **Not a Git/VCS Replacement:** Version control operations (git commits, branches, PR merges) remain the responsibility of git or specialized git extensions. The extension visualizes sprint status and walkthroughs but does not re-implement git clients.
- **Not a Multi-Project Aggregator in v1:** Focuses on the current active workspace; managing a portfolio of 50 disconnected BMAD repositories in a single dashboard is out of scope for v1.
- **No Cloud-Hosted Backend Dependency:** The extension operates 100% locally and offline by reading files within the user's workspace filesystem.

---

## 6. MVP Scope

### 6.1 In Scope (v1 MVP)
1. **Workspace Detection & Configuration Engine:** Detection of `_bmad/`, parsing of `manifest.yaml`, `bmad-help.csv`, `config.yaml`, and path resolution.
2. **Activity Bar & Sidebar Views:**
   - **BMAD Lifecycle View:** Phase-grouped tree with completion badges and run actions.
   - **BMAD Agents View:** Persona gallery with profiles and prompt-copy/terminal launch.
   - **BMAD Artifacts View:** Categorized explorer for planning, implementation, and test files.
3. **Webview Dashboard:**
   - Visual Workflow Pipeline DAG showing phase progression and skill nodes.
   - Interactive Sprint Kanban Board reading `sprint-status.yaml`.
4. **Status Bar Item & QuickPick Helpers:**
   - Dynamic status bar displaying phase and next step.
   - `BMAD: Run Skill` and `BMAD: Talk to Agent` QuickPick menus.
5. **Real-Time File Watcher:** Reactive auto-refresh on `_bmad-output/` and `_bmad/` changes.
6. **Memlog Timeline Inspector:** Basic visual rendering of `.memlog.md`.

### 6.2 Out of Scope for MVP (Deferred to v2)
- **Visual Drag-and-Drop Skill Workflow Authoring:** Visual canvas to compose new custom BMAD workflows visually (deferred to v2; BMB module handles this via CLI for now).
- **Embedded Webview Terminal Emulator:** In v1, the extension delegates execution to VS Code's native `vscode.window.createTerminal()`.
- **Full Traceability Graph Rendering:** Interactive 3D/Canvas node graph connecting PRD -> Epic -> Story -> Code -> Test (v1 provides table/list view).
- **Direct Bi-Directional Cloud Sync:** Direct sync to Jira / Confluence / Notion (v1 focuses on local workspace files).

---

## 7. Success Metrics & Counter-Metrics

### 7.1 Success Metrics
- **Onboarding Time to First Skill:** A developer opening a BMAD repo can locate their current phase and trigger the next recommended skill within **< 30 seconds**.
- **Status Discovery Speed:** Time required to ascertain sprint and story status reduced by **> 75%** compared to manual file inspection.
- **UI Responsiveness:** Tree Views and Dashboard load in **< 300ms**; file changes on disk reflect in the Webview in **< 500ms**.
- **Zero Configuration Friction:** 100% zero-config initialization for standard BMAD repository layouts.

### 7.2 Counter-Metrics
- **Extension Host Overhead:** Memory footprint must stay **< 35MB**; CPU idle utilization **< 0.1%** to avoid slowing down VS Code.
- **No UI Lockups:** Zero synchronous file I/O operations blocking the extension host thread.

---

## 8. Non-Functional Requirements (NFRs)

- **NFR-1 (Performance & Lightweight Host):** All file operations (`fs.watch`, reads) must be asynchronous. Tree views must implement lazy loading (`getChildren` on expand).
- **NFR-2 (Content Security Policy):** All Webview dashboards must enforce a strict CSP (`default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-...'; style-src vscode-resource: 'unsafe-inline';`).
- **NFR-3 (Native Theming & High Contrast):** The Webview must inherit native VS Code theme variables (`--vscode-editor-background`, `--vscode-foreground`, etc.) and support High Contrast mode.
- **NFR-4 (Robust Error Handling & Fault Tolerance):** Malformed YAML in `sprint-status.yaml` or missing CSV rows in `bmad-help.csv` must produce clear warning banners and graceful fallbacks, never crashing the extension host.
- **NFR-5 (Cross-Platform Compatibility):** Fully compatible with Linux, macOS, and Windows path separators.

---

## 9. Technical Architecture Spine & Extension Model

```
+--------------------------------------------------------------------------+
|                            VS Code IDE                                    |
+--------------------------------------------------------------------------+
|  [ Activity Bar ]     [ Status Bar ]             [ Editor / Webview ]    |
|  - Lifecycle Tree     - Current Phase            - Visual Pipeline DAG   |
|  - Agents Hub         - Next Skill Action        - Sprint Kanban Board   |
|  - Artifacts Tree                                - Memlog Viewer         |
|  - Sprint Tree                                   - Artifact Split View   |
+------------------------------------+-------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                    BMAD VS Code Extension Core Host                      |
+--------------------------------------------------------------------------+
|  - WorkspaceScanner & ConfigManager (resolves _bmad configs & manifests) |
|  - StateEngine & CompletionDetector (inspects outputs, detects status)   |
|  - WebviewMessageBridge (request/response JSON-RPC with Webviews)        |
|  - FileSystemWatcher (chokidar / vscode.workspace.createFileSystemWatcher|
|  - CommandDispatcher & TerminalLauncher (CLI skill invocation)           |
+------------------------------------+-------------------------------------+
                                     | Reads & Watches
                                     v
+--------------------------------------------------------------------------+
|                     Local Workspace Filesystem                           |
+--------------------------------------------------------------------------+
|  _bmad/                    _bmad-output/                 docs/           |
|  ├── _config/              ├── planning-artifacts/       └── stories/    |
|  │   ├── bmad-help.csv     ├── implementation-artifacts/                 |
|  │   └── manifest.yaml     │   └── sprint-status.yaml                    |
|  ├── config.toml           ├── test-artifacts/                           |
|  └── [modules]/            └── specs/                                    |
+--------------------------------------------------------------------------+
```

### Key Components:
1. **`WorkspaceScanner`**: Scans and parses `_bmad/_config/manifest.yaml`, `bmad-help.csv`, and `config.toml`.
2. **`CompletionDetector`**: Evaluates `output-location` patterns against the filesystem to calculate progress.
3. **`TreeDataProviders`**: 4 modular providers (`WorkflowTreeProvider`, `AgentsTreeProvider`, `ArtifactsTreeProvider`, `SprintTreeProvider`).
4. **`DashboardWebviewProvider`**: Webview panel manager compiling lightweight React/Preact or Vanilla JS bundles with VS Code Toolkit styling.
5. **`FileSystemWatcher`**: Debounced watcher triggering incremental state updates when agents modify artifacts.
6. **`TerminalExecutor`**: Dispatches CLI commands into dedicated VS Code integrated terminal instances.
