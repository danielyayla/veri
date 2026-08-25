import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { VeriDocument } from '@verikb/core';
import { buildGraph } from '@verikb/core';
import type { Snapshot } from '../lib/snapshot.ts';
import {
  advisoriesByDoc,
  autocomplete,
  connections,
  docsById,
  gatingDocs,
  inFlight,
  insertAutocomplete,
  issuesByDoc,
  pendingDocs,
  projectActivity,
  recentlyChanged,
  kickoffPrompt,
  localGraph,
  packageSummary,
  receipts,
  relsInUse,
  DEFAULT_REL,
  LOCAL_GRAPH_CAP,
  importBatches,
  importEvidenceOf,
  importGroupLabel,
  importManifestOf,
  latestImportBatch,
} from './derive.ts';
import type { Connection } from './derive.ts';

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

function snap(
  documents: VeriDocument[],
  issues: Snapshot['issues'] = [],
  advisories: Snapshot['advisories'] = [],
): Snapshot {
  return {
    projectName: 'test',
    root: '/tmp/test',
    documents,
    issues,
    advisories,
    edges: buildGraph(documents).edges,
    git: null,
    brownfield: false,
    architecture: { modules: [], rules: [], conflicts: [] },
    archObserved: { edges: [], skipped: [], files: [], exports: {} },
    skips: [],
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

test('advisoriesByDoc groups by carried doc id and drops unknown ids', () => {
  const req = doc({ id: 'REQ-001', type: 'requirement', title: 'A req', status: 'accepted' });
  const adv = (id: string) => ({
    kind: 'missing-section' as const,
    file: `requirements/${id}.md`,
    id,
    section: 'Acceptance criteria',
    message: `${id} has no "## Acceptance criteria" section — the requirement template expects one`,
  });
  const s = snap([req], [], [adv('REQ-001'), adv('REQ-999')]);
  const byDoc = advisoriesByDoc(s);
  assert.equal(byDoc.get('REQ-001')!.length, 1);
  const first = byDoc.get('REQ-001')![0];
  assert.equal(first.kind === 'missing-section' ? first.section : undefined, 'Acceptance criteria');
  assert.equal(byDoc.has('REQ-999'), false);
  // Advisories never leak into the issue map (DEC-025).
  assert.equal(issuesByDoc(s).size, 0);
});

test('issue-driven health surfaces ignore advisories entirely', () => {
  const wo = doc({ id: 'WO-001', type: 'work-order', title: 'W', status: 'backlog' });
  const s = snap(
    [wo],
    [],
    [{ kind: 'missing-section', file: wo.file, id: 'WO-001', section: 'Requirements', message: 'm' }],
  );
  // Every health flag derives from issuesByDoc; a doc with only advisories
  // stays healthy (DEC-025).
  assert.equal(issuesByDoc(s).has('WO-001'), false);
});

// ---- Local graph layout (WO-052, SRC-024) --------------------------------

const conn = (id: string): Connection => ({ id, title: `Doc ${id}`, type: 'requirement', why: 'mentions' });

test('localGraph is null for a document with no connections — the graph hides', () => {
  assert.equal(localGraph({ inbound: [], outbound: [] }), null);
});

test('localGraph fans inbound left of center, outbound right, in panel order', () => {
  const lg = localGraph({ inbound: [conn('A'), conn('B')], outbound: [conn('C')] }, 272)!;
  assert.equal(lg.cx, 136);
  assert.deepEqual(lg.inbound.nodes.map((n) => n.id), ['A', 'B']);
  assert.deepEqual(lg.outbound.nodes.map((n) => n.id), ['C']);
  for (const n of lg.inbound.nodes) assert.ok(n.x < lg.cx);
  for (const n of lg.outbound.nodes) assert.ok(n.x > lg.cx);
  // Each side's fan is vertically centered on the center node.
  const ys = lg.inbound.nodes.map((n) => n.y);
  assert.equal((ys[0] + ys[1]) / 2, lg.cy);
  assert.equal(lg.outbound.nodes[0].y, lg.cy);
  // Deterministic: same input, same layout — no simulation.
  assert.deepEqual(localGraph({ inbound: [conn('A'), conn('B')], outbound: [conn('C')] }, 272), lg);
});

test('localGraph caps each side at 8 and counts the rest as +K more', () => {
  const many = Array.from({ length: 11 }, (_, i) => conn(`R${i}`));
  const lg = localGraph({ inbound: many, outbound: [conn('X')] })!;
  assert.equal(lg.inbound.nodes.length, LOCAL_GRAPH_CAP);
  assert.deepEqual(lg.inbound.nodes.map((n) => n.id), many.slice(0, 8).map((c) => c.id));
  assert.equal(lg.inbound.more, 3);
  // The +K marker takes the slot after the capped fan, pointing at the cards.
  assert.ok(lg.inbound.moreAt !== null && lg.inbound.moreAt.y > lg.inbound.nodes[7].y);
  assert.equal(lg.outbound.more, 0);
  assert.equal(lg.outbound.moreAt, null);
  // Height grows with the taller side: 9 slots (8 nodes + marker).
  assert.ok(lg.height > localGraph({ inbound: [conn('A')], outbound: [] })!.height);
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

test('packageSummary surfaces the context map aggregate, derived from the served text (SRC-017)', () => {
  const layered = [
    '# Context package · WO-001 — Build it',
    '(2 docs · ~900 tokens)',
    '',
    '## Work order WO-001 — Build it · in-progress · ~200 tokens',
    '',
    '### REQ-001 — A req · accepted · ~300 tokens',
    '',
    '## Context map — 3 adjacent documents, not inlined',
    '',
    'Adjacent knowledge, enumerated instead of inlined.',
    '',
    '- DEC-001 — A · decision · active · via REQ-001 (constrains) · ~100 tokens',
    '- DEC-002 — B · decision · superseded · via REQ-001 (constrains) · ~100 tokens',
    '- WO-002 — C · work-order · backlog · via REQ-001 (relates-to) · ~50 tokens',
    '',
    '## Templates — how new documents start in this project',
    '',
    'stuff',
  ].join('\n');
  const summary = packageSummary(layered);
  assert.equal(summary.map?.count, 3);
  assert.ok(summary.map !== undefined && summary.map.tokens > 0 && summary.map.tokens < 200);
  // Map rows never masquerade as inlined document rows.
  assert.deepEqual(summary.rows.map((r) => r.id), ['WO-001', 'REQ-001']);

  // Inline packages carry no map aggregate.
  const inline = packageSummary('# Context package · WO-001 — Build it\n(1 docs · ~10 tokens)');
  assert.equal(inline.map, undefined);
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

test('pendingDocs lists draft REQs, proposed DECs, and draft workflows oldest-first', () => {
  const s = snap([
    doc({ id: 'REQ-001', type: 'requirement', title: 'Accepted', status: 'accepted' }),
    doc({ id: 'REQ-002', type: 'requirement', title: 'Newer draft', status: 'draft', created: '2026-08-09' }),
    doc({ id: 'DEC-001', type: 'decision', title: 'Older proposal', status: 'proposed', created: '2026-08-03' }),
    doc({ id: 'DEC-002', type: 'decision', title: 'Active', status: 'active' }),
    doc({ id: 'WO-001', type: 'work-order', title: 'Backlog', status: 'backlog' }),
    // WO-097 regression: the renderer's mirror omitted core's workflow
    // clause, so a draft workflow never reached NEEDS REVIEW.
    doc({ id: 'WF-002', type: 'workflow', title: 'Draft rules', status: 'draft', created: '2026-08-01' }),
  ]);
  assert.deepEqual(
    pendingDocs(s).map((d) => d.id),
    ['WF-002', 'DEC-001', 'REQ-002'],
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

test('packageSummary parses the workflow row and 4-digit ids (WO-050)', () => {
  const text = [
    '# Context package · WO-1000 — Wide',
    '(3 docs · ~900 tokens)',
    '',
    '## Workflow · WF-001 — Veri project workflow · ~513 tokens',
    '',
    '## Work order WO-1000 — Wide · backlog · ~200 tokens',
    '',
    '### REQ-1004 — A wide req · accepted · ~187 tokens',
  ].join('\n');
  const summary = packageSummary(text);
  assert.deepEqual(
    summary.rows.map((r) => [r.id, r.type, r.tokens]),
    [
      ['WF-001', 'workflow', 513],
      ['WO-1000', 'work-order', 200],
      ['REQ-1004', 'requirement', 187],
    ],
  );
});

test('id-ordered lists sort WO-999 before WO-1000 (WO-050)', () => {
  const s = snap([
    doc({ id: 'WO-1000', type: 'work-order', title: 'Thousandth', status: 'backlog' }),
    doc({ id: 'WO-999', type: 'work-order', title: 'Last padded', status: 'backlog' }),
  ]);
  assert.deepEqual(inFlight(s).map((r) => r.id), ['WO-999', 'WO-1000']);
  assert.deepEqual(autocomplete(s, '[[wo')!.map((i) => i.id), ['WO-999', 'WO-1000']);
});

// ---- typed-link editing (WO-056): the rel datalist ----

test('relsInUse derives exactly the rels in use, deduped and sorted', () => {
  const s = snap([
    WO, // delivers, delivers, constrained-by
    doc({
      id: 'SRC-001',
      type: 'source',
      title: 'A source',
      status: 'imported',
      links: [
        { id: 'REQ-001', rel: 'informs' },
        { id: 'DEC-001', rel: 'constrained-by' },
      ],
    }),
    doc({ id: 'REQ-003', type: 'requirement', title: 'Linkless', status: 'draft' }),
  ]);
  assert.deepEqual(relsInUse(s), ['constrained-by', 'delivers', 'informs']);
  assert.deepEqual(relsInUse(snap([])), []);
});

test('the default rel for a new link is relates-to (SRC-028)', () => {
  assert.equal(DEFAULT_REL, 'relates-to');
});

test('import batches derive from imported-via links alone (DEC-068)', () => {
  const manifest = doc({ id: 'SRC-001', type: 'source', title: 'Import manifest — repo mining', status: 'imported' });
  const evidence = doc({
    id: 'SRC-002',
    type: 'source',
    title: 'Repo evidence — src/db/',
    status: 'imported',
    links: [{ id: 'SRC-001', rel: 'imported-via' }],
  });
  const req = doc({
    id: 'REQ-001',
    type: 'requirement',
    title: 'Invoices are immutable',
    status: 'draft',
    links: [
      { id: 'SRC-002', rel: 'derived-from' },
      { id: 'SRC-001', rel: 'imported-via' },
    ],
  });
  const dec = doc({
    id: 'DEC-001',
    type: 'decision',
    title: 'Postgres is primary',
    status: 'active',
    frontmatter: { approved: '2026-08-24' },
    links: [
      { id: 'SRC-002', rel: 'derived-from' },
      { id: 'SRC-001', rel: 'imported-via' },
    ],
  });
  const loose = doc({ id: 'DEC-002', type: 'decision', title: 'Unrelated proposal', status: 'proposed' });
  const s = snap([manifest, evidence, req, dec, loose]);

  const batches = importBatches(s);
  assert.equal(batches.length, 1);
  const batch = batches[0];
  assert.equal(batch.manifest.id, 'SRC-001');
  assert.deepEqual(batch.evidence.map((d) => d.id), ['SRC-002']);
  assert.deepEqual(batch.claims.map((d) => d.id).sort(), ['DEC-001', 'REQ-001']);
  assert.equal(batch.reviewed, 1); // the approved decision counts, the draft REQ does not
  assert.equal(batch.complete, false); // no receipt on the manifest yet

  const withReceipt = {
    ...manifest,
    body: '## Receipts\n\n- 2026-08-24 — abc1234 — src/ — import session\n',
  };
  assert.equal(latestImportBatch(snap([withReceipt, evidence, req, dec]))?.complete, true);

  const byId = docsById(s);
  assert.equal(importManifestOf(byId, req)?.id, 'SRC-001');
  assert.equal(importManifestOf(byId, loose), null);
  assert.deepEqual(importEvidenceOf(byId, req).map((d) => d.id), ['SRC-002']);
  assert.equal(importGroupLabel(manifest), 'repo mining');
});
