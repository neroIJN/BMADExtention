import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import {
  BmadKanbanBoard,
  BmadKanbanCard,
  BmadKanbanColumn,
  BmadSprintActionItem
} from './types';

const CANONICAL_COLUMNS: Array<{ id: BmadKanbanColumn['id']; label: string }> = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'ready-for-dev', label: 'Ready for Dev' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' }
];

function formatStoryTitle(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Parses sprint-status.yaml content into an interactive Kanban board model (AD-5, AD-6).
 */
export function parseKanbanBoard(yamlContent?: string, artifactsDir?: string): BmadKanbanBoard {
  const columnMap = new Map<BmadKanbanColumn['id'], BmadKanbanCard[]>();
  for (const col of CANONICAL_COLUMNS) {
    columnMap.set(col.id, []);
  }

  const actionItems: BmadSprintActionItem[] = [];

  if (!yamlContent || typeof yamlContent !== 'string' || !yamlContent.trim()) {
    return {
      columns: CANONICAL_COLUMNS.map((col) => ({ id: col.id, label: col.label, cards: [] })),
      actionItems: [],
      totalStories: 0,
      completedStories: 0,
      completionPercentage: 0
    };
  }

  let data: any;
  try {
    data = yaml.load(yamlContent);
  } catch (err) {
    console.warn('[KanbanParser] Failed to parse YAML:', err);
    return {
      columns: CANONICAL_COLUMNS.map((col) => ({ id: col.id, label: col.label, cards: [] })),
      actionItems: [],
      totalStories: 0,
      completedStories: 0,
      completionPercentage: 0
    };
  }

  if (!data || typeof data !== 'object') {
    return {
      columns: CANONICAL_COLUMNS.map((col) => ({ id: col.id, label: col.label, cards: [] })),
      actionItems: [],
      totalStories: 0,
      completedStories: 0,
      completionPercentage: 0
    };
  }

  // Scan artifact directory for matching spec files if available
  let artifactFiles: string[] = [];
  if (artifactsDir && fs.existsSync(artifactsDir)) {
    try {
      artifactFiles = fs.readdirSync(artifactsDir);
    } catch {
      artifactFiles = [];
    }
  }

  const devStatus = data.development_status || {};
  for (const [key, rawStatus] of Object.entries(devStatus)) {
    // Exclude epic summaries and retrospective flags
    if (key.startsWith('epic-') || key.endsWith('-retrospective')) {
      continue;
    }

    const statusStr = String(rawStatus || 'backlog').trim().toLowerCase();
    let colId: BmadKanbanColumn['id'] = 'backlog';

    if (statusStr === 'ready-for-dev' || statusStr === 'ready') {
      colId = 'ready-for-dev';
    } else if (statusStr === 'in-progress' || statusStr === 'inprogress') {
      colId = 'in-progress';
    } else if (statusStr === 'review' || statusStr === 'in-review') {
      colId = 'review';
    } else if (statusStr === 'done' || statusStr === 'completed') {
      colId = 'done';
    } else {
      colId = 'backlog';
    }

    // Extract epic number and readable title
    const match = key.match(/^(\d+)-(\d+)-(.*)$/);
    let epicNum: number | undefined;
    let title = key;

    if (match) {
      epicNum = parseInt(match[1], 10);
      title = formatStoryTitle(match[3]);
    } else {
      title = formatStoryTitle(key);
    }

    // Check if matching spec markdown exists
    const matchingFile = artifactFiles.find(
      (f) => (f.includes(key) || f === `spec-${key}.md`) && f.endsWith('.md')
    );

    const card: BmadKanbanCard = {
      key,
      title,
      epicNum,
      status: colId,
      specFileName: matchingFile,
      hasFile: !!matchingFile
    };

    columnMap.get(colId)?.push(card);
  }

  // Parse action items
  if (Array.isArray(data.action_items)) {
    data.action_items.forEach((item: any, idx: number) => {
      if (item && typeof item === 'object') {
        const itemStatus = String(item.status || 'open').toLowerCase();
        actionItems.push({
          id: item.id || `action-${idx + 1}`,
          title: item.title || 'Untitled Action Item',
          status: itemStatus === 'done' ? 'done' : itemStatus === 'in-progress' ? 'in-progress' : 'open',
          owner: item.owner
        });
      }
    });
  }

  const columns: BmadKanbanColumn[] = CANONICAL_COLUMNS.map((col) => ({
    id: col.id,
    label: col.label,
    cards: columnMap.get(col.id) || []
  }));

  const totalStories = columns.reduce((acc, col) => acc + col.cards.length, 0);
  const completedStories = columnMap.get('done')?.length || 0;
  const completionPercentage = totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0;

  return {
    project: data.project,
    lastUpdated: data.last_updated,
    columns,
    actionItems,
    totalStories,
    completedStories,
    completionPercentage
  };
}
