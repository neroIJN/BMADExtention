---
title: 'Story 3.3: PRD & Specification Rubric Validator Viewer'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'governance'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/implementation-artifacts/spec-3-2-memlog-chronological-timeline-inspector.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Product managers and technical leads need to verify requirements readiness and quality before committing engineering time to implementation. Currently, reviewing specification findings or running BMAD rubric evaluations requires manual terminal commands or reading raw text reports without visual verdicts or direct line links.

**Approach:** Implement a pure domain rubric validator & report parser (`src/core/rubric-validator.ts`) that evaluates specifications against BMAD quality rubrics (checking required sections, testable acceptance criteria, ambiguity anti-patterns, and scope boundaries) and parses review report artifacts. Build an interactive VS Code Rubric Validator & Scorecard Panel (`src/adapters/rubric-validator-panel.ts`) featuring prominent `PASS` / `CONCERNS` / `FAIL` verdicts, severity filters, and clickable links that jump directly to cited source file line numbers.

## Boundaries & Constraints

**Always:**
- Keep pure evaluation and parsing logic in `src/core/rubric-validator.ts` without importing `vscode` (Hexagonal Architecture / AR-2).
- Prominently render the overall verdict: `PASS` (green), `CONCERNS` (amber), or `FAIL` (red).
- Provide counts and categorization across severity levels: `critical`, `high`, `medium`, `low`.
- Findings must include clickable file references with line numbers (e.g., `prd.md:142`) that open the file and position the editor cursor directly on the cited line.
- Support both parsing pre-existing validation reports (`*-validation*.md`, `*-review*.md`) and running live rubric evaluations on workspace PRD / spec files.

**Never:**
- Never block the UI thread during document evaluation.
- Never crash on malformed reports or missing target files.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **High Quality PRD** | Complete PRD with all sections and testable criteria | Overall Verdict: `PASS`, score >= 80, zero critical findings | Clean scorecard |
| **Gaps in PRD** | Missing NFRs or containing ambiguous phrases ("fast", "TBD") | Overall Verdict: `CONCERNS` or `FAIL`, findings with file:line links | Pinpoints lines |
| **Existing Review Report** | Markdown report with verdict and categorized findings | Parsed report rendered in visual scorecard Webview | Regex parser |
| **Click Finding Link** | User clicks `docs/prd.md:85` | Opens `docs/prd.md` with line 85 selected in editor | Validates file path |
| **No PRD Found** | Project without PRD or reports | Displays helpful guidance to run `bmad-prd` skill | Non-blocking |

</frozen-after-approval>

## Code Map

- `src/core/types.ts` -- Define `BmadValidationFinding`, `BmadValidationReport`, `BmadValidationVerdict`
- `src/core/rubric-validator.ts` -- Pure domain rubric evaluator and report parser
- `src/adapters/rubric-validator-panel.ts` -- Webview scorecard panel with jump-to-line navigation
- `src/extension.ts` -- Register `bmad.validateDocument` command and wire to tree views
- `package.json` -- Register commands in Command Palette and file context menus
- `test/rubric-validator.test.ts` -- Unit tests for rubric evaluation, report parsing, and line detection

## Tasks & Acceptance

**Execution:**
- [x] `src/core/types.ts` -- Define validation finding and scorecard data models
- [x] `src/core/rubric-validator.ts` -- Implement live rubric evaluation and Markdown report parser
- [x] `test/rubric-validator.test.ts` -- Unit tests for rubric rules, scores, and findings
- [x] `src/adapters/rubric-validator-panel.ts` -- Implement Webview scorecard with clickable line links
- [x] `package.json` & `src/extension.ts` -- Register `bmad.validateDocument` command and menus

**Acceptance Criteria:**
- Given a PRD or validation report, the scorecard displays overall verdict (`PASS`, `CONCERNS`, `FAIL`) and findings breakdown.
- Each finding cites file and line number; clicking a finding navigates directly to that line in VS Code.
- All unit tests pass and extension builds cleanly.

## Implementation Notes
- Created `src/core/rubric-validator.ts` supporting both live PRD rubric analysis (evaluating completeness, clarity, testability, and pinpointing line numbers for placeholders and vague terms) and parsing of review report artifacts (`*-validation*.md`, `*-review*.md`).
- Built `RubricValidatorPanel` (`src/adapters/rubric-validator-panel.ts`) featuring prominent `PASS` (emerald), `CONCERNS` (amber), and `FAIL` (crimson) verdict banners, metrics breakdown, severity filters, and clickable location links (`file.md:line`) that open the file and position the cursor on the exact line.
- Registered command `bmad.validateDocument` in `src/extension.ts` and `package.json`, contributed to Command Palette and Artifacts Explorer item context menu.
- Added comprehensive unit tests in `test/rubric-validator.test.ts` (6 tests) verifying rubric rules, placeholder line detection, report parsing, and report discovery. All 88 test cases pass cleanly.

## Spec Change Log
- 2026-09-19: Completed Story 3.3 implementation and verified all acceptance criteria.

## Review Triage Log
