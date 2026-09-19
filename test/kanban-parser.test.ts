import { describe, it, expect } from 'vitest';
import { parseKanbanBoard } from '../src/core/kanban-parser';

describe('KanbanParser', () => {
  const sampleYaml = `
project: BMADExtention
last_updated: 09-19-2026 14:00
development_status:
  epic-1: done
  1-1-extension-scaffolding: done
  1-2-dynamic-config: done
  epic-1-retrospective: optional

  epic-2: in-progress
  2-1-agents-hub: in-progress
  2-2-execution-dispatcher: ready-for-dev
  2-3-command-palette: backlog

  epic-3: in-progress
  3-1-artifacts-explorer: review

action_items:
  - id: act-1
    title: Add e2e testing pipeline
    status: in-progress
    owner: Murat
  - id: act-2
    title: Standardize icon assets
    status: open
    owner: Sally
`;

  it('should correctly parse stories into canonical columns and compute metrics', () => {
    const board = parseKanbanBoard(sampleYaml);

    expect(board.project).toBe('BMADExtention');
    expect(board.lastUpdated).toBe('09-19-2026 14:00');
    expect(board.totalStories).toBe(6);
    expect(board.completedStories).toBe(2);
    expect(board.completionPercentage).toBe(33);

    const doneCol = board.columns.find((c) => c.id === 'done');
    expect(doneCol?.cards).toHaveLength(2);
    expect(doneCol?.cards[0].key).toBe('1-1-extension-scaffolding');
    expect(doneCol?.cards[0].epicNum).toBe(1);

    const inProgressCol = board.columns.find((c) => c.id === 'in-progress');
    expect(inProgressCol?.cards).toHaveLength(1);
    expect(inProgressCol?.cards[0].key).toBe('2-1-agents-hub');

    const reviewCol = board.columns.find((c) => c.id === 'review');
    expect(reviewCol?.cards).toHaveLength(1);
    expect(reviewCol?.cards[0].key).toBe('3-1-artifacts-explorer');

    const readyCol = board.columns.find((c) => c.id === 'ready-for-dev');
    expect(readyCol?.cards).toHaveLength(1);
    expect(readyCol?.cards[0].key).toBe('2-2-execution-dispatcher');

    const backlogCol = board.columns.find((c) => c.id === 'backlog');
    expect(backlogCol?.cards).toHaveLength(1);
    expect(backlogCol?.cards[0].key).toBe('2-3-command-palette');
  });

  it('should parse retrospective action items with their status and owner', () => {
    const board = parseKanbanBoard(sampleYaml);

    expect(board.actionItems).toHaveLength(2);
    expect(board.actionItems[0]).toEqual({
      id: 'act-1',
      title: 'Add e2e testing pipeline',
      status: 'in-progress',
      owner: 'Murat'
    });
    expect(board.actionItems[1]).toEqual({
      id: 'act-2',
      title: 'Standardize icon assets',
      status: 'open',
      owner: 'Sally'
    });
  });

  it('should ignore epic milestones and retrospective markers from story columns', () => {
    const board = parseKanbanBoard(sampleYaml);
    const allCards = board.columns.flatMap((c) => c.cards);

    const hasEpic1 = allCards.some((c) => c.key === 'epic-1');
    const hasRetro = allCards.some((c) => c.key === 'epic-1-retrospective');

    expect(hasEpic1).toBe(false);
    expect(hasRetro).toBe(false);
  });

  it('should gracefully handle empty or invalid YAML input', () => {
    const emptyBoard = parseKanbanBoard('');
    expect(emptyBoard.totalStories).toBe(0);
    expect(emptyBoard.columns).toHaveLength(5);
    expect(emptyBoard.actionItems).toHaveLength(0);

    const invalidBoard = parseKanbanBoard(':::INVALID YAML:::');
    expect(invalidBoard.totalStories).toBe(0);
    expect(invalidBoard.columns).toHaveLength(5);
  });
});
