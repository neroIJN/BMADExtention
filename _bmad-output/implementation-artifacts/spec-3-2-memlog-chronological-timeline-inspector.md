---
title: 'Story 3.2: Memlog Chronological Timeline Inspector'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'memlog'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/implementation-artifacts/spec-3-1-categorized-artifacts-explorer.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The BMAD framework records working memory, architectural decisions, and evolving assumptions in flat, append-only `.memlog.md` files across sessions. Developers and agents resuming a project need to quickly understand past decisions, assumptions, and directions without scanning through raw markdown bullet lists.

**Approach:** Implement a pure domain memlog parser (`src/core/memlog-parser.ts`) that extracts frontmatter metadata and parses typed entries (`decision`, `assumption`, `insight`, `direction`, `event`, etc.). Provide an interactive VS Code Memlog Timeline Inspector panel with chronological rendering, color-coded badges, type filters, keyword search, and direct file access.

## Boundaries & Constraints

**Always:**
- Implement memlog parsing and filtering in `src/core/memlog-parser.ts` with zero VS Code API dependencies (Hexagonal Architecture / AR-2).
- Parse frontmatter (topic, goal, updated, custom fields) and typed bullet entries: `- (type [by author]) text`.
- Gracefully handle untyped bullets, author-only tags (`- (by coach) text`), and missing frontmatter.
- Support filtering by entry type (decision, assumption, insight, idea, event, etc.) and keyword query matching.
- Provide a clean timeline Webview with theme-compatible CSS variables (`var(--vscode-*)`) and sanitized HTML.

**Never:**
- Never mutate or rewrite `.memlog.md` history; memlogs are strictly append-only.
- Never throw unhandled exceptions on malformed lines or non-existent files.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Standard Memlog** | `.memlog.md` with frontmatter and 10+ entries | Parsed into structured entries with types, authors, and text | Accurate parsing |
| **Filtered Search** | User filters by type `decision` or searches `budget` | Returns only matching entries maintaining chronological order | Filter returns subset |
| **No Frontmatter** | Raw bullets without `---` block | Parses entries with empty metadata; no crash | Graceful fallback |
| **Missing Memlog** | Project workspace without `.memlog.md` | Informs user no memlog exists with option to create or guide | Non-blocking toast |
| **Multiple Memlogs** | Several run folders with `.memlog.md` | QuickPick lets user select target run memlog | Clean selector |

</frozen-after-approval>

## Code Map

- `src/core/types.ts` -- Define `BmadMemlogEntry`, `BmadMemlogMetadata`, `BmadMemlogDocument`
- `src/core/memlog-parser.ts` -- Pure domain parser and filter engine for `.memlog.md`
- `src/adapters/memlog-inspector-panel.ts` -- Webview panel for interactive chronological timeline
- `src/extension.ts` -- Register `bmad.inspectMemlog` command
- `package.json` -- Register command contribution in Command Palette
- `test/memlog-parser.test.ts` -- Unit tests for frontmatter parsing, tag extraction, filtering, and edge cases

## Tasks & Acceptance

**Execution:**
- [x] `src/core/types.ts` -- Define memlog data contracts
- [x] `src/core/memlog-parser.ts` -- Implement pure domain parser, locator, and filter functions
- [x] `test/memlog-parser.test.ts` -- Unit tests for parsing, tag extraction, and search filtering
- [x] `src/adapters/memlog-inspector-panel.ts` -- Implement interactive Webview timeline inspector
- [x] `package.json` & `src/extension.ts` -- Wire command `bmad.inspectMemlog`

**Acceptance Criteria:**
- Given a `.memlog.md` file, the Memlog Inspector renders entries chronologically with color-coded badges and author attribution.
- Users can filter entries by type (`decision`, `assumption`, `insight`, `event`, etc.) and search by keyword.
- All unit tests pass and extension builds cleanly.

## Implementation Notes
- Created pure domain parser in `src/core/memlog-parser.ts` supporting frontmatter extraction, inline tag parsing with author attribution (`(type by author)` or `(by author)`), search queries, and workspace discovery of `.memlog.md` files.
- Built `MemlogInspectorPanel` (`src/adapters/memlog-inspector-panel.ts`) providing an interactive Webview with VS Code theme variables, hero metadata section, instantaneous client-side keyword and type pill filtering, color-coded badges, and one-click source file opening.
- Registered command `bmad.inspectMemlog` in `src/extension.ts` and `package.json` with QuickPick multi-memlog selection and graceful guidance.
- Added comprehensive unit test suite in `test/memlog-parser.test.ts` (12 tests) verifying frontmatter splitting, tag parsing, author extraction, and query filtering. All 82 test cases pass cleanly.

## Spec Change Log
- 2026-09-19: Completed Story 3.2 implementation and verified all acceptance criteria.

## Review Triage Log
