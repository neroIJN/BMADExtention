import * as vscode from 'vscode';
import * as path from 'path';
import { BmadValidationReport } from '../core/types';
import { validatePrdDocument, parseValidationReport } from '../core/rubric-validator';
import * as fs from 'fs';

/**
 * Manages the interactive Webview panel for displaying PRD & specification rubric scorecards.
 */
export class RubricValidatorPanel {
  public static currentPanel: RubricValidatorPanel | undefined;
  public static readonly viewType = 'bmad.rubricValidator';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _report: BmadValidationReport;
  private _disposables: vscode.Disposable[] = [];

  public static async createOrShow(
    extensionUri: vscode.Uri,
    targetFilePath: string
  ): Promise<RubricValidatorPanel | undefined> {
    if (!fs.existsSync(targetFilePath)) {
      vscode.window.showErrorMessage(`File not found: ${targetFilePath}`);
      return undefined;
    }

    let report: BmadValidationReport;
    try {
      const content = await fs.promises.readFile(targetFilePath, 'utf-8');
      const lower = targetFilePath.toLowerCase();
      if (lower.includes('validation') || lower.includes('review')) {
        report = parseValidationReport(content, targetFilePath);
      } else {
        report = validatePrdDocument(content, targetFilePath);
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to evaluate document: ${err?.message || String(err)}`);
      return undefined;
    }

    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (RubricValidatorPanel.currentPanel) {
      RubricValidatorPanel.currentPanel._panel.reveal(column);
      RubricValidatorPanel.currentPanel.update(report);
      return RubricValidatorPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      RubricValidatorPanel.viewType,
      `Rubric: ${report.verdict} — ${path.basename(report.targetFile)}`,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    RubricValidatorPanel.currentPanel = new RubricValidatorPanel(panel, extensionUri, report);
    return RubricValidatorPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    report: BmadValidationReport
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._report = report;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'openLocation':
            await this._handleOpenLocation(message.filePath, message.lineNumber);
            break;
          case 'openTargetFile':
            if (this._report.targetFile) {
              await vscode.commands.executeCommand(
                'vscode.open',
                vscode.Uri.file(this._report.targetFile)
              );
            }
            break;
          case 'revalidate':
            if (this._report.targetFile && fs.existsSync(this._report.targetFile)) {
              const content = await fs.promises.readFile(this._report.targetFile, 'utf-8');
              const lower = this._report.targetFile.toLowerCase();
              const refreshed =
                lower.includes('validation') || lower.includes('review')
                  ? parseValidationReport(content, this._report.targetFile)
                  : validatePrdDocument(content, this._report.targetFile);
              this.update(refreshed);
              vscode.window.showInformationMessage('Rubric scorecard refreshed.');
            }
            break;
        }
      },
      null,
      this._disposables
    );

    this._render();
  }

  private async _handleOpenLocation(filePath?: string, lineNumber?: number): Promise<void> {
    const target = filePath || this._report.targetFile;
    if (!target || !fs.existsSync(target)) {
      vscode.window.showWarningMessage(`Cannot open file: ${target || 'unknown'}`);
      return;
    }

    try {
      const doc = await vscode.workspace.openTextDocument(target);
      const editor = await vscode.window.showTextDocument(doc);
      if (lineNumber && lineNumber > 0) {
        const lineIdx = Math.max(0, lineNumber - 1);
        const pos = new vscode.Position(lineIdx, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(
          new vscode.Range(pos, pos),
          vscode.TextEditorRevealType.InCenter
        );
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to open location: ${err?.message || String(err)}`);
    }
  }

  public update(report: BmadValidationReport): void {
    this._report = report;
    this._panel.title = `Rubric: ${report.verdict} — ${path.basename(report.targetFile)}`;
    this._render();
  }

  public dispose(): void {
    RubricValidatorPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }

