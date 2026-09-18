import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  splitMemlog,
  parseMemlogContent,
  filterMemlogEntries,
  findMemlogFiles,
  loadMemlogFile
} from '../src/core/memlog-parser';

describe('MemlogParser', () => {
  const sampleMemlog = `---
topic: Onboarding flow for a budgeting app
goal: lift week-1 retention
updated: 2026-06-07T14:22
---

- (note) user picked techniques: SCAMPER, then Six Thinking Hats
- (technique) started SCAMPER
- (idea) skip the signup wall: let people try with sample data first
- (idea by user) auto-import one bank account so the first screen shows real numbers
- (question) is open-banking consent too heavy for step one?
- (insight) the scary numbers risk and real numbers idea are one lever: show real data
- (direction) optimize for the anxious first-timer, not the power user
- (decision by architect) lead with one pre-categorized account; defer multi-account import
- (by coach) maintain focus on core friction
- plain note without tag
- (event) session complete
`;

  describe('splitMemlog', () => {
    it('should extract frontmatter metadata and body', () => {
      const { metadata, body } = splitMemlog(sampleMemlog);
      expect(metadata.topic).toBe('Onboarding flow for a budgeting app');
      expect(metadata.goal).toBe('lift week-1 retention');
      expect(metadata.updated).toBe('2026-06-07T14:22');
      expect(body).toContain('- (note) user picked techniques');
    });

    it('should return empty metadata if frontmatter is missing', () => {
      const text = '- (idea) build an app\n- (decision) go fast';
      const { metadata, body } = splitMemlog(text);
      expect(metadata).toEqual({});
      expect(body).toBe(text);
    });

    it('should handle unterminated frontmatter gracefully', () => {
      const text = '---\ntopic: missing closing fence\ngoal: test';
      const { metadata, body } = splitMemlog(text);
      expect(metadata).toEqual({});
      expect(body).toBe(text);
    });
  });

  describe('parseMemlogContent', () => {
    it('should parse standard memlog entries with types and authors', () => {
      const doc = parseMemlogContent(sampleMemlog, 'test/.memlog.md');
      expect(doc.filePath).toBe('test/.memlog.md');
      expect(doc.entryCount).toBe(11);
      expect(doc.metadata.topic).toBe('Onboarding flow for a budgeting app');

      // Entry 0: - (note) user picked techniques: SCAMPER, then Six Thinking Hats
      expect(doc.entries[0].type).toBe('note');
      expect(doc.entries[0].author).toBeUndefined();
      expect(doc.entries[0].text).toBe('user picked techniques: SCAMPER, then Six Thinking Hats');

      // Entry 3: - (idea by user) auto-import one bank account
      expect(doc.entries[3].type).toBe('idea');
      expect(doc.entries[3].author).toBe('user');
      expect(doc.entries[3].text).toContain('auto-import one bank account');

      // Entry 7: - (decision by architect) lead with one pre-categorized account
      expect(doc.entries[7].type).toBe('decision');
      expect(doc.entries[7].author).toBe('architect');
      expect(doc.entries[7].text).toContain('lead with one pre-categorized account');

      // Entry 8: - (by coach) maintain focus on core friction
      expect(doc.entries[8].type).toBe('note');
      expect(doc.entries[8].author).toBe('coach');
      expect(doc.entries[8].text).toBe('maintain focus on core friction');

      // Entry 9: plain note without tag
      expect(doc.entries[9].type).toBe('note');
      expect(doc.entries[9].author).toBeUndefined();
      expect(doc.entries[9].text).toBe('plain note without tag');

      // Entry 10: - (event) session complete
      expect(doc.entries[10].type).toBe('event');
      expect(doc.entries[10].text).toBe('session complete');

      // Check available types
      expect(doc.availableTypes).toEqual(
        expect.arrayContaining(['decision', 'direction', 'event', 'idea', 'insight', 'note', 'question', 'technique'])
      );
    });
  });

  describe('filterMemlogEntries', () => {
    const doc = parseMemlogContent(sampleMemlog);

    it('should return all entries when filter is undefined or type is all', () => {
      expect(filterMemlogEntries(doc.entries)).toHaveLength(11);
      expect(filterMemlogEntries(doc.entries, { type: 'all' })).toHaveLength(11);
    });

    it('should filter entries by type', () => {
      const decisions = filterMemlogEntries(doc.entries, { type: 'decision' });
      expect(decisions).toHaveLength(1);
      expect(decisions[0].text).toContain('lead with one pre-categorized account');

      const ideas = filterMemlogEntries(doc.entries, { type: 'idea' });
      expect(ideas).toHaveLength(2);
    });

    it('should filter entries by author', () => {
      const userEntries = filterMemlogEntries(doc.entries, { author: 'user' });
      expect(userEntries).toHaveLength(1);
      expect(userEntries[0].text).toContain('auto-import');

      const coachEntries = filterMemlogEntries(doc.entries, { author: 'coach' });
      expect(coachEntries).toHaveLength(1);
      expect(coachEntries[0].text).toContain('core friction');
    });

    it('should search entries by text query', () => {
      const matches = filterMemlogEntries(doc.entries, { query: 'banking' });
      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('question');
    });

    it('should search entries by type or author query', () => {
      const matches = filterMemlogEntries(doc.entries, { query: 'architect' });
      expect(matches).toHaveLength(1);
      expect(matches[0].author).toBe('architect');
    });
  });

  describe('findMemlogFiles and loadMemlogFile', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-memlog-test-'));
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should find memlog files across standard folders', async () => {
      const rootMemlog = path.join(tempDir, '.memlog.md');
      const outputRunMemlog = path.join(tempDir, '_bmad-output', 'run-1', '.memlog.md');
      fs.mkdirSync(path.join(tempDir, '_bmad-output', 'run-1'), { recursive: true });

      fs.writeFileSync(rootMemlog, sampleMemlog);
      fs.writeFileSync(outputRunMemlog, sampleMemlog);

      const files = await findMemlogFiles(tempDir);
      expect(files).toHaveLength(2);
      expect(files).toContain(rootMemlog);
      expect(files).toContain(outputRunMemlog);
    });

    it('should load and parse a file from disk', async () => {
      const filePath = path.join(tempDir, '.memlog.md');
      fs.writeFileSync(filePath, sampleMemlog);

      const loaded = await loadMemlogFile(filePath);
      expect(loaded).toBeDefined();
      expect(loaded?.entryCount).toBe(11);
    });

    it('should return undefined for non-existent file', async () => {
      const loaded = await loadMemlogFile(path.join(tempDir, 'non-existent.md'));
      expect(loaded).toBeUndefined();
    });
  });
});
