import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadProject } from './load.ts';
import { buildGraph } from './graph.ts';
import { checkProject } from './check.ts';
import type { LoadResult } from './load.ts';

const FIXTURE = new URL('../fixtures/valid/', import.meta.url);

const KNOWN_KEYS = new Set(['id', 'type', 'title', 'status', 'created', 'updated', 'links', 'superseded_by']);

/** Serializable projection of a load: documents, edges, and backlinks. */
function snapshotOf(load: LoadResult): unknown {
  const graph = buildGraph(load.documents);
  return {
    documents: load.documents.map((d) => ({
      file: d.file,
      id: d.id,
      type: d.type,
      title: d.title,
      status: d.status,
      created: d.created,
      updated: d.updated,
      links: d.links,
      supersededBy: d.supersededBy ?? null,
      inlineRefs: d.inlineRefs,
      extra: Object.fromEntries(Object.entries(d.frontmatter).filter(([key]) => !KNOWN_KEYS.has(key))),
    })),
    edges: graph.edges,
    backlinks: Object.fromEntries(
      [...graph.byId.keys()].map((id) => [id, graph.backlinks(id).map((e) => `${e.from} (${e.rel}, ${e.via})`)]),
    ),
  };
}

test('the valid fixture loads with zero issues', async () => {
  const load = await loadProject(FIXTURE);
  assert.deepEqual(checkProject(load), []);
  assert.equal(load.documents.length, 6);
});

test('the valid fixture matches its snapshot exactly', async () => {
  const load = await loadProject(FIXTURE);
  const expected = JSON.parse(readFileSync(new URL('expected.json', FIXTURE), 'utf8'));
  assert.deepEqual(snapshotOf(load), expected);
});
