import * as vscode from 'vscode';
import { BmadMemlogDocument } from '../core/types';
import { loadMemlogFile, parseMemlogContent } from '../core/memlog-parser';

/**
 * Manages the interactive Webview panel for inspecting .memlog.md timelines.
 */
export class MemlogInspectorPanel {
  public static currentPanel: MemlogInspectorPanel | undefined;
  public static readonly viewType = 'bmad.memlogInspector';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _document: BmadMemlogDocument;
  private _disposables: vscode.Disposable[] = [];

  public static async createOrShow(
    extensionUri: vscode.Uri,
    filePath: string
  ): Promise<MemlogInspectorPanel | undefined> {
    const document = await loadMemlogFile(filePath);
    if (!document) {
      vscode.window.showErrorMessage(`Could not load memlog from ${filePath}`);
      return undefined;
    }

    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (MemlogInspectorPanel.currentPanel) {
      MemlogInspectorPanel.currentPanel._panel.reveal(column);
      MemlogInspectorPanel.currentPanel.update(document);
      return MemlogInspectorPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      MemlogInspectorPanel.viewType,
      `Memlog: ${document.metadata.topic || 'Timeline'}`,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    MemlogInspectorPanel.currentPanel = new MemlogInspectorPanel(panel, extensionUri, document);
    return MemlogInspectorPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    document: BmadMemlogDocument
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._document = document;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'openSourceFile':
            if (this._document.filePath) {
              await vscode.commands.executeCommand(
                'vscode.open',
                vscode.Uri.file(this._document.filePath)
              );
            }
            break;
          case 'refresh':
            const reloaded = await loadMemlogFile(this._document.filePath);
            if (reloaded) {
              this.update(reloaded);
            }
            break;
        }
      },
      null,
      this._disposables
    );

    this._render();
  }

  public update(document: BmadMemlogDocument): void {
    this._document = document;
    this._panel.title = `Memlog: ${document.metadata.topic || 'Timeline'}`;
    this._render();
  }

  public dispose(): void {
    MemlogInspectorPanel.currentPanel = undefined;
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
    const doc = this._document;
    const meta = doc.metadata;

    const topic = this._escapeHtml(meta.topic || 'Working Memory Log');
    const goal = meta.goal ? this._escapeHtml(meta.goal) : undefined;
    const updated = meta.updated ? this._escapeHtml(meta.updated) : undefined;
    const entriesJson = JSON.stringify(doc.entries);
    const availableTypes = ['all', ...doc.availableTypes];

    this._panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BMAD Memlog Timeline Inspector</title>
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
      margin-bottom: 20px;
    }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
      margin: 0;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .meta-box {
      margin-top: 10px;
      font-size: 0.9rem;
      opacity: 0.85;
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
    }
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
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    button.btn:hover {
      background-color: var(--btn-hover);
    }
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-bottom: 24px;
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
      min-width: 260px;
      flex: 1;
    }
    .search-input:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    .pills {
      display: flex;
      flex-wrap: wrap;
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
      transition: background 0.15s ease;
    }
    .pill.active {
      background: var(--btn-bg);
      color: var(--btn-fg);
      font-weight: bold;
    }
    .timeline {
      position: relative;
      margin-left: 20px;
      padding-left: 24px;
      border-left: 2px solid var(--border);
    }
    .entry {
      position: relative;
      margin-bottom: 18px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px 16px;
      transition: transform 0.1s ease;
    }
    .entry:hover {
      transform: translateX(4px);
    }
    .entry::before {
      content: '';
      position: absolute;
      left: -31px;
      top: 16px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--border);
      border: 2px solid var(--bg);
    }
    .entry-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 0.8rem;
    }
    .badge {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-decision { background: #8a2be2; color: #fff; }
    .badge-assumption { background: #d97706; color: #fff; }
    .badge-insight { background: #0284c7; color: #fff; }
    .badge-idea { background: #16a34a; color: #fff; }
    .badge-question { background: #dc2626; color: #fff; }
    .badge-direction { background: #2563eb; color: #fff; }
    .badge-event { background: #64748b; color: #fff; }
    .badge-technique { background: #0d9488; color: #fff; }
    .badge-note { background: #71717a; color: #fff; }
    .author-chip {
      opacity: 0.75;
      font-style: italic;
    }
    .index-num {
      opacity: 0.5;
      margin-left: auto;
      font-family: monospace;
      font-size: 0.75rem;
    }
    .entry-text {
      font-size: 0.95rem;
      word-break: break-word;
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
      <h1>🧠 ${topic}</h1>
      <div class="actions">
        <button class="btn" onclick="openFile()">Open File</button>
        <button class="btn" onclick="refresh()">Refresh</button>
      </div>
    </div>
    <div class="meta-box">
      ${goal ? `<div><strong>Goal:</strong> ${goal}</div>` : ''}
      ${updated ? `<div><strong>Updated:</strong> ${updated}</div>` : ''}
      <div><strong>Total Entries:</strong> <span id="countDisplay">${doc.entryCount}</span></div>
    </div>
  </div>

  <div class="filter-bar">
    <input type="text" id="searchInput" class="search-input" placeholder="Search timeline entries by keyword or author..." oninput="applyFilters()" />
    <div class="pills" id="pillsContainer">
      ${availableTypes.map((t) => `<div class="pill ${t === 'all' ? 'active' : ''}" data-type="${t}" onclick="setTypeFilter('${t}')">${t}</div>`).join('')}
    </div>
  </div>

  <div class="timeline" id="timelineContainer"></div>

  <script>
    const vscode = acquireVsCodeApi();
    const allEntries = ${entriesJson};
    let activeType = 'all';

    function setTypeFilter(type) {
      activeType = type;
      document.querySelectorAll('.pill').forEach(el => {
        el.classList.toggle('active', el.dataset.type === type);
      });
      applyFilters();
    }

    function applyFilters() {
      const q = document.getElementById('searchInput').value.toLowerCase().trim();
      const filtered = allEntries.filter(entry => {
        if (activeType !== 'all' && entry.type.toLowerCase() !== activeType.toLowerCase()) {
          return false;
        }
        if (q) {
          const matchText = entry.text.toLowerCase().includes(q);
          const matchType = entry.type.toLowerCase().includes(q);
          const matchAuthor = entry.author ? entry.author.toLowerCase().includes(q) : false;
          if (!matchText && !matchType && !matchAuthor) {
            return false;
          }
        }
        return true;
      });

      renderTimeline(filtered);
      document.getElementById('countDisplay').innerText = filtered.length + ' / ' + allEntries.length;
    }

    function renderTimeline(entries) {
      const container = document.getElementById('timelineContainer');
      if (entries.length === 0) {
        container.innerHTML = '<div class="empty-state">No matching memory log entries found.</div>';
        return;
      }

      container.innerHTML = entries.map(entry => {
        const typeClass = 'badge-' + (entry.type || 'note').toLowerCase();
        const authorHtml = entry.author ? '<span class="author-chip">by ' + escapeHtml(entry.author) + '</span>' : '';
        return '<div class="entry">' +
          '<div class="entry-header">' +
            '<span class="badge ' + typeClass + '">' + escapeHtml(entry.type) + '</span>' +
            authorHtml +
            '<span class="index-num">#' + (entry.index + 1) + '</span>' +
          '</div>' +
          '<div class="entry-text">' + escapeHtml(entry.text) + '</div>' +
        '</div>';
      }).join('');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function openFile() {
      vscode.postMessage({ command: 'openSourceFile' });
    }

    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }

    // Initial render
    renderTimeline(allEntries);
  </script>
</body>
</html>`;
  }
}
