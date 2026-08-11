import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { VeriDocument } from '@veri/core';
import { buildGraph } from '@veri/core';
import type { Snapshot } from '../lib/snapshot.ts';
import {
  autocomplete,
  boardColumns,
  connections,
  decisionLog,
  docsById,
  gatingDocs,
  graphLayout,
  inFlight,
  insertAutocomplete,
  issuesByDoc,
  pendingDocs,
  projectActivity,
  recentlyChanged,
  kickoffPrompt,
  packageSummary,
  receipts,
} from './derive.ts';

function doc(partial: Partial<VeriDocument> & Pick<VeriDocument, 'id' | 'type' | 'title' | 'status'>): VeriDocument {
  return {
    created: '2026-08-01',
    updated: '2026-08-01',
    links: [],
    frontmatter: {},
    body: '',
    file: `${partial.type}s/${partial.id}.md`,
    inlineRefs: [],
    ...partial,
  };
}

function snap(documents: VeriDocument[], issues: Snapshot['issues'] = []): Snapshot {
  return {
    projectName: 'test',
    root: '/tmp/test',
    documents,
    issues,
    edges: buildGraph(documents).edges,
    git: null,
  };
}

const WO = doc({
  id: 'WO-001',
  type: 'work-order',
  title: 'Build it',
  status: 'done',
  links: [
    { id: 'REQ-001', rel: 'delivers' },
    { id: 'REQ-002', rel: 'delivers' },
    { id: 'DEC-001', rel: 'constrained-by' },
  ],
  body: '## Summary\n\nDo the thing.\n\n## Receipts\n\n- 2026-08-05 — abc1234 — src/a.ts, src/b.ts — claude-code session: built the thing\n',
});

test('receipts parses the DEC-003 line shape and flags agent sessions', () => {
  const rs = receipts(WO);
  assert.equal(rs.length, 1);
  assert.equal(rs[0].commit, 'abc1234');
  assert.deepEqual(rs[0].files, ['src/a.ts', 'src/b.ts']);
  assert.equal(rs[0].agent, true);
  assert.equal(rs[0].summary, 'claude-code session: built the thing');
});

test('boardColumns groups by status, counts linked REQs, marks agent receipts', () => {
  const s = snap([WO, doc({ id: 'WO-002', type: 'work-order', title: 'Later', status: 'backlog' })]);
  const cols = boardColumns(s);
  assert.deepEqual(cols.map((c) => c.cards.length), [1, 0, 1]);
  const done = cols[2].cards[0];
  assert.equal(done.reqCount, 2);
  assert.equal(done.agent, true);
  const backlog = cols[0].cards[0];
  assert.equal(backlog.reqCount, 0);
});

test('connections derives outbound and inbound from graph edges', () => {
  const req = doc({ id: 'REQ-001', type: 'requirement', title: 'A req', status: 'accepted' });
  const s = snap([WO, req]);
  const conns = connections(s, 'REQ-001');
  assert.equal(conns.inbound.length, 1);
  assert.equal(conns.inbound[0].id, 'WO-001');
  assert.equal(conns.inbound[0].why, 'delivers');
  assert.equal(conns.outbound.length, 0);
});

test('issuesByDoc keys issues by the doc owning the file', () => {
  const req = doc({ id: 'REQ-001', type: 'requirement', title: 'A req', status: 'accepted' });
  const s = snap(
    [req],
    [{ kind: 'broken-link', file: req.file, sourceId: 'REQ-001', targetId: 'SRC-009', via: 'inline', message: 'broken' }],
  );
  assert.equal(issuesByDoc(s).get('REQ-001')!.length, 1);
});

test('decisionLog sorts newest first and extracts choice, rejected chips, supersession', () => {
  const dec1 = doc({
    id: 'DEC-001',
    type: 'decision',
    title: 'Old way',
    status: 'superseded',
    created: '2026-07-01',
    supersededBy: 'DEC-002',
    body: '## Choice\n\nDo it the old way.\n\n## Rejected alternatives\n\n- **New way** — too new.\n',
  });
  const dec2 = doc({
    id: 'DEC-002',
    type: 'decision',
    title: 'New way',
    status: 'active',
    created: '2026-07-20',
    body: '## Choice\n\nDo it the new way.\n\n## Rejected alternatives\n\n- **Old way** — superseded.\n- Something plain — meh.\n',
  });
  const log = decisionLog(snap([dec1, dec2]));
  assert.deepEqual(log.map((e) => e.id), ['DEC-002', 'DEC-001']);
  assert.equal(log[0].choice, 'Do it the new way.');
  assert.deepEqual(log[0].rejected, ['Old way', 'Something plain']);
  assert.equal(log[1].supersededBy, 'DEC-002');
});

