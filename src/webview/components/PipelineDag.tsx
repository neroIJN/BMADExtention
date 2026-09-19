import { h } from 'preact';
import { useState } from 'preact/hooks';
import { BmadDagNode, BmadPipelineDag } from '../../core/types';

interface PipelineDagProps {
  dag?: BmadPipelineDag;
  onExecuteSkill: (skillId: string, command?: string) => Promise<void>;
  executingSkill: string | null;
}

export function PipelineDag({ dag, onExecuteSkill, executingSkill }: PipelineDagProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  if (!dag || !dag.phases || dag.phases.length === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>
        <h3>No Pipeline DAG Data</h3>
        <p>Ensure BMAD lifecycle configuration is present in the workspace.</p>
      </div>
    );
  }

  const selectedNode = dag.nodes.find((n) => n.id === selectedNodeId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4EC9B0';
      case 'in-progress':
        return '#569CD6';
      case 'blocked':
        return '#F14C4C';
      default:
        return 'var(--vscode-descriptionForeground, #888888)';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', bg: 'rgba(78, 201, 176, 0.15)', border: '#4EC9B0', icon: '✓' };
      case 'in-progress':
        return { label: 'In Progress', bg: 'rgba(86, 156, 214, 0.15)', border: '#569CD6', icon: '⟳' };
      case 'blocked':
        return { label: 'Gate Blocked', bg: 'rgba(241, 76, 76, 0.15)', border: '#F14C4C', icon: '⛔' };
      default:
        return { label: 'Pending', bg: 'rgba(136, 136, 136, 0.12)', border: '#888888', icon: '⏳' };
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* DAG Flow Stage Columns */}
      <div
        style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'auto',
          display: 'flex',
          gap: '20px',
          padding: '16px',
          alignItems: 'flex-start'
        }}
      >
        {dag.phases.map((phaseGroup, idx) => (
          <div
            key={phaseGroup.id}
            style={{
              minWidth: '260px',
              maxWidth: '300px',
              flex: '0 0 280px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Phase Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: 'var(--vscode-editorGroupHeader-tabsBackground, #252526)',
                border: '1px solid var(--vscode-panel-border, #333)',
                borderRadius: '4px',
                position: 'sticky',
                top: 0,
                zIndex: 2
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--vscode-badge-background, #3a3d41)',
                    color: 'var(--vscode-badge-foreground, #fff)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 600
                  }}
                >
                  {phaseGroup.order}
                </span>
                <span style={{ fontWeight: 600, fontSize: '12px' }}>{phaseGroup.label}</span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--vscode-descriptionForeground)'
                }}
              >
                {phaseGroup.nodes.length}
              </span>
            </div>

            {/* Nodes in Phase */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {phaseGroup.nodes.map((node) => {
                const badge = getStatusBadge(node.status);
                const isSelected = selectedNodeId === node.id;

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                        : 'var(--vscode-sideBar-background, #252526)',
                      border: `1px solid ${isSelected ? 'var(--vscode-focusBorder, #007ACC)' : badge.border}`,
                      borderRadius: '5px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background-color 0.15s',
                      boxShadow: isSelected ? '0 0 8px rgba(0, 122, 204, 0.4)' : 'none'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '6px'
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '13px', lineHeight: '1.3' }}>
                        {node.name}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          backgroundColor: badge.bg,
                          color: badge.border,
                          border: `1px solid ${badge.border}`,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {badge.icon} {badge.label}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: '11px',
                        color: isSelected
                          ? 'var(--vscode-list-activeSelectionForeground, #fff)'
                          : 'var(--vscode-descriptionForeground)',
                        margin: '6px 0 10px 0',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {node.description}
                    </p>

                    {/* Preceded by count and outputs */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '10px',
                        color: 'var(--vscode-descriptionForeground)'
                      }}
                    >
                      <span>
                        {node.precededBy.length > 0
                          ? `Requires ${node.precededBy.length} prereq${node.precededBy.length > 1 ? 's' : ''}`
                          : 'No prerequisites'}
                      </span>
                      {node.followedBy.length > 0 && <span>Unlocks {node.followedBy.length}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Slide-out Detail Drawer */}
      {selectedNode && (
        <aside
          style={{
            width: '340px',
            backgroundColor: 'var(--vscode-sideBar-background, #252526)',
            borderLeft: '1px solid var(--vscode-panel-border, #333)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.35)',
            overflowY: 'auto'
          }}
        >
          {/* Drawer Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--vscode-panel-border, #333)'
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '13px' }}>Skill Node Details</span>
            <button
              onClick={() => setSelectedNodeId(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--vscode-editor-foreground)',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Title & Status */}
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>{selectedNode.name}</h4>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '3px',
                    border: `1px solid ${getStatusColor(selectedNode.status)}`,
                    color: getStatusColor(selectedNode.status)
                  }}
                >
                  {getStatusBadge(selectedNode.status).icon} {getStatusBadge(selectedNode.status).label}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
                  {selectedNode.phaseLabel}
                </span>
              </div>
            </div>

            {/* Blocker warning if blocked */}
            {selectedNode.status === 'blocked' && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(241, 76, 76, 0.12)',
                  border: '1px solid #F14C4C',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#F14C4C'
                }}
              >
                <strong>Gate Blocked: </strong>
                {selectedNode.blockerReason || 'Prerequisites must be completed first.'}
              </div>
            )}

            {/* Description */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--vscode-descriptionForeground)' }}>
                Description
              </span>
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', lineHeight: '1.5' }}>
                {selectedNode.description}
              </p>
            </div>

            {/* Inputs & Outputs */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--vscode-descriptionForeground)' }}>
                Inputs & Outputs
              </span>
              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--vscode-descriptionForeground)' }}>Inputs: </span>
                  {selectedNode.inputs.join(', ')}
                </div>
                <div>
                  <span style={{ color: 'var(--vscode-descriptionForeground)' }}>Outputs: </span>
                  {selectedNode.outputs.join(', ')}
                </div>
              </div>
            </div>

            {/* Dependencies */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--vscode-descriptionForeground)' }}>
                Dependencies
              </span>
              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--vscode-descriptionForeground)' }}>Preceded by: </span>
                  {selectedNode.precededBy.length > 0 ? selectedNode.precededBy.join(', ') : 'None (Phase entrypoint)'}
                </div>
                <div>
                  <span style={{ color: 'var(--vscode-descriptionForeground)' }}>Followed by: </span>
                  {selectedNode.followedBy.length > 0 ? selectedNode.followedBy.join(', ') : 'Terminal or optional'}
                </div>
              </div>
            </div>

            {/* Execution Action Button */}
            <div style={{ paddingTop: '8px' }}>
              <button
                onClick={() => onExecuteSkill(selectedNode.id, selectedNode.command)}
                disabled={executingSkill === selectedNode.id}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--vscode-button-background, #0E639C)',
                  color: 'var(--vscode-button-foreground, #fff)',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '12px'
                }}
              >
                {executingSkill === selectedNode.id ? 'Executing...' : `Run Skill (${selectedNode.command || selectedNode.id})`}
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
