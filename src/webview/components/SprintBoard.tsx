import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { BmadKanbanBoard, BmadKanbanCard } from '../../core/types';

interface SprintBoardProps {
  kanban?: BmadKanbanBoard;
  onOpenStory: (storyKey: string) => Promise<void>;
}

export function SprintBoard({ kanban, onOpenStory }: SprintBoardProps) {
  const [epicFilter, setEpicFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionItemsExpanded, setActionItemsExpanded] = useState(true);

  if (!kanban || kanban.totalStories === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>
        <h3>No Sprint Tracking Data</h3>
        <p style={{ maxWidth: '440px', margin: '8px auto', lineHeight: '1.4' }}>
          No stories found in sprint-status.yaml. Run sprint planning to scaffold active stories.
        </p>
      </div>
    );
  }

  // Extract available epic numbers for filtering
  const availableEpics = useMemo(() => {
    const epics = new Set<number>();
    for (const col of kanban.columns) {
      for (const card of col.cards) {
        if (card.epicNum !== undefined) {
          epics.add(card.epicNum);
        }
      }
    }
    return Array.from(epics).sort((a, b) => a - b);
  }, [kanban]);

  // Filter cards by epic and search query
  const filterCard = (card: BmadKanbanCard) => {
    if (epicFilter !== 'all' && card.epicNum !== epicFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        card.key.toLowerCase().includes(q) ||
        card.title.toLowerCase().includes(q)
      );
    }
    return true;
  };

  const getColumnColor = (colId: string) => {
    switch (colId) {
      case 'done':
        return '#4EC9B0';
      case 'review':
        return '#CE9178';
      case 'in-progress':
        return '#569CD6';
      case 'ready-for-dev':
        return '#DCDCAA';
      default:
        return 'var(--vscode-descriptionForeground, #888888)';
    }
  };

  const getActionItemStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return { label: 'Done', color: '#4EC9B0', bg: 'rgba(78, 201, 176, 0.15)' };
      case 'in-progress':
        return { label: 'In Progress', color: '#569CD6', bg: 'rgba(86, 156, 214, 0.15)' };
      default:
        return { label: 'Open', color: '#CCA700', bg: 'rgba(204, 167, 0, 0.15)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* Top Sprint Metrics & Filters Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: 'var(--vscode-sideBar-background, #252526)',
          border: '1px solid var(--vscode-panel-border, #333)',
          borderRadius: '4px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>
              {kanban.project || 'Sprint Board'}
            </div>
            {kanban.lastUpdated && (
              <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
                Updated: {kanban.lastUpdated}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '120px',
                height: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${kanban.completionPercentage}%`,
                  height: '100%',
                  backgroundColor: '#4EC9B0',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#4EC9B0' }}>
              {kanban.completionPercentage}% Done ({kanban.completedStories}/{kanban.totalStories})
            </span>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Epic Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
              Epic:
            </span>
            <select
              value={epicFilter}
              onChange={(e: any) =>
                setEpicFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))
              }
              style={{
                backgroundColor: 'var(--vscode-input-background, #3c3c3c)',
                color: 'var(--vscode-input-foreground, #cccccc)',
                border: '1px solid var(--vscode-input-border, #3c3c3c)',
                borderRadius: '2px',
                padding: '3px 8px',
                fontSize: '11px'
              }}
            >
              <option value="all">All Epics</option>
              {availableEpics.map((ep) => (
                <option key={ep} value={ep}>
                  Epic {ep}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <input
            type="text"
            placeholder="Search stories..."
            value={searchQuery}
            onInput={(e: any) => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: 'var(--vscode-input-background, #3c3c3c)',
              color: 'var(--vscode-input-foreground, #cccccc)',
              border: '1px solid var(--vscode-input-border, #3c3c3c)',
              borderRadius: '2px',
              padding: '3px 8px',
              fontSize: '11px',
              width: '140px'
            }}
          />
        </div>
      </div>

      {/* Kanban Columns */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(220px, 1fr))',
          gap: '12px',
          alignItems: 'stretch',
          overflowX: 'auto',
          minHeight: '260px'
        }}
      >
        {kanban.columns.map((column) => {
          const filteredCards = column.cards.filter(filterCard);
          const colColor = getColumnColor(column.id);

          return (
            <div
              key={column.id}
              style={{
                backgroundColor: 'var(--vscode-sideBar-background, #252526)',
                border: '1px solid var(--vscode-panel-border, #333)',
                borderRadius: '5px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--vscode-panel-border, #333)',
                  borderTop: `3px solid ${colColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--vscode-editorGroupHeader-tabsBackground, #202020)'
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '12px', color: colColor }}>
                  {column.label}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    backgroundColor: 'var(--vscode-badge-background, #3a3d41)',
                    color: 'var(--vscode-badge-foreground, #fff)',
                    padding: '1px 6px',
                    borderRadius: '10px'
                  }}
                >
                  {filteredCards.length}
                </span>
              </div>

              {/* Cards List */}
              <div
                style={{
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  overflowY: 'auto',
                  flex: 1
                }}
              >
                {filteredCards.length === 0 ? (
                  <div
                    style={{
                      padding: '24px 8px',
                      textAlign: 'center',
                      fontSize: '11px',
                      color: 'var(--vscode-descriptionForeground)'
                    }}
                  >
                    No stories
                  </div>
                ) : (
                  filteredCards.map((card) => (
                    <div
                      key={card.key}
                      onClick={() => onOpenStory(card.key)}
                      title="Click to open story markdown file"
                      style={{
                        padding: '10px',
                        backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
                        border: '1px solid var(--vscode-panel-border, #333)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, transform 0.1s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      {/* Top tags */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {card.epicNum !== undefined && (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '1px 4px',
                              borderRadius: '2px',
                              backgroundColor: 'rgba(86, 156, 214, 0.2)',
                              color: '#569CD6'
                            }}
                          >
                            Epic {card.epicNum}
                          </span>
                        )}
                        {card.hasFile && (
                          <span
                            style={{
                              fontSize: '10px',
                              color: 'var(--vscode-descriptionForeground)'
                            }}
                          >
                            📄 Spec
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <div style={{ fontWeight: 600, fontSize: '12px', lineHeight: '1.3' }}>
                        {card.title}
                      </div>

                      {/* Story Key */}
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'var(--vscode-descriptionForeground)',
                          fontFamily: 'monospace'
                        }}
                      >
                        {card.key}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Retrospective Action Items Tray */}
      {kanban.actionItems && kanban.actionItems.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--vscode-sideBar-background, #252526)',
            border: '1px solid var(--vscode-panel-border, #333)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}
        >
          {/* Tray Toggle Header */}
          <div
            onClick={() => setActionItemsExpanded(!actionItemsExpanded)}
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--vscode-editorGroupHeader-tabsBackground, #202020)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600 }}>
              <span>{actionItemsExpanded ? '▼' : '▶'}</span>
              <span>Retrospective Action Items</span>
              <span
                style={{
                  fontSize: '10px',
                  backgroundColor: 'var(--vscode-badge-background, #3a3d41)',
                  color: 'var(--vscode-badge-foreground, #fff)',
                  padding: '1px 5px',
                  borderRadius: '10px'
                }}
              >
                {kanban.actionItems.length}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
              {actionItemsExpanded ? 'Collapse' : 'Expand'}
            </span>
          </div>

          {/* Action Items List */}
          {actionItemsExpanded && (
            <div
              style={{
                padding: '12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '10px',
                maxHeight: '180px',
                overflowY: 'auto'
              }}
            >
              {kanban.actionItems.map((item) => {
                const badge = getActionItemStatusBadge(item.status);
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '8px 10px',
                      backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
                      border: '1px solid var(--vscode-panel-border, #333)',
                      borderRadius: '3px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{item.title}</div>
                      {item.owner && (
                        <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', marginTop: '2px' }}>
                          Owner: {item.owner}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        padding: '1px 5px',
                        borderRadius: '2px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.color}`,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
