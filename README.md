# BMAD Visualizer & Helper for VS Code

**VS Code Extension** | **BMAD Method v6.12.0** | **TypeScript 5.4** | **Preact** | **MIT License**

An interactive native Visual Studio Code extension that acts as a visualizer, cockpit, and execution helper for the **BMad Method (BMAD)** multi-agent development framework.

---

## 🌟 Overview

The **BMad Method** brings unmatched software engineering rigor to AI pair programming and autonomous agent teams through structured discovery, planning, test architecture, and verifiable sprint execution. 

The **BMAD Visualizer & Helper** brings that workflow out of raw terminal logs and YAML files into a first-class IDE visual operating environment. Developers and tech leads can instantly see where they are in the project lifecycle, track sprint progression on a live Kanban board, explore artifacts, and dispatch skills or personas with a single click.

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
|  - FileSystemWatcher (debounced reactive watcher on _bmad-output/)       |
|  - CommandDispatcher & TerminalLauncher (CLI skill invocation)           |
+--------------------------------------------------------------------------+
```

---

## 🚀 Key Features

### 1. 🧭 Lifecycle & Workflows Sidebar Tree
- **Phase Breakdown:** Grouped by BMAD phases (`0-learning`, `1-discovery`, `2-planning`, `3-solutioning`, `4-implementation`, `ship`, `anytime`).
- **Completion Detection:** Automatically scans `_bmad-output/` to badge completed deliverables with green checkmarks or blue draft indicators.
- **Required Gates:** Highlights mandatory gates (e.g. PRD, Architecture, Sprint Planning) with clear required badges before implementation proceeds.
- **Inline Actions:** One-click buttons on tree items to run skills, open artifacts, or view documentation.

### 2. 👥 Agents & Personas Hub
- **Team Directory:** Visual list of installed BMAD personas:
  - 📋 **John** (Product Manager)
  - 🏗️ **Winston** (System Architect)
  - 💻 **Amelia** (Senior Software Engineer / Developer)
  - 🧪 **Murat** (Test Architect & Quality Advisor)
  - 🎨 **Sally** (UX Designer)
  - 📊 **Mary** (Business Analyst)
  - 🧠 **CIS Specialists** (Carson, Maya, Dr. Quinn, Victor, Caravaggio, Sophia)
- **Execution Helper:** One-click action to open a dedicated integrated terminal session or copy prompt directives for your assistant of choice.

### 3. 📊 Interactive Webview Dashboard (The Cockpit)
- **Pipeline DAG Visualizer:** Interactive node graph rendering the BMAD workflow pipeline with live status coloring (Pending, In Progress, Completed, Blocked) and dependency edges.
- **Live Sprint Kanban Board:** Drag-and-drop / column-based board parsing `_bmad-output/implementation-artifacts/sprint-status.yaml` into *Backlog*, *Ready for Dev*, *In Progress*, *Review*, and *Done*.
- **Retrospective Action Tray:** Visual tracker for action items committed during sprint retrospectives.
- **Real-Time Synchronization:** Debounced file watcher (300ms) that pushes live disk updates to the dashboard without flickering or page reloads.

### 4. 📁 Artifacts Explorer & Governance
- **Categorized Explorer:** Grouped access to Planning Artifacts (PRDs, Briefs, UX specs), Architecture Spines, Implementation Files, and Test Designs.
- **Memlog Timeline Inspector:** Chronological visualization of `.memlog.md` decisions, assumptions, insights, and events.
- **TEA Quality & Traceability Dashboard:** Displays test quality audit scores (0-100), ATDD scaffold progress, and requirements-to-test traceability.

### 5. ⚡ Status Bar & Command Palette
- **Persistent Status Bar:** Real-time indicator displaying the current phase (e.g., `$(sparkle) BMAD: 2-Planning (PRD Final) $(arrow-right)`).
- **Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):**
  - `BMAD: Open Visualizer Dashboard`
  - `BMAD: Run Skill...` (Fuzzy QuickPick menu of 50+ skills)
  - `BMAD: Talk to Agent / Switch Persona...`
  - `BMAD: Show Sprint Status`
  - `BMAD: Validate Current Artifact`

---

## 🏛️ Architecture & Tech Stack

The extension is designed around a **Hexagonal (Ports and Adapters)** architecture:
- **Core Domain Layer (`src/core/`):** Pure TypeScript. Zero dependencies on VS Code APIs, making business logic (state engine, YAML/CSV parsers, gate evaluators) 100% unit testable in Node.
- **Extension Host Adapters (`src/adapters/`):** Tree Data Providers, Debounced File Watcher, Terminal Dispatcher, and JSON-RPC Bridge.
- **Webview UI Layer (`src/webview/`):** Built with **Preact + Vite**, rendering native VS Code CSS variables (`var(--vscode-*)`) with strict Content Security Policy (CSP).

---

## 🗺️ Implementation Roadmap (Epics)

- [ ] **Epic 1: Workspace Onboarding & Project Orientation**
  - Scaffolding, configuration resolver, lifecycle tree view, and status bar indicator.
- [ ] **Epic 2: Agent Team Collaboration & Execution Dispatch**
  - Agents hub sidebar, terminal dispatcher, and Command Palette shortcuts.
- [ ] **Epic 3: Artifact Inspection & Governance Hub**
  - Categorized artifact explorer, `.memlog.md` timeline viewer, and TEA quality gate dashboard.
- [ ] **Epic 4: Visual Cockpit & Sprint Kanban Management**
  - Webview dashboard, interactive Pipeline DAG, and live Sprint Kanban board.

---

## 🌿 Repository Branch Structure

- **`main`**: Production extension codebase, documentation, and build scripts.
- **`bmad-setup`**: Complete BMAD Method artifacts, configurations (`_bmad/`), planning deliverables (`_bmad-output/`), PRDs, Architecture Spines, and Epics.

---

## 🛠️ Development Setup

### Prerequisites
- Node.js `>= 18.0.0`
- npm or pnpm
- Visual Studio Code `>= 1.85.0`

### Quick Start
```bash
# Clone the repository
git clone https://github.com/neroIJN/BMADExtention.git
cd BMADExtention

# Install dependencies
npm install

# Compile extension & webview bundle
npm run build

# Launch Extension Development Host
Press F5 in VS Code
```

### Marketplace Packaging Verification
Run these commands before publishing to validate the same package gates used by CI:

```bash
# Build + validate metadata, dist output, and package allowlist
npm run package:check

# Create a VSIX with the production package layout
npm run package

# Validate and inspect the exact VSIX archive that will be published
npm run package:check:vsix -- ./bmad-method-visualizer-0.1.2.vsix
unzip -l ./bmad-method-visualizer-0.1.2.vsix
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
