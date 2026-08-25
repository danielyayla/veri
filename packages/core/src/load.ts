import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from './parse.ts';
import { classifyFormat } from './format.ts';
import type { FormatClassification } from './format.ts';
import type { Issue, VeriDocument } from './types.ts';

export interface LoadResult {
  documents: VeriDocument[];
  issues: Issue[];
  /** Absolute path of the veri/ directory the documents came from, so
      checks can read the effective templates fresh (DEC-002, DEC-025). */
  dir: string;
  /** On-disk format classification (REQ-015), read before any parsing. */
  format: FormatClassification;
}

/**
 * Load every markdown document under a veri/ directory.
 * One bad file never aborts the load — its problems are collected as issues.
 */
export async function loadProject(veriDir: string | URL): Promise<LoadResult> {
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
  const entries = await readdir(root, { recursive: true });
  const files = entries
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => entry.replaceAll('\\', '/'))
    // veri/templates/ holds body-only creation templates, not documents (DEC-023).
    .filter((file) => !file.startsWith('templates/'))
    // veri/originals/ holds preserved intake files, not documents (DEC-094):
    // an imported .md original must never parse as a knowledge-base document.
    .filter((file) => !file.startsWith('originals/'))
    .sort();

  const documents: VeriDocument[] = [];
  const issues: Issue[] = [];
  for (const file of files) {
    let content: string;
    try {
      content = await readFile(join(root, file), 'utf8');
    } catch (err) {
      issues.push({
        kind: 'invalid-frontmatter',
        file,
        field: null,
        message: `could not read file: ${(err as Error).message}`,
      });
      continue;
    }
    const outcome = parseDocument(file, content);
    if (outcome.document) documents.push(outcome.document);
    issues.push(...outcome.issues);
  }
  return { documents, issues, dir: root, format: classifyFormat(root) };
}
