import * as fs from 'fs';
import * as path from 'path';
import {
  BmadMemlogDocument,
  BmadMemlogEntry,
  BmadMemlogFilter,
  BmadMemlogMetadata
} from './types';

/**
 * Splits raw memlog markdown into frontmatter metadata and body text.
 */
export function splitMemlog(rawText: string): { metadata: BmadMemlogMetadata; body: string } {
  const lines = rawText.split(/\r?\n/);
  if (lines.length === 0 || lines[0].trim() !== '---') {
    return { metadata: {}, body: rawText };
  }

  const endFenceIndex = lines.slice(1).findIndex((l) => l.trim() === '---');
  if (endFenceIndex === -1) {
    return { metadata: {}, body: rawText };
  }

  const frontmatterLines = lines.slice(1, endFenceIndex + 1);
  const bodyLines = lines.slice(endFenceIndex + 2);

  const metadata: BmadMemlogMetadata = {};
  for (const line of frontmatterLines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (key) {
        metadata[key] = value;
      }
    }
  }

  return { metadata, body: bodyLines.join('\n') };
}

/**
 * Parses raw .memlog.md content into a structured BmadMemlogDocument.
 */
export function parseMemlogContent(content: string, filePath: string = '.memlog.md'): BmadMemlogDocument {
  const { metadata, body } = splitMemlog(content);
  const lines = body.split(/\r?\n/);
  const entries: BmadMemlogEntry[] = [];
  const typesSet = new Set<string>();

  let entryIndex = 0;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed.startsWith('- ')) {
      continue;
    }

    const itemContent = trimmed.substring(2).trim();
    const tagMatch = itemContent.match(/^\(([^)]+)\)\s*(.*)$/);

    let type = 'note';
    let author: string | undefined;
    let text = itemContent;

    if (tagMatch) {
      const tagContent = tagMatch[1].trim();
      text = tagMatch[2].trim();

      const lowerTag = tagContent.toLowerCase();
      if (lowerTag.startsWith('by ')) {
        type = 'note';
        author = tagContent.substring(3).trim();
      } else if (lowerTag.includes(' by ')) {
        const parts = tagContent.split(/\s+by\s+/i);
        type = parts[0].trim().toLowerCase();
        author = parts[1]?.trim();
      } else {
        type = lowerTag;
      }
    }

    typesSet.add(type);

    entries.push({
      id: `entry-${entryIndex}`,
      index: entryIndex,
      type,
      author,
      text,
      raw: trimmed
    });

    entryIndex++;
  }

  return {
    filePath,
    metadata,
    entries,
    entryCount: entries.length,
    availableTypes: Array.from(typesSet).sort()
  };
}

/**
 * Filters memlog entries based on type, author, or keyword search query.
 */
export function filterMemlogEntries(
  entries: BmadMemlogEntry[],
  filter?: BmadMemlogFilter
): BmadMemlogEntry[] {
  if (!filter) {
    return entries;
  }

  return entries.filter((entry) => {
    // Type filter
    if (filter.type && filter.type.toLowerCase() !== 'all') {
      if (entry.type.toLowerCase() !== filter.type.toLowerCase()) {
        return false;
      }
    }

    // Author filter
    if (filter.author) {
      if (!entry.author || !entry.author.toLowerCase().includes(filter.author.toLowerCase())) {
        return false;
      }
    }

    // Text search query
    if (filter.query) {
      const q = filter.query.toLowerCase().trim();
      const matchesText = entry.text.toLowerCase().includes(q);
      const matchesType = entry.type.toLowerCase().includes(q);
      const matchesAuthor = entry.author?.toLowerCase().includes(q) ?? false;
      if (!matchesText && !matchesType && !matchesAuthor) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Searches for all .memlog.md files in the workspace.
 */
export async function findMemlogFiles(workspaceRoot: string): Promise<string[]> {
  const discovered: string[] = [];

  const candidates = [
    path.join(workspaceRoot, '.memlog.md'),
    path.join(workspaceRoot, '_bmad-output', '.memlog.md'),
    path.join(workspaceRoot, '_bmad', '.memlog.md')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      discovered.push(candidate);
    }
  }

  // Also check direct children directories of _bmad-output/
  const outputDir = path.join(workspaceRoot, '_bmad-output');
  if (fs.existsSync(outputDir)) {
    try {
      const entries = await fs.promises.readdir(outputDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const nested = path.join(outputDir, entry.name, '.memlog.md');
          if (fs.existsSync(nested) && !discovered.includes(nested)) {
            discovered.push(nested);
          }
        }
      }
    } catch {
      // Non-blocking
    }
  }

  return discovered;
}

/**
 * Loads and parses a .memlog.md file from disk.
 */
export async function loadMemlogFile(filePath: string): Promise<BmadMemlogDocument | undefined> {
  try {
    if (!fs.existsSync(filePath)) {
      return undefined;
    }
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return parseMemlogContent(content, filePath);
  } catch {
    return undefined;
  }
}
