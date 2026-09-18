# Addendum: BMAD VS Code Extension Technical Deep Dive & Mappings

This addendum preserves technical depth, option matrices, and comprehensive mapping specifications for downstream architecture (`bmad-architecture`), UX design (`bmad-ux`), and implementation stories (`bmad-build`).

---

## 1. Comprehensive BMAD Skill to VS Code Mapping Matrix

Below is the mapping of BMAD skills and modules to VS Code UI locations, commands, and visualizer representations:

| Module | Skill Identifier | Menu Code | Phase | Primary VS Code UI Touchpoint | Command / Action | Output Detection Pattern |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BMM** | `bmad-product-brief` | `CB` | `1-discovery` | Lifecycle Tree & QuickPick | `BMAD: Create Product Brief` | `_bmad-output/planning-artifacts/brief*.md` |
| **BMM** | `bmad-prfaq` | `WB` | `1-discovery` | Lifecycle Tree & QuickPick | `BMAD: PRFAQ Challenge` | `_bmad-output/planning-artifacts/prfaq*.md` |
| **BMM** | `bmad-prd` | `PRD` | `2-planning` | Lifecycle Tree + Split Preview | `BMAD: Create/Edit PRD` | `_bmad-output/planning-artifacts/prds/**/prd.md` |
| **BMM** | `bmad-ux` | `CU` | `2-planning` | Lifecycle Tree + Split Preview | `BMAD: Create UX Design` | `_bmad-output/planning-artifacts/ux/**` |
| **BMM** | `bmad-architecture` | `CA` | `3-solutioning`| Lifecycle Tree + Architecture Panel| `BMAD: Create Architecture` | `_bmad-output/planning-artifacts/architecture*.md` |
| **BMM** | `bmad-create-epics-and-stories`| `CE` | `3-solutioning`| Sprint Tree & Lifecycle Tree | `BMAD: Create Epics & Stories` | `docs/stories/**` or `_bmad-output/planning-artifacts/epics*` |
| **BMM** | `bmad-sprint-planning` | `SP`/`SS`| `4-implementation` | Kanban Board & Status Bar | `BMAD: Sprint Planning / Status` | `_bmad-output/implementation-artifacts/sprint-status.yaml` |
| **BMM** | `bmad-build` | `BD` | `ship` | Kanban Card Action & Terminal | `BMAD: Build Story` | Implementation artifacts & diffs |
| **BMM** | `bmad-code-review` | `CR` | `ship` | Source Control / Review Panel | `BMAD: Run Code Review` | Review findings JSON/MD |
| **BMM** | `bmad-walkthrough` | `WT` | `ship` | Editor Webview / Diff View | `BMAD: Guided Walkthrough` | Walkthrough report MD |
| **BMM** | `bmad-retrospective` | `ER` | `ship` | Kanban Retro Column / Action Tray| `BMAD: Epic Retrospective` | Retrospective MD in implementation artifacts |
| **TEA** | `bmad-teach-me-testing` | `TMT` | `0-learning` | Education View / Webview Tutorial | `BMAD: Teach Me Testing` | `_bmad-output/test-artifacts/tea-academy/**` |
| **TEA** | `bmad-testarch-test-design` | `TD` | `3-solutioning`| TEA Quality Tree | `BMAD: Risk-Based Test Plan` | `_bmad-output/test-artifacts/test-design/**` |
| **TEA** | `bmad-testarch-framework` | `TF` | `3-solutioning`| TEA Quality Tree | `BMAD: Init Test Framework` | Test framework scaffold |
| **TEA** | `bmad-testarch-ci` | `CI` | `3-solutioning`| TEA Quality Tree | `BMAD: Setup CI Quality Gates` | `.github/workflows/**` |
| **TEA** | `bmad-testarch-atdd` | `AT` | `4-implementation`| Test Matrix & Story Card Action | `BMAD: Generate ATDD Scaffolds` | Acceptance test files & checklists |
| **TEA** | `bmad-testarch-automate` | `TA` | `4-implementation`| Test Matrix | `BMAD: Expand Test Automation` | Automated test suites |
| **TEA** | `bmad-testarch-test-review` | `RV` | `4-implementation`| Quality Score Badge in Status Bar| `BMAD: Test Review & Audit` | `_bmad-output/test-artifacts/test-reviews/**` |
| **TEA** | `bmad-testarch-trace` | `TR` | `4-implementation`| Traceability Matrix Webview | `BMAD: View Traceability Matrix`| `_bmad-output/test-artifacts/traceability/**` |
| **Core** | `bmad-help` | `BH` | `anytime` | Status Bar / Command Palette | `BMAD: Help & Next Step` | Help recommendation popups |
| **Core** | `bmad-party-mode` | `PM` | `anytime` | Agents Hub Header Action | `BMAD: Launch Party Mode` | Multi-agent discussion session |
| **Core** | `bmad-customize` | `BC` | `anytime` | Settings / Customization Editor | `BMAD: Customize BMad` | `_bmad/custom/**` |
| **Core** | `bmad-deep-recon` | `RS` | `anytime` | QuickPick Research Mode | `BMAD: Deep Recon Research` | `_bmad-output/planning-artifacts/research/**` |
| **Loop** | `bmad-loop-sweep` | `ST` | `anytime` | Loop Monitor Webview | `BMAD: Loop Triage Sweep` | `result.json` |

