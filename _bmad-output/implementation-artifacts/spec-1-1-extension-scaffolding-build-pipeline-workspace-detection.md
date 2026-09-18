---
title: 'Story 1.1: Extension Scaffolding, Build Pipeline & Workspace Detection'
type: 'feature'
created: '2026-09-18'
status: 'done'
baseline_commit: 'd8c984b36caf1925f15bef124f9f701c4d2da9f8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is currently no VS Code extension scaffolding, build pipeline, or automated detection mechanism to recognize when an open workspace contains a BMAD Method project.

**Approach:** Scaffold the extension structure with TypeScript, dual-bundler build scripts (`esbuild` for extension host, `vite` for webview), configure `package.json` manifests and extension activation, and implement a pure-domain `WorkspaceDetector` that sets the `bmad:hasBmadProject` VS Code context key and registers the `"BMAD Method"` diagnostic output channel.

## Boundaries & Constraints

**Always:**
- Keep `WorkspaceDetector` in `src/core/workspace-detector.ts` pure TypeScript without direct `vscode` imports so it can be 100% unit tested in Node (per Hexagonal Architecture / AR-2).
- Use `vscode.commands.executeCommand('setContext', 'bmad:hasBmadProject', boolean)` on activation to govern conditional view contributions.
- Register a dedicated `vscode.OutputChannel` named `"BMAD Method"`.
- Support cross-platform path resolution (Linux, macOS, Windows).

**Never:**
- Never block extension activation with synchronous disk I/O.
- Never spawn heavy background watcher loops when `bmad:hasBmadProject` is false.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Valid BMAD Workspace** | Folder contains `_bmad/_config/manifest.yaml` and `_bmad/_config/bmad-help.csv` | `isBmadProject()` returns `true`; `bmad:hasBmadProject` set to `true`; logs activation | N/A |
| **Non-BMAD Workspace** | Folder lacks `_bmad/` structure | `isBmadProject()` returns `false`; `bmad:hasBmadProject` set to `false`; idle state | N/A |
| **Partial BMAD Workspace** | Folder contains `_bmad/` but missing manifest or csv | Returns `false` or warning; logs informative diagnostic to OutputChannel | Non-blocking warning |
| **Multi-Root / No Folder Open** | VS Code opened without a folder (`workspaceFolders` undefined) | Graceful no-op; sets context to `false`; no crash | Handled gracefully |

</frozen-after-approval>

## Code Map

- `package.json` -- Extension manifest, contributes, scripts (`compile`, `watch`, `package`), and dependencies
- `tsconfig.json` -- TypeScript compiler configuration for extension host targeting Node
- `tsconfig.webview.json` -- TypeScript compiler configuration for Preact Webview targeting DOM
- `vite.config.ts` -- Vite configuration for Webview bundling
- `src/extension.ts` -- Extension lifecycle entrypoint (`activate`, `deactivate`, output channel, context keys)
- `src/core/workspace-detector.ts` -- Pure TypeScript detection logic verifying BMAD directory and manifests
- `media/icons/bmad-icon.svg` -- Default SVG brand icon for BMAD
- `test/workspace-detector.test.ts` -- Unit tests verifying detection under various workspace states

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- Define extension metadata, activationEvents, commands (`bmad.openDashboard`, `bmad.statusCheck`), devDependencies, and build scripts -- Establishes official VS Code extension contract
- [x] `tsconfig.json` & `tsconfig.webview.json` -- Configure strict TypeScript compilation paths for host and webview -- Enforces type safety and separate build targets
- [x] `vite.config.ts` -- Configure Vite build targeting `dist/webview/` with inline assets -- Enables isolated webview bundling
- [x] `src/core/workspace-detector.ts` -- Implement pure `detectBmadWorkspace(rootPath: string): Promise<BmadDetectionResult>` -- Provides testable workspace classification
- [x] `src/extension.ts` -- Implement `activate(context)` wiring output channel, workspace detector, and context keys -- Binds extension to VS Code lifecycle
- [x] `media/icons/bmad-icon.svg` -- Create SVG brand icon -- Provides visual branding in Activity Bar
- [x] `test/workspace-detector.test.ts` -- Implement comprehensive unit test suite for detector logic -- Validates all matrix scenarios

**Acceptance Criteria:**
- Given a workspace with `_bmad/_config/manifest.yaml` and `bmad-help.csv`, when activated, then `bmad:hasBmadProject` context key is `true` and activation message is logged to `"BMAD Method"` output channel.
- Given an empty or non-BMAD workspace, when activated, then `bmad:hasBmadProject` is `false` and no errors are thrown.
- Given `npm run compile` is executed, then both extension host and webview bundles compile cleanly without TypeScript or bundler errors.

## Implementation Notes

- Initialized extension manifest with Activity Bar view container `bmad-explorer`, commands, and configuration options.
- Configured dual TypeScript compilation: Node environment for extension host (`tsconfig.json`) and DOM/Preact environment for Webview (`tsconfig.webview.json`).
- Implemented pure domain `detectBmadWorkspace` in `src/core/workspace-detector.ts` with Hexagonal isolation (no VS Code dependencies).
- Implemented `activate` in `src/extension.ts` wiring the `"BMAD Method"` OutputChannel, setting `bmad:hasBmadProject`, and registering basic command handlers.
- Created monochromatic vector SVG brand icon in `media/icons/bmad-icon.svg`.
- Verified with 6/6 passing Vitest unit tests in `test/workspace-detector.test.ts`.
- Verified dual compilation via `npm run build`: `esbuild` generated `dist/extension.js` (108.4kb) and `vite` generated `dist/webview/bundle.js` (11.69kb).

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence |
| :--- | :--- | :--- |
| Zero-folder workspace edge case | low / false | Verified: `src/extension.ts` lines 23-28 guards against `undefined` or empty `workspaceFolders`. |
| Malformed manifest YAML handling | low / false | Verified: `src/core/workspace-detector.ts` lines 58-71 wraps YAML parsing in try/catch and tests verify safe fallback. |
| Test suite verification gap | false | Verified: 6/6 tests covering all matrix scenarios executed and passed with Vitest. |

## Design Notes

```typescript
// Core interface for workspace detection
export interface BmadDetectionResult {
  isBmad: boolean;
  hasManifest: boolean;
  hasHelpCatalog: boolean;
  version?: string;
  modules?: string[];
  error?: string;
}
```
