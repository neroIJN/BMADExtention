import { render, h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { rpcClient } from './rpc-client';
import { BmadDashboardState } from '../core/types';

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
          /* Pipeline DAG Tab */
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '15px' }}>BMAD Method Pipeline Workflow</h3>
                <span style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                  Interactive node graph and stage dependencies ({state.skills?.length || 0} skills configured)
                </span>
              </div>
            </div>

            {state.skills && state.skills.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '12px'
                }}
              >
                {state.skills.map((skill) => (
                  <div
                    key={skill.id}
                    style={{
                      border: '1px solid var(--vscode-panel-border, #333)',
                      borderRadius: '4px',
                      padding: '12px',
                      backgroundColor: 'var(--vscode-sideBar-background, #252526)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px'
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{skill.name}</span>
                        <span
                          style={{
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            border: `1px solid ${getStatusBadgeColor(skill.artifactStatus || 'pending')}`,
                            color: getStatusBadgeColor(skill.artifactStatus || 'pending')
                          }}
                        >
                          {skill.artifactStatus || 'pending'}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: '4px 0 12px 0',
                          fontSize: '11px',
                          color: 'var(--vscode-descriptionForeground)',
                          lineHeight: '1.4'
                        }}
                      >
                        {skill.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleExecuteSkill(skill.id, skill.command)}
                      disabled={executingSkill === skill.id}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '4px 10px',
                        backgroundColor: 'var(--vscode-button-background, #0E639C)',
                        color: 'var(--vscode-button-foreground, #fff)',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      {executingSkill === skill.id ? 'Executing...' : 'Run Skill'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px' }}>
                No skills detected in lifecycle configuration.
              </p>
            )}
          </div>
        ) : (
          /* Sprint Kanban Board Tab */
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '15px' }}>Sprint Kanban Management</h3>
                <span style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                  Live board projected from sprint-status.yaml
                </span>
              </div>
              {state.sprintStatus?.lastUpdated && (
                <span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
                  Last Updated: {state.sprintStatus.lastUpdated}
                </span>
              )}
            </div>

            {state.sprintStatus ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  alignItems: 'start'
                }}
              >
                {(['backlog', 'ready-for-dev', 'in-progress', 'review', 'done'] as const).map((colStatus) => {
                  const stories = Object.entries(state.sprintStatus?.developmentStatus || {}).filter(
                    ([k, v]) => !k.startsWith('epic-') && !k.endsWith('-retrospective') && v === colStatus
                  );

                  return (
                    <div
                      key={colStatus}
                      style={{
                        backgroundColor: 'var(--vscode-sideBar-background, #252526)',
                        border: '1px solid var(--vscode-panel-border, #333)',
                        borderRadius: '4px',
                        padding: '8px'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingBottom: '8px',
                          marginBottom: '8px',
                          borderBottom: '1px solid var(--vscode-panel-border, #333)'
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            color: getStatusBadgeColor(colStatus)
                          }}
                        >
                          {colStatus}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            backgroundColor: 'var(--vscode-badge-background, #3a3d41)',
                            color: 'var(--vscode-badge-foreground, #fff)',
                            padding: '1px 5px',
                            borderRadius: '10px'
                          }}
                        >
                          {stories.length}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {stories.length === 0 ? (
                          <div
                            style={{
                              padding: '12px',
                              textAlign: 'center',
                              fontSize: '11px',
                              color: 'var(--vscode-descriptionForeground)'
                            }}
                          >
                            Empty
                          </div>
                        ) : (
                          stories.map(([storyKey]) => (
                            <div
                              key={storyKey}
                              onClick={() => handleOpenStory(storyKey)}
                              style={{
                                padding: '8px 10px',
                                backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
                                border: '1px solid var(--vscode-panel-border, #333)',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                            >
                              <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{storyKey}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px' }}>
                No sprint-status.yaml tracking file detected in workspace.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const container = document.getElementById('app');
if (container) {
  render(<App />, container);
}
