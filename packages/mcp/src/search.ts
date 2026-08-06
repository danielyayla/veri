import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadProject } from '@veri/core';

export interface SearchHit {
  id: string;
  type: string;
  status: string;
  title: string;
  matched: Array<'id' | 'title' | 'body'>;
}

/** Case-insensitive substring match over id, title, and body (see WO-003: no semantic search). */
export async function searchDocs(projectRoot: string, query: string): Promise<SearchHit[]> {
  const veriDir = join(projectRoot, 'veri');
  if (!existsSync(veriDir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  const needle = query.toLowerCase();
  if (needle.trim() === '') return [];
  const { documents } = await loadProject(veriDir);
  const hits: SearchHit[] = [];
  for (const doc of documents) {
    const matched: SearchHit['matched'] = [];
    if (doc.id.toLowerCase().includes(needle)) matched.push('id');
    if (doc.title.toLowerCase().includes(needle)) matched.push('title');
    if (doc.body.toLowerCase().includes(needle)) matched.push('body');
    if (matched.length > 0) {
      hits.push({ id: doc.id, type: doc.type, status: doc.status, title: doc.title, matched });
    }
  }
  return hits.sort((a, b) => a.id.localeCompare(b.id));
}
