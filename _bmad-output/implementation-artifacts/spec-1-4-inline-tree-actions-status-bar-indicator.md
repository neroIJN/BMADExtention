---
title: 'Story 1.4: Inline Tree Actions & Status Bar Indicator'
type: 'feature'
created: '2026-09-18'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - '_bmad-output/implementation-artifacts/spec-1-3-bmad-lifecycle-workflow-tree-completion-detector.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Developers need real-time awareness of their active BMAD lifecycle phase directly while writing code, without having to keep the sidebar permanently expanded, and want single-click execution or navigation for recommended next steps.

**Approach:** Implement a persistent VS Code Status Bar indicator (`$(sparkle) BMAD: [Phase]`) reflecting active lifecycle state, clicking which opens a QuickPick menu of recommended next skills; configure inline tree view actions on skill nodes to execute skills or open artifacts with a single click.

## Boundaries & Constraints

**Always:**
- Keep status determination pure in domain core (`src/core/lifecycle-parser.ts` or `src/core/status-evaluator.ts`).
- Update the Status Bar item dynamically when workspace status changes.
- Provide clear tooltips and QuickPick items with keyboard navigation.
- Configure inline view actions in `package.json` under `menus/view/item/context`.

**Never:**
- Never block extension responsiveness on status bar updates.
- Never show intrusive popups on phase changes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **BMAD Active** | Valid BMAD workspace detected | Status bar displays `$(sparkle) BMAD: Phase 2 (Planning)` | Graceful fallback |
| **No Project** | Non-BMAD workspace | Status bar item remains hidden | Clean conditional display |
| **Click Status Bar** | User clicks status bar item | QuickPick menu opens listing next recommended skills | Fast non-blocking UI |
| **Inline Tree Run** | User clicks play/run inline icon on tree item | Executes `bmad.runSkill` with pre-selected skill | Clear dispatch |

</frozen-after-approval>

## Code Map

- `src/core/status-evaluator.ts` -- Domain function to calculate active phase and next recommended skills
- `src/adapters/status-bar-manager.ts` -- VS Code Status Bar item controller and QuickPick launcher
- `src/extension.ts` -- Initialize status bar manager and wire inline tree commands
- `package.json` -- Contributes inline view item buttons (`view/item/context`)
- `test/status-evaluator.test.ts` -- Unit tests for active phase and recommendation calculation

## Tasks & Acceptance

**Execution:**
- [ ] `src/core/status-evaluator.ts` -- Implement phase status and next-skill recommendation logic
- [ ] `src/adapters/status-bar-manager.ts` -- Implement persistent status bar indicator and QuickPick selector
- [ ] `package.json` -- Add inline tree item actions for running skills and opening artifacts
- [ ] `src/extension.ts` -- Register status bar manager and wire inline commands
- [ ] `test/status-evaluator.test.ts` -- Unit tests for status calculation

**Acceptance Criteria:**
- Given an active BMAD workspace, the Status Bar item shows the current lifecycle phase.
- Clicking the Status Bar item displays a QuickPick menu of recommended skills.
- Skill items in the sidebar have inline action buttons.
- All unit tests pass and extension builds cleanly.

## Implementation Notes

## Spec Change Log

## Review Triage Log