  private _escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private _render(): void {
    const report = this._report;
    const findingsJson = JSON.stringify(report.findings);

    const verdictClass =
      report.verdict === 'PASS'
        ? 'verdict-pass'
        : report.verdict === 'CONCERNS'
        ? 'verdict-concerns'
        : 'verdict-fail';

    this._panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BMAD Rubric Validator</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --border: var(--vscode-panel-border, #333);
      --card-bg: var(--vscode-editorWidget-background, rgba(255, 255, 255, 0.04));
      --btn-bg: var(--vscode-button-background);
      --btn-fg: var(--vscode-button-foreground);
      --btn-hover: var(--vscode-button-hoverBackground);
      --input-bg: var(--vscode-input-background);
      --input-fg: var(--vscode-input-foreground);
      --input-border: var(--vscode-input-border);
    }
    body {
      background-color: var(--bg);
      color: var(--fg);
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
      margin: 0;
      font-size: 1.4rem;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .verdict-badge {
      font-size: 0.9rem;
      font-weight: bold;
      padding: 4px 12px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    .verdict-pass { background: #10b981; color: #ffffff; }
    .verdict-concerns { background: #f59e0b; color: #ffffff; }
    .verdict-fail { background: #ef4444; color: #ffffff; }
    .actions {
      display: flex;
      gap: 10px;
    }
    button.btn {
      background-color: var(--btn-bg);
      color: var(--btn-fg);
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    button.btn:hover {
      background-color: var(--btn-hover);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px 16px;
      text-align: center;
    }
    .stat-val {
      font-size: 1.6rem;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 0.78rem;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-critical { color: #ef4444; }
    .stat-high { color: #f97316; }
    .stat-medium { color: #eab308; }
    .stat-low { color: #3b82f6; }
    .stat-score { color: #10b981; }

    .categories-box {
      margin-bottom: 24px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 12px;
    }
    .cat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px 16px;
    }
    .cat-title {
      font-weight: 600;
      font-size: 0.95rem;
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .cat-desc {
      font-size: 0.82rem;
      opacity: 0.75;
    }

    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-bottom: 20px;
      background: var(--card-bg);
      padding: 12px 16px;
      border-radius: 6px;
      border: 1px solid var(--border);
    }
    .search-input {
      background: var(--input-bg);
      color: var(--input-fg);
      border: 1px solid var(--input-border);
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 0.88rem;
      min-width: 240px;
      flex: 1;
    }
    .pills {
      display: flex;
      gap: 6px;
    }
    .pill {
      background: rgba(128, 128, 128, 0.2);
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      cursor: pointer;
      text-transform: capitalize;
      user-select: none;
    }
    .pill.active {
      background: var(--btn-bg);
      color: var(--btn-fg);
      font-weight: bold;
    }

    .finding-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 14px;
    }
    .finding-top {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .sev-tag {
      font-size: 0.72rem;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .sev-critical { background: #ef4444; color: #fff; }
    .sev-high { background: #f97316; color: #fff; }
    .sev-medium { background: #eab308; color: #111; }
    .sev-low { background: #3b82f6; color: #fff; }
    .finding-title {
      font-size: 1rem;
      font-weight: 600;
    }
    .location-link {
      color: var(--vscode-textLink-foreground, #3794ff);
      cursor: pointer;
      text-decoration: underline;
      font-family: monospace;
      font-size: 0.84rem;
      margin-left: auto;
    }
    .location-link:hover {
      color: var(--vscode-textLink-activeForeground, #2481e8);
    }
    .finding-desc {
      font-size: 0.9rem;
      margin-bottom: 8px;
      opacity: 0.9;
    }
    .rec-box {
      background: rgba(55, 148, 255, 0.08);
      border-left: 3px solid #3794ff;
      padding: 8px 12px;
      border-radius: 0 4px 4px 0;
      font-size: 0.85rem;
    }
    .empty-state {
      text-align: center;
      padding: 40px;
      opacity: 0.6;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-row">
      <h1>
        <span>📋 ${this._escapeHtml(report.title)}</span>
        <span class="verdict-badge ${verdictClass}">${report.verdict}</span>
      </h1>
      <div class="actions">
        <button class="btn" onclick="openTarget()">Open File</button>
        <button class="btn" onclick="revalidate()">Re-validate</button>
      </div>
    </div>
    <div style="font-size:0.85rem; margin-top:8px; opacity:0.8;">
      Target: <code>${this._escapeHtml(report.targetFile)}</code> • Evaluated: ${new Date(report.evaluatedAt).toLocaleString()}
    </div>
  </div>

  <div class="summary-grid">
    <div class="stat-card">
      <div class="stat-val stat-score">${report.score}/100</div>
      <div class="stat-label">Quality Score</div>
    </div>
    <div class="stat-card">
      <div class="stat-val stat-critical">${report.summary.critical}</div>
      <div class="stat-label">Critical</div>
    </div>
    <div class="stat-card">
      <div class="stat-val stat-high">${report.summary.high}</div>
      <div class="stat-label">High</div>
    </div>
    <div class="stat-card">
      <div class="stat-val stat-medium">${report.summary.medium}</div>
      <div class="stat-label">Medium</div>
    </div>
    <div class="stat-card">
      <div class="stat-val stat-low">${report.summary.low}</div>
      <div class="stat-label">Low</div>
    </div>
  </div>

  ${
    report.rubricCategories.length > 0
      ? `<div class="categories-box">
          ${report.rubricCategories
            .map(
              (cat) => `
            <div class="cat-card">
              <div class="cat-title">
                <span>${this._escapeHtml(cat.name)}</span>
                <span>${cat.score}%</span>
              </div>
              <div class="cat-desc">${this._escapeHtml(cat.details)}</div>
            </div>`
            )
            .join('')}
        </div>`
      : ''
  }

  <div class="filter-bar">
    <input type="text" id="searchInput" class="search-input" placeholder="Search findings by keyword, location, or category..." oninput="applyFilters()" />
    <div class="pills">
      <div class="pill active" data-sev="all" onclick="setSevFilter('all')">All (${report.findings.length})</div>
      <div class="pill" data-sev="critical" onclick="setSevFilter('critical')">Critical (${report.summary.critical})</div>
      <div class="pill" data-sev="high" onclick="setSevFilter('high')">High (${report.summary.high})</div>
      <div class="pill" data-sev="medium" onclick="setSevFilter('medium')">Medium (${report.summary.medium})</div>
      <div class="pill" data-sev="low" onclick="setSevFilter('low')">Low (${report.summary.low})</div>
    </div>
  </div>

  <div id="findingsContainer"></div>

  <script>
    const vscode = acquireVsCodeApi();
    const allFindings = ${findingsJson};
    let activeSev = 'all';

    function setSevFilter(sev) {
      activeSev = sev;
      document.querySelectorAll('.pill').forEach(el => {
        el.classList.toggle('active', el.dataset.sev === sev);
      });
      applyFilters();
    }

    function applyFilters() {
      const q = document.getElementById('searchInput').value.toLowerCase().trim();
      const filtered = allFindings.filter(f => {
        if (activeSev !== 'all' && f.severity.toLowerCase() !== activeSev.toLowerCase()) {
          return false;
        }
        if (q) {
          const matchTitle = f.title.toLowerCase().includes(q);
          const matchDesc = f.description.toLowerCase().includes(q);
          const matchCat = f.category.toLowerCase().includes(q);
          const matchFile = f.filePath.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchCat && !matchFile) {
            return false;
          }
        }
        return true;
      });

      renderFindings(filtered);
    }

    function renderFindings(findings) {
      const container = document.getElementById('findingsContainer');
      if (findings.length === 0) {
        container.innerHTML = '<div class="empty-state">🎉 No matching findings! Document satisfies rubric gates for this filter.</div>';
        return;
      }

      container.innerHTML = findings.map(f => {
        const sevClass = 'sev-' + f.severity.toLowerCase();
        const lineText = f.lineNumber ? ':' + f.lineNumber : '';
        const displayPath = f.filePath ? f.filePath.split('/').slice(-2).join('/') + lineText : '';
        const recHtml = f.recommendation
          ? '<div class="rec-box"><strong>💡 Recommendation:</strong> ' + escapeHtml(f.recommendation) + '</div>'
          : '';

        return '<div class="finding-card">' +
          '<div class="finding-top">' +
            '<span class="sev-tag ' + sevClass + '">' + escapeHtml(f.severity) + '</span>' +
            '<span class="finding-title">' + escapeHtml(f.title) + '</span>' +
            (displayPath ? '<span class="location-link" onclick="jumpLocation(\\'' + escapeHtml(f.filePath) + '\\', ' + (f.lineNumber || 0) + ')">📍 ' + escapeHtml(displayPath) + '</span>' : '') +
          '</div>' +
          '<div class="finding-desc">' + escapeHtml(f.description) + '</div>' +
          recHtml +
        '</div>';
      }).join('');
    }

    function jumpLocation(filePath, lineNumber) {
      vscode.postMessage({
        command: 'openLocation',
        filePath: filePath,
        lineNumber: lineNumber
      });
    }

    function openTarget() {
      vscode.postMessage({ command: 'openTargetFile' });
    }

    function revalidate() {
      vscode.postMessage({ command: 'revalidate' });
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    renderFindings(allFindings);
  </script>
</body>
</html>`;
  }
}
