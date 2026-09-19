import { render, h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { rpcClient } from './rpc-client';
import { BmadDashboardState } from '../core/types';
import { PipelineDag } from './components/PipelineDag';
import { SprintBoard } from './components/SprintBoard';

export function App() {
  const [state, setState] = useState<BmadDashboardState | null>(null);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'sprint'>('pipeline');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [executingSkill, setExecutingSkill] = useState<string | null>(null);

  const fetchState = async () => {
    try {
      setConnectionStatus('connecting');
      const response = await rpcClient.sendRequest<Record<string, never>, BmadDashboardState>('getState', {});
      setState(response);
      if (response.activeTab) {
        setActiveTab(response.activeTab);
      }
      setConnectionStatus('connected');
      setErrorMessage(null);
    } catch (err: any) {
      setConnectionStatus('error');
      setErrorMessage(err?.message || 'Failed to connect to Extension Host');
    }
  };

  useEffect(() => {
    fetchState();

    // Subscribe to state updates pushed from Extension Host
    const unsubscribe = rpcClient.onEvent<BmadDashboardState>('stateUpdated', (updatedState) => {
      setState(updatedState);
      if (updatedState.activeTab) {
        setActiveTab(updatedState.activeTab);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleTabSwitch = async (tab: 'pipeline' | 'sprint') => {
    setActiveTab(tab);
    try {
      await rpcClient.sendRequest('switchTab', { tab });
    } catch {
      // Best-effort notification
    }
  };

  const handleExecuteSkill = async (skillId: string, command?: string) => {
    try {
      setExecutingSkill(skillId);
      await rpcClient.sendRequest('executeSkill', { skillId, command });
    } catch (err: any) {
      alert(`Execution failed: ${err?.message || err}`);
    } finally {
      setExecutingSkill(null);
    }
  };

  const handleOpenStory = async (storyKey: string) => {
    try {
      await rpcClient.sendRequest('openStory', { storyKey });
    } catch (err: any) {
      console.warn('Could not open story:', err);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        return '#4EC9B0';
      case 'in-progress':
        return '#569CD6';
      case 'review':
        return '#CE9178';
      case 'ready-for-dev':
        return '#DCDCAA';
      default:
        return 'var(--vscode-descriptionForeground)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--vscode-panel-border, #333)',
          backgroundColor: 'var(--vscode-editorGroupHeader-tabsBackground, #252526)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px' }}>
            BMAD VISUAL COCKPIT
          </span>
          {state?.version && (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '3px',
                backgroundColor: 'var(--vscode-badge-background, #3a3d41)',
                color: 'var(--vscode-badge-foreground, #fff)'
              }}
            >
              v{state.version}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Connection Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                display: 'inline-block',
                backgroundColor:
                  connectionStatus === 'connected'
                    ? '#4EC9B0'
                    : connectionStatus === 'connecting'
                    ? '#CCA700'
                    : '#F14C4C'
              }}
            />
            <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
              {connectionStatus === 'connected'
                ? 'Connected (JSON-RPC)'
                : connectionStatus === 'connecting'
                ? 'Connecting...'
                : 'Disconnected'}
            </span>
          </div>

          <button
            onClick={fetchState}
            style={{
              padding: '4px 10px',
              backgroundColor: 'var(--vscode-button-secondaryBackground, #3a3d41)',
              color: 'var(--vscode-button-secondaryForeground, #fff)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav
        style={{
          display: 'flex',
          gap: '2px',
          padding: '0 16px',
          borderBottom: '1px solid var(--vscode-panel-border, #333)',
          backgroundColor: 'var(--vscode-sideBar-background, #1e1e1e)'
        }}
      >
        <button
          onClick={() => handleTabSwitch('pipeline')}
          style={{
            padding: '8px 16px',
            backgroundColor:
              activeTab === 'pipeline'
                ? 'var(--vscode-tab-activeBackground, #1e1e1e)'
                : 'transparent',
            color:
              activeTab === 'pipeline'
                ? 'var(--vscode-tab-activeForeground, #ffffff)'
                : 'var(--vscode-tab-inactiveForeground, #888888)',
            border: 'none',
            borderBottom:
              activeTab === 'pipeline'
                ? '2px solid var(--vscode-tab-activeBorderTop, #007ACC)'
                : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: activeTab === 'pipeline' ? 600 : 400
          }}
        >
          Pipeline DAG Visualizer
        </button>

        <button
          onClick={() => handleTabSwitch('sprint')}
          style={{
            padding: '8px 16px',
            backgroundColor:
              activeTab === 'sprint'
                ? 'var(--vscode-tab-activeBackground, #1e1e1e)'
                : 'transparent',
            color:
              activeTab === 'sprint'
                ? 'var(--vscode-tab-activeForeground, #ffffff)'
                : 'var(--vscode-tab-inactiveForeground, #888888)',
            border: 'none',
            borderBottom:
              activeTab === 'sprint'
                ? '2px solid var(--vscode-tab-activeBorderTop, #007ACC)'
                : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: activeTab === 'sprint' ? 600 : 400
          }}
        >
          Sprint Kanban Board
        </button>
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: '16px',
              backgroundColor: 'rgba(241, 76, 76, 0.15)',
              border: '1px solid #F14C4C',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <strong>Error: </strong> {errorMessage}
          </div>
        )}

        {!state?.isBmad ? (
          <div
            style={{
              padding: '32px',
              textAlign: 'center',
              color: 'var(--vscode-descriptionForeground)'
            }}
          >
            <h3>No BMAD Method Installation Detected</h3>
            <p style={{ maxWidth: '480px', margin: '12px auto', lineHeight: '1.5' }}>
              To initialize BMAD in this workspace, install the BMad CLI or run setup commands.
            </p>
          </div>
        ) : activeTab === 'pipeline' ? (
          <PipelineDag
            dag={state.dag}
            onExecuteSkill={handleExecuteSkill}
            executingSkill={executingSkill}
          />
        ) : (
          <SprintBoard
            kanban={state.kanban}
            onOpenStory={handleOpenStory}
          />
        )}
      </main>
    </div>
  );
}

const container = document.getElementById('app');
if (container) {
  render(<App />, container);
}