---

## 2. VS Code Extension Manifest (`package.json`) Contribution Specifications

### 2.1 View Containers & Views
```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "bmad-explorer",
          "title": "BMAD Method",
          "icon": "media/icons/bmad-icon.svg"
        }
      ]
    },
    "views": {
      "bmad-explorer": [
        {
          "id": "bmad.views.lifecycle",
          "name": "Lifecycle & Workflows",
          "contextualTitle": "BMAD Lifecycle",
          "visibility": "visible"
        },
        {
          "id": "bmad.views.sprint",
          "name": "Sprint & Stories",
          "contextualTitle": "Sprint Progress",
          "visibility": "visible"
        },
        {
          "id": "bmad.views.agents",
          "name": "Agents & Personas",
          "contextualTitle": "Agent Team",
          "visibility": "visible"
        },
        {
          "id": "bmad.views.artifacts",
          "name": "Artifacts Explorer",
          "contextualTitle": "Artifacts",
          "visibility": "collapsed"
        },
        {
          "id": "bmad.views.tea",
          "name": "TEA Quality & Traceability",
          "contextualTitle": "Quality Assurance",
          "visibility": "collapsed"
        }
      ]
    }
  }
}
```

### 2.2 Extension Settings (`configuration`)
```json
{
  "contributes": {
    "configuration": {
      "title": "BMAD Extension",
      "properties": {
        "bmad.autoDetectWorkspace": {
          "type": "boolean",
          "default": true,
          "description": "Automatically detect BMAD installation in workspace."
        },
        "bmad.cliRunner": {
          "type": "string",
          "enum": ["terminal", "clipboard", "copilot-chat", "custom"],
          "default": "terminal",
          "description": "Preferred execution dispatch target for BMAD skills."
        },
        "bmad.refreshIntervalMs": {
          "type": "number",
          "default": 1000,
          "description": "Debounce interval for file system watcher refresh."
        },
        "bmad.showStatusBarItem": {
          "type": "boolean",
          "default": true,
          "description": "Display BMAD Phase status in the VS Code Status Bar."
        }
      }
    }
  }
}
```

---

## 3. Webview Communication Protocol (JSON-RPC)

All communication between the Extension Host and the Webview Dashboard follows standard asynchronous JSON message envelopes:

### 3.1 Messages: Webview -> Extension Host
```typescript
interface WebviewRequest<T = any> {
  command: 
    | 'getProjectState'        // Fetch full lifecycle state and artifacts
    | 'getSprintStatus'        // Fetch parsed sprint-status.yaml
    | 'runSkill'               // Request skill execution
    | 'openArtifact'           // Request opening file in editor
    | 'filterBoard';           // Update board filters
  payload: T;
  requestId: string;
}
```

### 3.2 Messages: Extension Host -> Webview
```typescript
interface ExtensionResponse<T = any> {
  type: 'response' | 'event';
  requestId?: string;          // Echoed for requests
  event?: 'stateChanged' | 'fileUpdated' | 'sprintUpdated';
  data: T;
  error?: string;
}
```

---

## 4. Architectural Alternatives Evaluated

| Architecture Option | Advantages | Disadvantages | Decision & Rationale |
| :--- | :--- | :--- | :--- |
| **Pure Tree View Only (No Webviews)** | Extremely lightweight; uses 100% native VS Code API; zero HTML/CSS overhead. | Cannot render interactive visual DAG pipelines or drag-and-drop Kanban boards; poor UX for visualizers. | **Rejected.** Fails the core requirement of being a "visualizer" for the BMAD method. |
| **Full Webview-Only (Single Big Panel)** | Maximum UI flexibility; can look like any web app. | Disconnected from VS Code sidebar conventions; heavy memory footprint; slower startup. | **Rejected.** Doesn't feel like a native IDE extension. |
| **Hybrid (Native Sidebar Trees + Targeted Webview Dashboard)** | Best of both worlds: Instant sidebar navigation and status, plus rich interactive Webview for DAG and Kanban. | Requires building both Tree Data Providers and Webview communication bridges. | **Accepted.** Delivers native IDE feel with powerful visual capabilities. |
