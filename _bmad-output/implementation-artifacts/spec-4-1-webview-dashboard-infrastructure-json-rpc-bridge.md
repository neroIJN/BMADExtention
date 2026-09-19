---
title: 'Story 4.1: Webview Dashboard Infrastructure & JSON-RPC Bridge'
type: 'feature'
created: '2026-09-19'
status: 'done'
baseline_commit: 'f7ef807'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-BMADExtention-2026-09-18/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The BMAD visual cockpit requires a dedicated editor tab Webview dashboard that feels native, responsive, and secure. Currently, `bmad.openDashboard` is a placeholder alert, lacking the Preact application mounting container, strict CSP isolation, and reliable 2-way asynchronous communication with the Extension Host.

**Approach:** Implement a pure TypeScript JSON-RPC message bridge (`src/core/json-rpc-bridge.ts`) conforming to AD-6 with mandatory 5000ms timeouts. Create a singleton VS Code Webview panel adapter (`src/adapters/webview-dashboard-panel.ts`) loading the Vite-bundled Preact application with cryptographic nonces and theme CSS variables, and implement the Webview RPC client and reactive dashboard shell (`src/webview/rpc-client.ts`, `src/webview/main.tsx`).

## Boundaries & Constraints

**Always:**
- Strictly isolate domain JSON-RPC logic in `src/core/json-rpc-bridge.ts` without importing `vscode` (Hexagonal Architecture / AR-2).
- Conform to the AD-6 envelope: `{ id: string, type: 'request' | 'response' | 'event', command: string, payload: unknown, error?: string }`.
- Enforce a 5000ms timeout on all RPC requests, rejecting with a descriptive timeout error if no response is received.
- Enforce strict Content Security Policy (CSP) in the Webview panel using per-session cryptographic nonces and `webview.cspSource`.
- Inherit native VS Code CSS variables (`var(--vscode-*)`) so UI matches dark, light, and high-contrast themes seamlessly.
- Manage Webview panel lifecycle as a singleton (`BMADDashboardPanel.currentPanel`) to prevent duplicate panel proliferation.

**Never:**
- Never perform direct file system I/O inside the Webview bundle (AD-1).
- Never allow unescaped inline scripts or styles violating CSP.
- Never crash or leak event listeners when the Webview tab is closed by the user.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Open Dashboard** | Command `bmad.openDashboard` triggered | Webview panel opens in `ViewColumn.One` loading `dist/webview/bundle.js` with nonce | Fall back gracefully if bundle missing |
| **Re-focus Existing Panel** | `bmad.openDashboard` while panel already open | Brings existing panel to front (`panel.reveal()`) without duplicating state | Singleton pattern |
| **RPC Request/Response** | Webview sends `{ type: 'request', command: 'ping' }` | Host responds `{ type: 'response', command: 'ping', payload: 'pong' }` in < 50ms | Success |
| **RPC Timeout** | Webview sends request with no registered host handler | Promise rejects after exactly 5000ms with timeout error message | Error returned to caller |
| **RPC Event Push** | Extension Host emits `stateUpdated` event | Webview receives event envelope and updates UI components dynamically | Log warning if Webview disposed |
| **Panel Closed** | User closes Webview tab | Disposables disposed, pending requests cleaned up, reference reset to undefined | No memory leaks |

</frozen-after-approval>

## Code Map

- `src/core/types.ts` -- Define RPC message envelopes (`BmadRpcEnvelope`, `BmadRpcType`), dashboard state structures, and RPC command constants.
- `src/core/json-rpc-bridge.ts` -- Pure domain JSON-RPC communication bridge implementing request/response tracking, 5000ms timeout handling, handler registry, and event dispatch.
- `src/adapters/webview-dashboard-panel.ts` -- VS Code adapter managing `WebviewPanel` lifecycle, CSP nonce generation, HTML template rendering, and bridging VS Code messages to `JsonRpcBridge`.
- `src/webview/rpc-client.ts` -- Browser-side TypeScript RPC client interfacing with `acquireVsCodeApi()`.
- `src/webview/main.tsx` -- Preact root application with tabs ("Pipeline DAG", "Sprint Board"), connection status indicator, and initial state fetching.
- `src/extension.ts` -- Register `BMADDashboardPanel.render(context.extensionUri, workspaceRoot)` for `bmad.openDashboard`.
- `test/json-rpc-bridge.test.ts` -- Comprehensive unit test suite for JSON-RPC request/response, timeout handling, error propagation, and event broadcasting.

## Tasks & Acceptance

**Execution:**
- [x] `src/core/types.ts` -- Add `BmadRpcEnvelope`, `BmadRpcType`, `BmadRpcRequest`, `BmadRpcResponse`, `BmadRpcEvent`, `BmadDashboardState` -- AD-6 type contracts.
- [x] `src/core/json-rpc-bridge.ts` -- Implement `JsonRpcBridge` with 5000ms timeout, request/response correlation, and event dispatch -- Pure domain RPC logic.
- [x] `src/adapters/webview-dashboard-panel.ts` -- Implement `BMADDashboardPanel` with singleton pattern, CSP nonce, and RPC connection -- VS Code adapter.
- [x] `src/webview/rpc-client.ts` -- Implement browser-side `WebviewRpcClient` with `acquireVsCodeApi()` -- Client RPC transport.
- [x] `src/webview/main.tsx` -- Implement Preact dashboard shell with status header, tab bar, and RPC state integration -- Preact UI entry.
- [x] `src/extension.ts` -- Replace placeholder `bmad.openDashboard` command with `BMADDashboardPanel.render` -- Extension integration.
- [x] `test/json-rpc-bridge.test.ts` -- Write unit tests for JSON-RPC bridge (request, response, timeout, event, error) -- Verification.

**Acceptance Criteria:**
- Given command `BMAD: Open Visualizer Dashboard` (`bmad.openDashboard`), when executed, then a dedicated editor tab Webview panel opens loading the Preact bundle built with Vite.
- Given the Webview dashboard panel, when inspected, then it enforces strict Content Security Policy (CSP) with per-session nonces and inherits native VS Code CSS variables.
- Given the asynchronous JSON-RPC communication bridge, when a request is sent, then it resolves within 5000ms or rejects on timeout.

## Implementation Notes

- Implemented `JsonRpcBridge` conforming strictly to AD-6 envelope specs (`id`, `type`, `command`, `payload`, `error`) without vscode imports.
- Enforced 5000ms request timeouts with automatic error dispatch and disposal guarantees.
- Built `BMADDashboardPanel` singleton adapter managing CSP nonce, HTML bundling, and message forwarding.
- Built `WebviewRpcClient` and `main.tsx` with Preact tabbed interface, status indicators, and RPC integration.
- Added comprehensive unit test suite in `test/json-rpc-bridge.test.ts` verifying all RPC permutations.

## Spec Change Log

## Review Triage Log

## Design Notes

The JSON-RPC message envelope matches ARCHITECTURE-SPINE.md AD-6:
```typescript
export interface BmadRpcEnvelope<T = unknown> {
  id: string;
  type: 'request' | 'response' | 'event';
  command: string;
  payload: T;
  error?: string;
}
```
The bridge provides symmetrical request-response handling on both Extension Host and Webview:
```typescript
const response = await bridge.sendRequest('getState', {});
```
Any unanswered request rejects automatically after 5000ms via `setTimeout`.

## Verification

**Commands:**
- `npm test` -- expected: All unit tests pass, including new `test/json-rpc-bridge.test.ts`.
- `npm run build` -- expected: `npm run compile:ext` and `npm run compile:webview` both compile cleanly.
