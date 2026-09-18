---
title: 'Story 3.4: TEA Quality & Traceability Dashboard'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'tea'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/implementation-artifacts/spec-3-3-prd-specification-rubric-validator-viewer.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Quality engineering in BMAD (championed by Murat, the Test Architect persona) relies on strict traceability from requirements (FRs) to automated tests and ATDD cycles. Currently, developers cannot easily see whether every functional requirement has corresponding test coverage, nor inspect quality scores and ATDD scaffold progress inside VS Code.

**Approach:** Implement a pure domain TEA analyzer (`src/core/tea-analyzer.ts`) that maps PRD functional requirements against test suite files and TEA artifacts (`_bmad-output/test-artifacts/`), calculates a 0-100 quality score, and computes ATDD checklist progress. Build an interactive TEA Quality & Traceability Dashboard Webview panel (`src/adapters/tea-dashboard-panel.ts`) that highlights uncovered requirements, displays traceability matrices with clickable file links, and provides one-click actions to scaffold tests or consult Murat.

## Boundaries & Constraints

**Always:**
- Implement all traceability parsing, test mapping, and quality score computation in `src/core/tea-analyzer.ts` with zero VS Code API imports (Hexagonal Architecture / AR-2).
- Display a comprehensive 0-100 Quality Score, requirements coverage percentage, and ATDD scaffold progress.
- Highlight unmapped requirements that lack test coverage in prominent warning/danger states.
- Support one-click actions: jump to mapped test files, launch `npm test`, or dispatch Murat (`bmad-testarch-atdd` or `bmad-tea`) via the `ExecutionDispatcher`.
- Fall back gracefully if no test artifacts or PRDs exist yet, offering clear guidance.

**Never:**
- Never block the UI thread during file discovery.
- Never crash if test artifacts are missing or partially written.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **All FRs Covered** | PRD with 10 FRs; all mapped to test files in `test/` | Quality score >= 90; all matrix rows marked `COVERED` | Emerald status |
| **Uncovered FRs** | PRD with FRs that have no matching tests | Marked `UNCOVERED` in red; action button to scaffold tests | Highlights gaps |
| **TEA Artifacts Present** | `_bmad-output/test-artifacts/traceability-matrix.md` exists | Parses declared mappings and quality score directly | Seamless sync |
| **Click Test Link** | User clicks mapped test file link | Opens the test file in editor | Validates file path |
| **No Tests in Workspace** | New workspace without `test/` directory | Displays 0% coverage and recommends ATDD initialization | Helpful onboarding |

</frozen-after-approval>

## Code Map

- `src/core/types.ts` -- Define `BmadTeaRequirementTrace`, `BmadTeaQualityReport`, `BmadAtddProgress`
- `src/core/tea-analyzer.ts` -- Pure domain requirements-to-test mapping and score calculator
- `src/adapters/tea-dashboard-panel.ts` -- Webview panel for TEA Quality & Traceability Dashboard
- `src/extension.ts` -- Register `bmad.openTeaDashboard` command
- `package.json` -- Register command in Command Palette
- `test/tea-analyzer.test.ts` -- Unit tests for traceability mapping, score calculations, and fallback handling

## Tasks & Acceptance

**Execution:**
- [x] `src/core/types.ts` -- Define TEA quality and traceability data contracts
- [x] `src/core/tea-analyzer.ts` -- Implement pure domain analyzer and requirement mapper
- [x] `test/tea-analyzer.test.ts` -- Unit tests for traceability calculation and parsing
- [x] `src/adapters/tea-dashboard-panel.ts` -- Implement Webview panel with matrix table and actions
- [x] `package.json` & `src/extension.ts` -- Wire `bmad.openTeaDashboard` command and Command Palette entry

**Acceptance Criteria:**
- Given PRD requirements and test files, the TEA Dashboard displays quality score (0-100), coverage percentage, and ATDD progress.
- Requirements without tests are clearly flagged with one-click actions to scaffold tests.
- All unit tests pass and extension builds cleanly.

## Implementation Notes
- Created `src/core/tea-analyzer.ts` extracting PRD functional requirements, mapping requirements to test suites, calculating coverage percentage and TEA quality scores (0-100), and tracking ATDD workflow phases.
- Built `TeaDashboardPanel` (`src/adapters/tea-dashboard-panel.ts`) featuring quality score badges (`PASS`, `CONCERNS`, `FAIL`), ATDD cycle stages, interactive filterable traceability matrix table, clickable links to jump to test files, and direct actions to scaffold tests or converse with Murat.
- Registered command `bmad.openTeaDashboard` in `src/extension.ts` and contributed to `package.json` Command Palette.
- Added comprehensive unit tests in `test/tea-analyzer.test.ts` (5 tests) verifying requirement extraction, table parsing, keyword mapping, and quality score calculation. All 93 test cases pass cleanly.

## Spec Change Log
- 2026-09-19: Completed Story 3.4 implementation and verified all acceptance criteria.

## Review Triage Log
