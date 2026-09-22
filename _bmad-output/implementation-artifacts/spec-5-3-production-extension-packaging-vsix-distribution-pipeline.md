---
title: 'Story 5.3: Production Extension Packaging & VSIX Distribution Pipeline'
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

**Problem:** The extension currently lacks official packaging scripts, `.vscodeignore` configuration, and build validation to create a production-ready `.vsix` file. Without proper packaging configuration, any packaging attempt either fails due to missing packaging tools or packages unnecessary development dependencies, test artifacts, source maps, and planning documents, resulting in bloated package sizes (> 50MB) and potential security or distribution issues.

**Approach:** Author a production-grade `.vscodeignore` file to strictly omit development source files (`src/`, `test/`), planning artifacts (`_bmad-output/`, `_bmad/`), test runners, and developer configs. Integrate `@vscode/vsce` into `devDependencies` and add dedicated `package`, `package:dry-run`, and `package:check` scripts in `package.json`. Validate that the packaged `.vsix` bundle contains only `dist/`, `media/`, `package.json`, `README.md`, and `LICENSE`, resulting in a lightweight (< 5MB) and fully compliant VSIX bundle.

## Boundaries & Constraints

**Always:**
- Ensure `vscode:prepublish` automatically runs `npm run compile` (`compile:ext` and `compile:webview`) so the distribution bundle is always freshly built before packaging.
- Strictly exclude `src/`, `test/`, `_bmad-output/`, `_bmad/`, `tsconfig*.json`, `vite.config.ts`, `.git/`, `.vscode/`, `.gemini/`, and raw source maps in `.vscodeignore`.
- Ensure all mandatory VS Code Marketplace manifest fields are valid: `publisher`, `name`, `displayName`, `version`, `engines.vscode`, `license`, `repository`, `icon`, `categories`, and `keywords`.
- Maintain package size below 5MB to ensure rapid installation and minimal footprint on the user's system.

**Never:**
- Never include credentials, tokens, or local path hardcodes in the packaged bundle.
- Never package untracked or scratch files into the final `.vsix` artifact.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| **Run Packaging** | `npm run package` executed | Pre-build runs, vsce packages `bmad-vscode-extension-0.1.0.vsix` | Build failures abort packaging with non-zero exit code |
| **Dry-Run Inspection** | `npm run package:dry-run` or `npx vsce ls` | Lists all files that will be included in the `.vsix`; verifies exclusion of `src/` and `_bmad/` | Output audited against manifest rules |
| **Manifest Audit** | Incomplete `package.json` metadata | vsce flags missing fields or license issues | Pre-pack script verifies all required manifest attributes |
| **Asset Check** | Missing icon or broken media path | Packaging fails if `media/icons/bmad-icon.svg` missing | Verified during pre-pack validation |

</frozen-after-approval>

## Code Map

- `.vscodeignore` -- Defines production packaging exclusion rules (omits test folders, source files, planning folders, dev configs, vite files).
- `package.json` -- Adds `@vscode/vsce` devDependency and packaging scripts (`package`, `package:precheck`, `package:dry-run`).
- `scripts/check-package.mjs` (or inline npm script) -- Inspects packaged contents to guarantee bundle size is under 5MB and required assets are present.
- `media/icons/bmad-icon.svg` -- Packaged icon asset referenced in `package.json`.

## Tasks & Acceptance

**Execution:**
- [ ] Create `.vscodeignore` with strict file inclusion/exclusion rules.
- [ ] Add `@vscode/vsce` to `devDependencies` and configure scripts in `package.json`:
  - `"package": "vsce package --no-dependencies"`
  - `"package:dry-run": "vsce ls"`
- [ ] Validate `package.json` metadata (publisher, repository, description, categories, engines).
- [ ] Run packaging verification to confirm generated `.vsix` is under 5MB and extracts cleanly.
