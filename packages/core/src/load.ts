import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from './parse.ts';
import type { Issue, VeriDocument } from './types.ts';

export interface LoadResult {
  documents: VeriDocument[];
  issues: Issue[];
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
        message: `${file}: could not read file: ${(err as Error).message}`,
      });
      continue;
    }
    const outcome = parseDocument(file, content);
    if (outcome.document) documents.push(outcome.document);
    issues.push(...outcome.issues);
  }
  return { documents, issues };
}
