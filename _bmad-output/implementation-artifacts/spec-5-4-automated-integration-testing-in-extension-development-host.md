---
title: 'Story 5.4: Automated Integration Testing in Extension Development Host'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Existing unit tests (`test/*.test.ts`) run exclusively in Vitest within a bare Node.js environment. While pure core domain logic (`src/core/`) is thoroughly tested, VS Code adapters (`src/adapters/`), extension activation lifecycle (`src/extension.ts`), Tree View providers, Status Bar items, Command Palette executions, and Webview panels cannot be tested without running inside a real VS Code Extension Development Host.

**Approach:** Implement an automated integration testing framework using `@vscode/test-electron` (and `@vscode/test-cli` or Mocha test runner). Create an isolated test workspace fixture containing sample `_bmad/` manifests, and configure the test harness to launch a genuine VS Code instance running the extension. Author integration tests that assert:
1. Extension activation and context key `bmad:hasBmadProject` initialization.
2. All tree data providers (`LifecycleTreeProvider`, `AgentsTreeProvider`, `ArtifactsTreeProvider`) register and populate tree items accurately from fixture files.
3. Registered VS Code commands (`bmad.openDashboard`, `bmad.runSkill`, `bmad.talkToAgent`, `bmad.refreshLifecycle`) execute without errors.
4. Webview panel instantiation renders with appropriate CSP nonces and establishes 2-way JSON-RPC message passing.
Configure `.vscode/launch.json` and `.vscode/tasks.json` so developers can run and debug the Extension Development Host interactively with F5.

## Boundaries & Constraints

**Always:**
- Keep Extension Host integration tests in a dedicated folder (`test/suite/`) separate from the fast pure unit tests (`test/`).
- Use `@vscode/test-electron` to download and isolate the test VS Code binary in a temporary sandbox directory.
- Provide a dedicated fixture workspace (e.g. `test/fixtures/sample-bmad-project`) so tests run against deterministic, controlled files without mutating the active repo.
- Configure `.vscode/launch.json` with two configurations: "Extension Development Host" (interactive debugging) and "Extension Tests" (automated test execution).
- Support headless execution in Linux/CI environments (via `xvfb-run` or headless flags).

**Never:**
- Never modify or delete real project files during integration test execution; all test writes must occur in isolated temporary fixtures.
- Never let dangling timers or unhandled Promise rejections hang the test runner.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Launch Extension Host Tests** | `npm run test:e2e` or `npm run test:extension-host` | Downloads VS Code, launches host with fixture workspace, runs mocha suite, exits with code 0 | Non-zero exit code if any test fails |
| **Extension Activation Test** | Host loads sample BMAD fixture | `vscode.extensions.getExtension('neroIJN.bmad-vscode-extension')` is active; context key set | Test failure if extension fails to activate |
| **Tree Provider Integration** | Call `getChildren()` on active providers | Returns valid `TreeItem` arrays with correct labels, icons, and command bindings | Test asserts item count > 0 |
| **Command Execution Test** | `vscode.commands.executeCommand('bmad.openDashboard')` | Webview panel opens without runtime exceptions | Fails if command throws or unhandled rejection |
| **Webview RPC Roundtrip** | Webview sends `ping` request to host | Host responds with `pong` via `JsonRpcBridge` | Fails if timeout exceeded (5000ms) |

</frozen-after-approval>

## Code Map

- `test/suite/index.ts` -- Test runner configuration initializing Mocha and collecting test files inside the Extension Host.
- `test/suite/extension.test.ts` -- Integration test suite verifying extension activation, context keys, and commands.
- `test/suite/trees.test.ts` -- Integration test suite verifying Lifecycle, Agents, and Artifacts Tree Data Providers.
- `test/suite/webview.test.ts` -- Integration test suite verifying Webview panel creation, CSP nonces, and RPC bridge communication.
- `test/runTest.ts` -- Harness script invoking `@vscode/test-electron` (`runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs })`).
- `test/fixtures/sample-bmad-project/` -- Isolated test fixture workspace with sample `_bmad/` configuration and artifacts.
- `.vscode/launch.json` -- Launch configurations: "Run Extension" and "Extension Tests".
- `.vscode/tasks.json` -- Pre-launch build tasks ("npm: watch", "npm: compile").
- `package.json` -- Scripts `"test:e2e": "node ./dist-test/runTest.js"` or `"test:extension-host": "npm run compile && ts-node test/runTest.ts"`.

## Tasks & Acceptance

**Execution:**
- [ ] Add `@vscode/test-electron`, `@types/mocha`, and `mocha` to `devDependencies`.
- [ ] Create `test/runTest.ts` and test suite in `test/suite/`.
- [ ] Scaffold fixture workspace in `test/fixtures/sample-bmad-project/`.
- [ ] Author integration test suites:
  - `extension.test.ts`: activation, context keys, commands.
  - `trees.test.ts`: TreeDataProvider inspection and child node derivation.
  - `webview.test.ts`: panel rendering and RPC communication.
- [ ] Create `.vscode/launch.json` and `.vscode/tasks.json` for interactive debugging.
- [ ] Add `"test:extension-host"` script to `package.json` and verify end-to-end execution.
