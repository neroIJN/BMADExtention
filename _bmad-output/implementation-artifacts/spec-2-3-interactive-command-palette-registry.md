---
title: 'Story 2.3: Interactive Command Palette Registry'
type: 'feature'
created: '2026-09-18'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/implementation-artifacts/spec-2-2-terminal-clipboard-execution-dispatcher.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Keyboard-first power users prefer using the VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) to quickly fuzzy-search skills, personas, and workflows rather than navigating nested sidebar tree views.

**Approach:** Complete the command palette contribution registry in `package.json` and implement fuzzy-searchable QuickPicks for:
1. `BMAD: Run Skill...` (lists all 50+ skills across modules with menu codes, phase tags, and output previews).
2. `BMAD: Talk to Agent / Switch Persona...` (lists all personas with emojis, titles, and teams).
3. `BMAD: Refresh Workspace & Manifests` (refreshes detector, configs, lifecycle tree, and agent hub).
4. `BMAD: Check Project Status & Recommendations` (surfaces active phase and next actions).

## Boundaries & Constraints

**Always:**
- Ensure all commands are registered in `package.json` under `contributes/commands` with category `"BMAD"`.
- Support fuzzy searching on display names, menu codes (e.g. `PRD`, `BD`, `CA`), and module names.
- Delegate actual execution to `ExecutionDispatcher` (Story 2.2).

**Never:**
- Never block Command Palette rendering; load skill lists lazily or from in-memory cache.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Fuzzy Search Skill** | User types `BMAD: Run Skill` -> `PRD` | QuickPick highlights `[PRD] Create Edit and Review PRD` | Filtered cleanly |
| **Fuzzy Search Persona** | User types `BMAD: Talk` -> `Winston` | QuickPick highlights `🏗️ Winston — System Architect` | Filtered cleanly |
| **Refresh Command** | User executes `BMAD: Refresh Workspace` | Re-reads manifest, configs, trees, and status bar | Toast notification on complete |
| **No Project Open** | Workspace without `_bmad/` | Explains no BMAD project detected with setup guidance | Non-blocking |

</frozen-after-approval>

## Code Map

- `src/adapters/command-palette-manager.ts` -- Controller for comprehensive QuickPick registries
- `src/extension.ts` -- Register all command palette handlers
- `package.json` -- Full contributes command palette registry
- `test/command-palette.test.ts` -- Unit tests verifying command registration and QuickPick item construction

## Tasks & Acceptance

**Execution:**
- [ ] `src/adapters/command-palette-manager.ts` -- Implement skill selector QuickPick with menu codes and phase groupings
- [ ] `package.json` -- Register `bmad.refreshWorkspace` and all command palette contributions
- [ ] `src/extension.ts` -- Wire CommandPaletteManager to execution dispatcher and tree providers
- [ ] `test/command-palette.test.ts` -- Unit tests for palette items and fuzzy filtering

**Acceptance Criteria:**
- All BMAD commands appear under category "BMAD" in Command Palette.
- Run Skill QuickPick allows fuzzy searching across all 50+ installed skills.
- All unit tests pass and extension builds cleanly.

## Implementation Notes

## Spec Change Log

## Review Triage Log
