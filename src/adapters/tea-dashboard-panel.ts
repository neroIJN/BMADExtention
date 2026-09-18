import * as vscode from 'vscode';
import * as path from 'path';
import { BmadTeaQualityReport } from '../core/types';
import { analyzeTeaQuality } from '../core/tea-analyzer';
import { ExecutionDispatcher } from './execution-dispatcher';

/**
 * Manages the interactive Webview panel for the TEA Quality & Traceability Dashboard.
 */
export class TeaDashboardPanel {
  public static currentPanel: TeaDashboardPanel | undefined;
  public static readonly viewType = 'bmad.teaDashboard';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _workspaceRoot: string;
  private _report: BmadTeaQualityReport;
  private _executionDispatcher?: ExecutionDispatcher;
  private _disposables: vscode.Disposable[] = [];

  public static async createOrShow(
    extensionUri: vscode.Uri,
    workspaceRoot: string,
    executionDispatcher?: ExecutionDispatcher
  ): Promise<TeaDashboardPanel | undefined> {
    const report = await analyzeTeaQuality(workspaceRoot);

    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (TeaDashboardPanel.currentPanel) {
      TeaDashboardPanel.currentPanel._panel.reveal(column);
      TeaDashboardPanel.currentPanel.update(report);
      return TeaDashboardPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      TeaDashboardPanel.viewType,
      'TEA: Quality & Traceability',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    TeaDashboardPanel.currentPanel = new TeaDashboardPanel(
      panel,
      extensionUri,
      workspaceRoot,
      report,
      executionDispatcher
    );
    return TeaDashboardPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    workspaceRoot: string,
    report: BmadTeaQualityReport,
    executionDispatcher?: ExecutionDispatcher
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._workspaceRoot = workspaceRoot;
    this._report = report;
    this._executionDispatcher = executionDispatcher;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'openTestFile':
            if (message.filePath) {
              const fullPath = path.isAbsolute(message.filePath)
                ? message.filePath
                : path.join(this._workspaceRoot, message.filePath);
              await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(fullPath));
            }
            break;
          case 'runTests':
            if (this._executionDispatcher) {
              await this._executionDispatcher.dispatchSkill('bmad-testarch-atdd');
            } else {
              const terminal = vscode.window.createTerminal('TEA Tests');
              terminal.show();
              terminal.sendText('npm test');
            }
            break;
          case 'scaffoldTests':
            if (this._executionDispatcher) {
              await this._executionDispatcher.dispatchSkill('bmad-testarch-atdd', message.requirementId);
            }
            break;
          case 'talkToMurat':
            await vscode.commands.executeCommand('bmad.talkToAgent', 'bmad-tea');
            break;
          case 'refresh':
            const refreshed = await analyzeTeaQuality(this._workspaceRoot);
            this.update(refreshed);
            vscode.window.showInformationMessage('TEA Quality & Traceability Dashboard refreshed.');
            break;
        }
      },
      null,
      this._disposables
    );

    this._render();
  }

  public update(report: BmadTeaQualityReport): void {
    this._report = report;
    this._render();
  }

  public dispose(): void {
    TeaDashboardPanel.currentPanel = undefined;
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
    const matrixJson = JSON.stringify(report.traceabilityMatrix);

    const scoreClass =
      report.qualityScore >= 80 ? 'gate-pass' : report.qualityScore >= 50 ? 'gate-concerns' : 'gate-fail';

    const gateLabel =
      report.qualityScore >= 80 ? 'PASS' : report.qualityScore >= 50 ? 'CONCERNS' : 'FAIL';

    this._panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TEA Quality & Traceability Dashboard</title>
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
    .gate-badge {
      font-size: 0.9rem;
      font-weight: bold;
      padding: 4px 12px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    .gate-pass { background: #10b981; color: #fff; }
    .gate-concerns { background: #f59e0b; color: #fff; }
    .gate-fail { background: #ef4444; color: #fff; }

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
    button.btn-secondary {
      background: rgba(128, 128, 128, 0.2);
      color: var(--fg);
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
    .val-score { color: #10b981; }
    .val-cov { color: #3b82f6; }
    .val-uncovered { color: #ef4444; }

    .atdd-section {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .atdd-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .atdd-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }
    .atdd-card {
      background: rgba(128, 128, 128, 0.1);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 10px 14px;
    }
    .atdd-card-top {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-weight: 600;
      font-size: 0.88rem;
    }
    .atdd-status {
      font-size: 0.72rem;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .status-completed { background: #10b981; color: #fff; }
    .status-in-progress { background: #f59e0b; color: #fff; }
    .status-pending { background: #6b7280; color: #fff; }
    .atdd-desc {
      font-size: 0.8rem;
      opacity: 0.75;
    }

    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-bottom: 16px;
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

    table.matrix-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }
    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      font-size: 0.88rem;
    }
    th {
      background: rgba(128, 128, 128, 0.15);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.76rem;
      letter-spacing: 0.5px;
    }
    .badge-cov {
      font-size: 0.72rem;
      font-weight: bold;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .cov-covered { background: #10b981; color: #fff; }
    .cov-partial { background: #f59e0b; color: #fff; }
    .cov-uncovered { background: #ef4444; color: #fff; }

    .test-link {
      color: var(--vscode-textLink-foreground, #3794ff);
      cursor: pointer;
      text-decoration: underline;
      display: inline-block;
      margin-right: 8px;
      font-family: monospace;
      font-size: 0.82rem;
    }
    .test-link:hover {
      color: var(--vscode-textLink-activeForeground, #2481e8);
    }
    .btn-sm {
      padding: 4px 10px;
      font-size: 0.78rem;
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
        <span>🧪 TEA Quality & Traceability Dashboard</span>
        <span class="gate-badge ${scoreClass}">Quality Gate: ${gateLabel}</span>
      </h1>
      <div class="actions">
        <button class="btn btn-secondary" onclick="talkToMurat()">Talk to Murat</button>
        <button class="btn" onclick="runTests()">Run Tests</button>
        <button class="btn btn-secondary" onclick="refresh()">Refresh</button>
      </div>
    </div>
    <div style="font-size:0.85rem; margin-top:8px; opacity:0.8;">
      ${this._escapeHtml(report.recommendations[0] || 'Continuous quality gates active.')}
    </div>
  </div>

  <div class="summary-grid">
    <div class="stat-card">
      <div class="stat-val val-score">${report.qualityScore}/100</div>
      <div class="stat-label">Quality Score</div>
    </div>
    <div class="stat-card">
      <div class="stat-val val-cov">${report.coveragePercentage}%</div>
      <div class="stat-label">Coverage</div>
    </div>
    <div class="stat-card">
      <div class="stat-val">${report.totalRequirements}</div>
      <div class="stat-label">Total Requirements</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color:#10b981;">${report.coveredRequirements}</div>
      <div class="stat-label">Covered FRs</div>
    </div>
    <div class="stat-card">
      <div class="stat-val val-uncovered">${report.uncoveredRequirements}</div>
      <div class="stat-label">Uncovered FRs</div>
    </div>
    <div class="stat-card">
      <div class="stat-val">${report.totalTestFiles}</div>
      <div class="stat-label">Test Files</div>
    </div>
  </div>

  <div class="atdd-section">
    <div class="atdd-title">
      <span>🔄 ATDD Cycle Progress</span>
    </div>
    <div class="atdd-grid">
      ${report.atddChecklist
        .map(
          (step) => `
        <div class="atdd-card">
          <div class="atdd-card-top">
            <span>${this._escapeHtml(step.title)}</span>
            <span class="atdd-status status-${step.status}">${step.status}</span>
          </div>
          <div class="atdd-desc">${this._escapeHtml(step.description)}</div>
        </div>`
        )
        .join('')}
    </div>
  </div>

  <div class="filter-bar">
    <input type="text" id="searchInput" class="search-input" placeholder="Search requirements, titles, or test files..." oninput="applyFilters()" />
    <div class="pills">
      <div class="pill active" data-status="all" onclick="setStatusFilter('all')">All (${report.totalRequirements})</div>
      <div class="pill" data-status="covered" onclick="setStatusFilter('covered')">Covered (${report.coveredRequirements})</div>
      <div class="pill" data-status="partial" onclick="setStatusFilter('partial')">Partial (${report.partialRequirements})</div>
      <div class="pill" data-status="uncovered" onclick="setStatusFilter('uncovered')">Uncovered (${report.uncoveredRequirements})</div>
    </div>
  </div>

  <table class="matrix-table">
    <thead>
      <tr>
        <th style="width: 100px;">Req ID</th>
        <th>Requirement Title</th>
        <th style="width: 120px;">Status</th>
        <th>Mapped Test Suites</th>
        <th style="width: 140px;">Actions</th>
      </tr>
    </thead>
    <tbody id="matrixBody"></tbody>
  </table>

  <script>
    const vscode = acquireVsCodeApi();
    const allTraces = ${matrixJson};
    let activeStatus = 'all';

    function setStatusFilter(status) {
      activeStatus = status;
      document.querySelectorAll('.pill').forEach(el => {
        el.classList.toggle('active', el.dataset.status === status);
      });
      applyFilters();
    }

    function applyFilters() {
      const q = document.getElementById('searchInput').value.toLowerCase().trim();
      const filtered = allTraces.filter(t => {
        if (activeStatus !== 'all' && t.status.toLowerCase() !== activeStatus.toLowerCase()) {
          return false;
        }
        if (q) {
          const matchId = t.id.toLowerCase().includes(q);
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchTest = t.mappedTestFiles.some(f => f.toLowerCase().includes(q));
          if (!matchId && !matchTitle && !matchTest) {
            return false;
          }
        }
        return true;
      });

      renderMatrix(filtered);
    }

    function renderMatrix(traces) {
      const tbody = document.getElementById('matrixBody');
      if (traces.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No matching requirements found.</td></tr>';
        return;
      }

      tbody.innerHTML = traces.map(t => {
        const badgeClass = 'cov-' + t.status.toLowerCase();
        const testLinks = t.mappedTestFiles.length > 0
          ? t.mappedTestFiles.map(f => '<span class="test-link" onclick="openTest(\\'' + escapeHtml(f) + '\\')">📄 ' + escapeHtml(f.split('/').pop()) + '</span>').join('')
          : '<span style="opacity:0.5; font-style:italic;">No automated tests mapped</span>';

        const actionBtn = t.status === 'uncovered'
          ? '<button class="btn btn-sm" style="background:#ef4444; color:#fff;" onclick="scaffold(\\'' + escapeHtml(t.id) + '\\')">Scaffold Tests</button>'
          : '<button class="btn btn-sm btn-secondary" onclick="runTests()">Run Test</button>';

        return '<tr>' +
          '<td><strong>' + escapeHtml(t.id) + '</strong></td>' +
          '<td>' + escapeHtml(t.title) + '</td>' +
          '<td><span class="badge-cov ' + badgeClass + '">' + escapeHtml(t.status) + '</span></td>' +
          '<td>' + testLinks + '</td>' +
          '<td>' + actionBtn + '</td>' +
        '</tr>';
      }).join('');
    }

    function openTest(path) {
      vscode.postMessage({ command: 'openTestFile', filePath: path });
    }

    function scaffold(id) {
      vscode.postMessage({ command: 'scaffoldTests', requirementId: id });
    }

    function runTests() {
      vscode.postMessage({ command: 'runTests' });
    }

    function talkToMurat() {
      vscode.postMessage({ command: 'talkToMurat' });
    }

    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    renderMatrix(allTraces);
  </script>
</body>
</html>`;
  }
}