test('graphLayout places every doc, sizes by degree, dims superseded', () => {
  const req = doc({ id: 'REQ-001', type: 'requirement', title: 'A req', status: 'accepted' });
  const dec = doc({ id: 'DEC-001', type: 'decision', title: 'Old', status: 'superseded', supersededBy: 'DEC-001' });
  const s = snap([WO, req, dec]);
  const layout = graphLayout(s);
  assert.equal(layout.nodes.length, 3);
  const woNode = layout.nodes.find((n) => n.id === 'WO-001')!;
  assert.ok(woNode.degree >= 2);
  assert.ok(woNode.size > 10);
  assert.equal(layout.nodes.find((n) => n.id === 'DEC-001')!.dim, true);
  for (const line of layout.lines) {
    assert.ok(Number.isFinite(line.x1) && Number.isFinite(line.y2));
  }
});

test('packageSummary parses rows and totals out of get_context markdown', () => {
  const text = [
    '# Context package · WO-001 — Build it',
    '(4 docs · ~1234 tokens)',
    '',
    '## Project conventions (CLAUDE.md) · ~600 tokens',
    '',
    'stuff',
    '',
    '## Work order WO-001 — Build it · done · ~200 tokens',
    '',
    '## Requirements',
    '',
    '### REQ-001 — A req · accepted · ~300 tokens',
    '',
    '## Sources (excerpts)',
    '',
    '### SRC-001 — Notes · excerpt · ~134 tokens',
  ].join('\n');
  const summary = packageSummary(text);
  assert.equal(summary.docCount, 4);
  assert.equal(summary.totalTokens, 1234);
  assert.deepEqual(
    summary.rows.map((r) => [r.id, r.tokens]),
    [['CLAUDE.md', 600], ['WO-001', 200], ['REQ-001', 300], ['SRC-001', 134]],
  );
});

test('autocomplete triggers on [[ and inserts a closed wiki-link', () => {
  const req = doc({ id: 'REQ-001', type: 'requirement', title: 'Offline mode', status: 'accepted' });
  const s = snap([WO, req]);
  assert.equal(autocomplete(s, 'no bracket'), null);
  const items = autocomplete(s, 'see [[off')!;
  assert.deepEqual(items.map((i) => i.id), ['REQ-001']);
  assert.equal(insertAutocomplete('see [[off', 'REQ-001'), 'see [[REQ-001]] ');
});

test('kickoffPrompt names the work order and the MCP fetch, provider-free', () => {
  const prompt = kickoffPrompt('WO-011', 'Agent handoff');
  assert.match(prompt, /^Implement WO-011 — Agent handoff\.\n/);
  assert.match(prompt, /get_context\("WO-011"\)/);
  assert.doesNotMatch(prompt, /Claude|ChatGPT|Cursor|Gemini|Codex/);
});

// ---- Home view derivations (WO-015) ----

test('inFlight lists backlog/in-progress work orders with REQ counts and agent markers', () => {
  const s = snap([
    doc({ id: 'WO-010', type: 'work-order', title: 'Later', status: 'backlog' }),
    doc({
      id: 'WO-011',
      type: 'work-order',
      title: 'Now',
      status: 'in-progress',
      links: [{ id: 'REQ-001', rel: 'delivers' }, { id: 'DEC-001', rel: 'constrained-by' }],
      body: '## Receipts\n\n- 2026-08-09 — abc1234 — a.ts — claude session receipt\n',
    }),
    doc({ id: 'WO-012', type: 'work-order', title: 'Done', status: 'done' }),
  ]);
  const rows = inFlight(s);
  assert.deepEqual(rows.map((r) => r.id), ['WO-010', 'WO-011']);
  assert.equal(rows[0].reqCount, 0);
  assert.equal(rows[0].agent, false);
  assert.equal(rows[1].reqCount, 1);
  assert.equal(rows[1].agent, true);
});

