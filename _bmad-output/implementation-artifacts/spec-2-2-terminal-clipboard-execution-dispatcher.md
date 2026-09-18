---
title: 'Story 2.2: Terminal & Clipboard Execution Dispatcher'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/implementation-artifacts/spec-2-1-agents-personas-hub-tree-view.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Developers trigger BMAD skills using specific CLI conventions (`agy bmad-prd`, `npx bmad-build`, or `/bmad-build`). When switching between terminal windows or copying prompts into AI web chat tools (Claude, ChatGPT, etc.), manual retyping leads to syntax mistakes.

**Approach:** Implement `ExecutionDispatcher` in `src/adapters/execution-dispatcher.ts` adhering to Binding Decision AD-4:
1. When `bmad.cliRunner` is `'terminal'`, reuse/create a dedicated named VS Code terminal (`"BMAD Agent"`), bring it to focus, and send the formatted CLI command.
2. When `bmad.cliRunner` is `'clipboard'` (or when terminal creation fails as fallback), copy the invocation prompt directly to the OS clipboard (`vscode.env.clipboard.writeText`) and show a toast confirmation.

## Boundaries & Constraints

**Always:**
- Keep command formatting pure and cross-platform in domain core (`src/core/command-formatter.ts`).
- Reuse existing terminal named `"BMAD Agent"` without spawning duplicate terminal tabs on every run.
- Provide clipboard fallback when running headless or if terminal creation fails.
- Respect the `bmad.cliRunner` user configuration setting (`terminal` | `clipboard`).

**Never:**
- Never execute destructive or unconfirmed commands automatically without user intention.
- Never spawn unbounded numbers of terminal tabs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Terminal Mode** | `bmad.cliRunner: 'terminal'` | Reuses/creates `"BMAD Agent"` terminal and sends command | Fallback to clipboard if error |
| **Clipboard Mode** | `bmad.cliRunner: 'clipboard'` | Copies prompt string to clipboard; shows notification | Toast displayed |
| **Terminal Already Open** | Active terminal named `"BMAD Agent"` | Focuses existing terminal without creating a new tab | Reused cleanly |
| **Custom Args Passed** | Action with args (e.g. `{-H: headless}`) | Properly formats CLI invocation flag string | Escapes spaces/quotes |

</frozen-after-approval>

## Code Map

- `src/core/command-formatter.ts` -- Pure domain function to format skill and agent prompts
- `src/adapters/execution-dispatcher.ts` -- VS Code Terminal and Clipboard dispatch controller
- `src/extension.ts` -- Wire dispatcher into `bmad.runSkill` and `bmad.talkToAgent`
- `test/command-formatter.test.ts` -- Unit tests for CLI and prompt formatting

## Tasks & Acceptance

**Execution:**
- [x] `src/core/command-formatter.ts` -- Implement CLI command and prompt formatting logic
- [x] `src/adapters/execution-dispatcher.ts` -- Implement `ExecutionDispatcher` with terminal reuse and clipboard fallback
- [x] `src/extension.ts` -- Connect dispatcher to skill execution and agent talk commands
- [x] `test/command-formatter.test.ts` -- Unit tests for formatting logic

**Acceptance Criteria:**
- In terminal mode, executing a skill sends command to `"BMAD Agent"` terminal.
- In clipboard mode, prompt is copied to clipboard with confirmation.
- All unit tests pass and extension builds cleanly.

## Implementation Notes
- Pure domain command and prompt formatting in `src/core/command-formatter.ts` generates both slash-commands (`/bmad-build`) and CLI commands (`npx bmad ...`), and conversational prompts with persona guidelines.
- `ExecutionDispatcher` in `src/adapters/execution-dispatcher.ts` respects `bmad.cliRunner`, reuses the `"BMAD Agent"` terminal, and gracefully falls back to clipboard writing if the terminal is inaccessible.
- Integrated into `bmad.runSkill`, `bmad.talkToAgent`, `bmad.runSkillFromTree`, and `bmad.talkToAgentFromTree`.

## Spec Change Log
- 2026-09-18: Initial implementation and verification of Story 2.2.

## Review Triage Log
- Peer Review / Verification Checks:
  - Acceptance Criteria 1: Terminal mode reuses named `"BMAD Agent"` terminal and executes CLI commands - PASS.
  - Acceptance Criteria 2: Clipboard mode writes formatted prompt to clipboard with toast notification - PASS.
  - Acceptance Criteria 3: 51 unit tests passing, clean dual bundles compiled - PASS (`npm test` and `npm run build`).
- Decision: ACCEPTED without blockers.

