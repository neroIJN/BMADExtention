---
title: 'Story 1.2: Dynamic Configuration & Path Resolver Engine'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - '_bmad-output/implementation-artifacts/spec-1-1-extension-scaffolding-build-pipeline-workspace-detection.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** BMAD projects configure artifact paths (`planning_artifacts`, `implementation_artifacts`, `test_artifacts`) using template tokens like `{project-root}` and `{output_folder}` across `config.yaml` and `config.toml`. Without a dynamic path resolver, downstream tree views and artifact inspectors cannot find deliverables when projects customize their directories.

**Approach:** Implement a pure-domain `ConfigResolver` in `src/core/config-resolver.ts` that safely parses `_bmad/bmm/config.yaml` and `_bmad/config.toml`, expands all path tokens into absolute operating system paths, applies fallback defaults when files or keys are missing, and integrates into `src/extension.ts` to log resolved paths on activation.

## Boundaries & Constraints

**Always:**
- Keep `ConfigResolver` pure TypeScript without `vscode` imports (Hexagonal Architecture / AR-2).
- Recursively resolve tokens so `{planning_artifacts}` referencing `{output_folder}` resolves cleanly.
- Guarantee fallback defaults if `_bmad/` configs are missing or malformed (NFR-4).
- Normalize paths for cross-platform compatibility on Linux, macOS, and Windows (NFR-5).

**Never:**
- Never crash or throw unhandled exceptions on missing TOML/YAML files.
- Never hardcode UNIX-only `/` path separators.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Standard BMM Config** | `_bmad/bmm/config.yaml` with `{project-root}/_bmad-output` | Resolves `planning_artifacts`, `implementation_artifacts`, `output_folder` to absolute paths | N/A |
| **Token in Token** | `planning_artifacts: "{output_folder}/planning-artifacts"` | Recursively resolves to `${rootPath}/_bmad-output/planning-artifacts` | Handles token nesting |
| **Missing Config Files** | `_bmad/bmm/config.yaml` does not exist | Falls back to standard BMAD default paths (`${rootPath}/_bmad-output/...`) | Non-blocking fallback |
| **Malformed YAML** | `_bmad/bmm/config.yaml` contains invalid syntax | Uses safe fallback defaults; returns warning in diagnostic info | Logged gracefully |
| **Custom Overrides** | Custom paths defined without `{project-root}` | Resolves relative paths relative to workspace root | Normalized safely |

</frozen-after-approval>

## Code Map

- `src/core/types.ts` -- Define `BmadConfig`, `BmadResolvedPaths`, and `ConfigResolverResult`
- `src/core/config-resolver.ts` -- Implement `resolveBmadConfig(rootPath: string): Promise<ConfigResolverResult>`
- `src/extension.ts` -- Call `resolveBmadConfig` on activation and log resolved artifact paths
- `test/config-resolver.test.ts` -- Comprehensive unit test suite testing standard, nested, missing, and malformed scenarios

## Tasks & Acceptance

**Execution:**
- [x] `src/core/types.ts` -- Define `BmadConfig` and `BmadResolvedPaths` interfaces -- Establishes data contract for resolved configurations
- [x] `src/core/config-resolver.ts` -- Implement token replacement and YAML/TOML config parsing with recursive token expansion -- Delivers pure domain path resolver
- [x] `src/extension.ts` -- Wire `resolveBmadConfig` into activation flow and log resolved paths to OutputChannel -- Integrates resolver with extension lifecycle
- [x] `test/config-resolver.test.ts` -- Implement unit tests covering standard configs, nested tokens, missing files, and malformed syntax -- Verifies all I/O matrix cases

**Acceptance Criteria:**
- Given a valid BMAD workspace, when `resolveBmadConfig(rootPath)` runs, then `{planning_artifacts}` and `{implementation_artifacts}` resolve to normalized absolute paths.
- Given missing or empty configs, when resolved, then default paths (`_bmad-output/planning-artifacts`, etc.) are returned without errors.
- Given `npm test` and `npm run build`, all tests pass and bundles compile cleanly.

## Implementation Notes
- Added lightweight `smol-toml` dependency for zero-overhead, spec-compliant TOML parsing.
- Implemented `expandTokens` with recursion guard, hyphen/underscore normalization, and relative path resolution.
- Layered config parsing across `config.toml`, `custom/config.toml`, and module YAMLs (`bmm`, `core`, `bmb`, `tea`, `cis`).
- Integrated into extension activation and verified against the real BMAD workspace.

## Spec Change Log
- 2026-09-18: Initial creation and implementation of Story 1.2.

## Review Triage Log
- Peer Review / Claims Check:
  - Acceptance Criteria 1: Normalized absolute paths generated for all tokens - PASS (tested).
  - Acceptance Criteria 2: Fallback defaults on missing or malformed configs - PASS (tested).
  - Acceptance Criteria 3: Bundles compile without errors (`npm run build` & 16 passing unit tests) - PASS.
- Decision: ACCEPTED without blockers.

## Design Notes

```typescript
export interface BmadResolvedPaths {
  outputFolder: string;
  planningArtifacts: string;
  implementationArtifacts: string;
  testArtifacts: string;
  projectKnowledge: string;
}
```