test('projectActivity interleaves receipts and filed decisions newest-first, capped', () => {
  const s = snap([
    doc({ id: 'DEC-020', type: 'decision', title: 'Newest choice', status: 'active', created: '2026-08-09' }),
    doc({ id: 'DEC-021', type: 'decision', title: 'Older choice', status: 'active', created: '2026-08-01' }),
    doc({
      id: 'WO-020',
      type: 'work-order',
      title: 'Work',
      status: 'done',
      body: '## Receipts\n\n- 2026-08-05 — abc1234 — a.ts, b.ts — did things\n',
    }),
  ]);
  const rows = projectActivity(s, (d) => d);
  assert.deepEqual(rows.map((r) => r.id), ['DEC-020', 'WO-020', 'DEC-021']);
  assert.match(rows[1].text, /Receipt filed: commit abc1234 · 2 files/);
  assert.match(rows[0].text, /Decision filed: Newest choice/);
  assert.equal(projectActivity(s, (d) => d, 2).length, 2);
});

test('recentlyChanged orders by updated desc and caps', () => {
  const s = snap([
    doc({ id: 'REQ-001', type: 'requirement', title: 'A', status: 'draft', updated: '2026-08-02' }),
    doc({ id: 'DEC-001', type: 'decision', title: 'B', status: 'active', updated: '2026-08-09' }),
    doc({ id: 'SRC-001', type: 'source', title: 'C', status: 'imported', updated: '2026-08-05' }),
  ]);
  assert.deepEqual(recentlyChanged(s, (d) => d).map((r) => r.id), ['DEC-001', 'SRC-001', 'REQ-001']);
  assert.equal(recentlyChanged(s, (d) => d, 1).length, 1);
});

// ---- approval gate (WO-017, SRC-006) ----

test('pendingDocs lists draft REQs and proposed DECs oldest-first', () => {
  const s = snap([
    doc({ id: 'REQ-001', type: 'requirement', title: 'Accepted', status: 'accepted' }),
    doc({ id: 'REQ-002', type: 'requirement', title: 'Newer draft', status: 'draft', created: '2026-08-09' }),
    doc({ id: 'DEC-001', type: 'decision', title: 'Older proposal', status: 'proposed', created: '2026-08-03' }),
    doc({ id: 'DEC-002', type: 'decision', title: 'Active', status: 'active' }),
    doc({ id: 'WO-001', type: 'work-order', title: 'Backlog', status: 'backlog' }),
  ]);
  assert.deepEqual(
    pendingDocs(s).map((d) => d.id),
    ['DEC-001', 'REQ-002'],
  );
});

test('gatingDocs returns only pending direct link targets of a work order', () => {
  const s = snap([
    doc({
      id: 'WO-001',
      type: 'work-order',
      title: 'Gated',
      status: 'in-progress',
      links: [
        { id: 'REQ-001', rel: 'implements' },
        { id: 'DEC-001', rel: 'constrained-by' },
        { id: 'DEC-002', rel: 'constrained-by' },
        { id: 'REQ-999', rel: 'implements' },
      ],
    }),
    doc({ id: 'REQ-001', type: 'requirement', title: 'Draft', status: 'draft' }),
    doc({ id: 'DEC-001', type: 'decision', title: 'Proposed', status: 'proposed' }),
    doc({ id: 'DEC-002', type: 'decision', title: 'Active', status: 'active' }),
  ]);
  const byId = docsById(s);
  assert.deepEqual(
    gatingDocs(byId, byId.get('WO-001')!).map((d) => d.id),
    ['REQ-001', 'DEC-001'],
  );
  assert.deepEqual(gatingDocs(byId, byId.get('REQ-001')!), []);
});

test('inFlight rows carry their gate ids', () => {
  const s = snap([
    doc({
      id: 'WO-001',
      type: 'work-order',
      title: 'Gated',
      status: 'backlog',
      links: [{ id: 'REQ-001', rel: 'implements' }],
    }),
    doc({ id: 'REQ-001', type: 'requirement', title: 'Draft', status: 'draft' }),
  ]);
  assert.deepEqual(inFlight(s)[0].gates, ['REQ-001']);
});
