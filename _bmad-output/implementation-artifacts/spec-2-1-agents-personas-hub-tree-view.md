---
title: 'Story 2.1: Agents & Personas Hub Tree View'
type: 'feature'
created: '2026-09-18'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/implementation-artifacts/spec-1-4-inline-tree-actions-status-bar-indicator.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The BMAD framework provides 12+ specialized AI personas (John the PM, Winston the Architect, Amelia the Dev, Murat the Test Architect, Carson the Brainstorming Coach, etc.) configured in `_bmad/config.toml`, but developers currently have no way to visually browse their specialties, principles, or roles inside VS Code.

**Approach:** Implement `AgentsTreeProvider` (registered as `bmad.views.agents`) with domain categorization (e.g. Software Development, Creative Intelligence, Quality Architecture), agent profile inspection (showing icons, names, titles, and voice descriptions), and single-click execution dispatch to chat or switch personas.

## Boundaries & Constraints

**Always:**
- Parse agent configurations from `_bmad/config.toml` (and `_bmad/custom/config.toml`) using the pure domain layer in `src/core/agent-parser.ts` (Hexagonal Architecture / AR-2).
- Render personas with their dedicated Unicode/emoji icons (e.g., 📊 Mary, 📋 John, 🎨 Sally, 🏗️ Winston, 💻 Amelia, 🧪 Murat).
- Group agents logically by team/domain (`software-development`, `creative`, etc.).
- Allow clicking an agent to display their voice/guidelines in an informational panel or modal.

**Never:**
- Never hardcode agent lists; always read dynamically from project TOML configurations so custom agents and overrides are automatically displayed.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Standard Config** | `_bmad/config.toml` with `[agents.*]` entries | Tree groups agents by `team`; each agent node shows icon, name, title | Graceful parsing |
| **Custom Overrides** | `_bmad/custom/config.toml` contains customized agents | Overrides merged with installer defaults; custom personas surfaced | Dynamic overlay |
| **Missing Agents** | No `[agents]` section in TOML | Empty tree with friendly welcome message | Safe fallback |
| **Agent Selected** | User clicks agent node | QuickPick or Information modal shows title, icon, and voice persona description | Clean UI presentation |

</frozen-after-approval>

## Code Map

- `src/core/types.ts` -- Define `BmadAgentNode` and `BmadAgentTeam`
- `src/core/agent-parser.ts` -- Pure domain parser for agent definitions from TOML
- `src/adapters/agents-tree-provider.ts` -- VS Code `TreeDataProvider` for `bmad.views.agents`
- `src/extension.ts` -- Register `bmad.views.agents` TreeDataProvider and persona inspector commands
- `test/agent-parser.test.ts` -- Unit tests for agent parsing, team grouping, and override handling

## Tasks & Acceptance

**Execution:**
- [ ] `src/core/types.ts` -- Define agent and team data structures
- [ ] `src/core/agent-parser.ts` -- Implement TOML parsing and team grouping
- [ ] `src/adapters/agents-tree-provider.ts` -- Implement `vscode.TreeDataProvider` for agents view
- [ ] `src/extension.ts` -- Register tree provider and inspector/talk commands
- [ ] `test/agent-parser.test.ts` -- Unit tests for agent parsing and grouping

**Acceptance Criteria:**
- Given an active BMAD workspace, the "Agents & Personas" tree view displays all configured agents grouped by team.
- Clicking an agent displays their details, icon, role title, and voice description.
- All unit tests pass and extension builds cleanly.

## Implementation Notes

## Spec Change Log

## Review Triage Log
