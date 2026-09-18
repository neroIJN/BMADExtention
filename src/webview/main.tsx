import { render } from 'preact';

function App() {
  return (
    <div style={{ padding: '16px', fontFamily: 'var(--vscode-font-family)' }}>
      <h2>BMAD Method Dashboard</h2>
      <p>Visualizer Cockpit Initialized.</p>
    </div>
  );
}

const container = document.getElementById('app');
if (container) {
  render(<App />, container);
}
