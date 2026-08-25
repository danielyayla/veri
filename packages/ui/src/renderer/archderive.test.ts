import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { VeriDocument } from '@veri/core';
import type { Snapshot } from '../lib/snapshot.ts';
import {
  aggregateEdges,
  archModel,
  archSummary,
  decisionRules,
  edgeTier,
  governingDecisions,
  latticeCell,
  layerModules,
  listDir,
  mapLayout,
  moduleDeps,
  moduleFileCount,
  relatedRequirements,
} from './archderive.ts';
import { docsById, issueDocId, issuesByDoc } from './derive.ts';

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

const MODULES = [
  { name: 'core', path: 'packages/core', purpose: 'Domain' },
  { name: 'api', path: 'packages/api', purpose: 'HTTP surface' },
  { name: 'web', path: 'packages/web', purpose: 'Shell' },
];

function snap(partial: Partial<Snapshot> = {}): Snapshot {
  return {
    projectName: 't',
    root: '/tmp/t',
    documents: [],
    issues: [],
    advisories: [],
    edges: [],
    git: null,
    brownfield: false,
    architecture: { modules: MODULES, rules: [], conflicts: [] },
    archObserved: { edges: [], skipped: [], files: [], exports: {} },
    ...partial,
  };
}

const violation = (from: string, to: string, decId: string) => ({
  kind: 'arch-violation' as const,
  file: `packages/${from}/src/a.ts`,
  id: decId,
  from,
  to,
  specifier: `@x/${to}`,
  forbiddenBy: [decId],
  message: `imports "@x/${to}" — the ${from} → ${to} edge is forbidden by ${decId}`,
});

// ---- aggregation and layout ----------------------------------------------

test('aggregateEdges collapses per-file rows into one pair with a count, first-seen order', () => {
  const agg = aggregateEdges([
    { from: 'api', to: 'core' },
    { from: 'web', to: 'core' },
    { from: 'api', to: 'core' },
  ]);
  assert.deepEqual(agg, [
    { from: 'api', to: 'core', count: 2 },
    { from: 'web', to: 'core', count: 1 },
  ]);
});

test('layerModules puts dependents above dependencies — a chain layers top-down (DEC-088)', () => {
  const rows = layerModules(
    ['core', 'api', 'web'],
    [
      { from: 'web', to: 'api', count: 1 },
      { from: 'api', to: 'core', count: 1 },
    ],
  );
  assert.deepEqual(rows, [['web'], ['api'], ['core']]);
});

test('a diamond shares layers; modules with no edges land at the bottom in registry order', () => {
  const rows = layerModules(
    ['core', 'api', 'web', 'jobs'],
    [
      { from: 'web', to: 'api', count: 1 },
      { from: 'web', to: 'jobs', count: 1 },
      { from: 'api', to: 'core', count: 1 },
      { from: 'jobs', to: 'core', count: 1 },
    ],
  );
  assert.deepEqual(rows, [['web'], ['api', 'jobs'], ['core']]);
});

test('a cycle is cut deterministically — the layout never throws and repeat runs agree', () => {
  const edges = [
    { from: 'api', to: 'core', count: 1 },
    { from: 'core', to: 'api', count: 1 },
  ];
  const first = layerModules(['core', 'api'], edges);
  assert.deepEqual(first, layerModules(['core', 'api'], edges));
  assert.equal(first.flat().length, 2);
});

test('mapLayout is deterministic and gives every module a position inside the canvas', () => {
  const layout = mapLayout(
    ['core', 'api', 'web'],
    [
      { from: 'api', to: 'core', count: 1 },
      { from: 'web', to: 'api', count: 1 },
    ],
  );
  assert.equal(layout.pos.size, 3);
  for (const pos of layout.pos.values()) {
    assert.ok(pos.x >= 0 && pos.y >= 0 && pos.x < layout.width && pos.y < layout.height);
  }
  assert.deepEqual(layout, mapLayout(['core', 'api', 'web'], [
    { from: 'api', to: 'core', count: 1 },
    { from: 'web', to: 'api', count: 1 },
  ]));
});

// ---- the lattice: all six cell states ------------------------------------

const RULES_SNAP = snap({
  architecture: {
    modules: MODULES,
    rules: [
      { from: 'core', to: 'api', allowed: false, decisionId: 'DEC-001' },
      { from: 'core', to: 'web', allowed: false, decisionId: 'DEC-001', severity: 'error' },
      { from: 'api', to: 'core', allowed: true, decisionId: 'DEC-002' },
      { from: 'api', to: 'web', allowed: false, decisionId: 'DEC-003' },
      { from: 'web', to: 'api', allowed: false, decisionId: 'DEC-003' },
    ],
    conflicts: [{ from: 'web', to: 'api', allowedBy: ['DEC-004'], forbiddenBy: ['DEC-003'] }],
  },
  issues: [violation('core', 'web', 'DEC-001')],
  advisories: [violation('api', 'web', 'DEC-003')],
});

test('latticeCell renders all six states: self, unconstrained, allowed, forbidden, violated at both tiers, conflicted', () => {
  const model = archModel(RULES_SNAP);
  assert.equal(latticeCell(model, 'core', 'core').kind, 'self');
  assert.equal(latticeCell(model, 'web', 'core').kind, 'unconstrained');
  const allowed = latticeCell(model, 'api', 'core');
  assert.deepEqual(allowed, { kind: 'rule', allowed: true, decisionId: 'DEC-002', severity: 'advisory', violations: 0, violTier: null });
  const forbidden = latticeCell(model, 'core', 'api');
  assert.deepEqual(forbidden, { kind: 'rule', allowed: false, decisionId: 'DEC-001', severity: 'advisory', violations: 0, violTier: null });
  const violatedError = latticeCell(model, 'core', 'web');
  assert.deepEqual(violatedError, { kind: 'rule', allowed: false, decisionId: 'DEC-001', severity: 'error', violations: 1, violTier: 'error' });
  const violatedAdvisory = latticeCell(model, 'api', 'web');
  assert.equal(violatedAdvisory.kind, 'rule');
  assert.equal((violatedAdvisory as { violTier: string }).violTier, 'advisory');
  const conflicted = latticeCell(model, 'web', 'api');
  assert.deepEqual(conflicted, { kind: 'conflict', allowedBy: ['DEC-004'], forbiddenBy: ['DEC-003'] });
});

test('a conflicted edge shows no violation rows at any severity (DEC-061): the conflict cell carries no count', () => {
  // The snapshot's finding arrays are already conflict-silenced by core; the
  // view must not re-derive violations for a conflicted pair from anywhere.
  const model = archModel(RULES_SNAP);
  assert.equal(edgeTier(model, 'web', 'api'), 'conflict');
  const cell = latticeCell(model, 'web', 'api');
  assert.equal(cell.kind, 'conflict');
  assert.ok(!('violations' in cell));
});

// ---- module detail --------------------------------------------------------

test('moduleDeps carries provenance chips and severity markers, observed rows only', () => {
  const model = archModel(
    snap({
      architecture: {
        modules: MODULES,
        rules: [
          { from: 'core', to: 'api', allowed: false, decisionId: 'DEC-001' },
          { from: 'api', to: 'core', allowed: true, decisionId: 'DEC-002' },
        ],
        conflicts: [],
      },
      archObserved: {
        edges: [
          { from: 'api', to: 'core', file: 'packages/api/src/a.ts', specifier: '@x/core' },
          { from: 'api', to: 'core', file: 'packages/api/src/b.ts', specifier: '@x/core' },
          { from: 'core', to: 'api', file: 'packages/core/src/a.ts', specifier: '@x/api' },
          { from: 'web', to: 'core', file: 'packages/web/src/a.ts', specifier: '@x/core' },
        ],
        skipped: [],
        files: [],
        exports: {},
      },
      advisories: [violation('core', 'api', 'DEC-001')],
    }),
  );
  const core = moduleDeps(model, 'core');
  assert.deepEqual(core.out, [{ other: 'api', count: 1, provenance: 'declared + observed', viol: 'advisory', conflict: false }]);
  assert.deepEqual(core.in, [
    { other: 'api', count: 2, provenance: 'declared + observed', viol: null, conflict: false },
    { other: 'web', count: 1, provenance: 'observed', viol: null, conflict: false },
  ]);
});

test('governingDecisions and relatedRequirements derive from rules, conflicts, and decision links', () => {
  const model = archModel(RULES_SNAP);
  assert.deepEqual(governingDecisions(model, 'web'), ['DEC-001', 'DEC-003', 'DEC-004']);
  const byId = docsById(
    snap({
      documents: [
        doc({ id: 'DEC-001', type: 'decision', title: 'Core pure', status: 'active', links: [{ id: 'REQ-001', rel: 'satisfies' }] }),
        doc({ id: 'REQ-001', type: 'requirement', title: 'Boundaries', status: 'accepted' }),
        doc({ id: 'DEC-003', type: 'decision', title: 'API serves', status: 'active', links: [{ id: 'DEC-001', rel: 'follows-from' }] }),
      ],
    }),
  );
  // Only requirement links survive; a decision → decision link is not a REQ.
  assert.deepEqual(relatedRequirements(byId, ['DEC-001', 'DEC-003']), ['REQ-001']);
});

test('listDir walks module → directory → file → imports over the scanned facts', () => {
  const files = [
    { module: 'core', file: 'packages/core/src/a.ts', imports: ['./b.ts', 'node:fs'] },
    { module: 'core', file: 'packages/core/src/deep/c.ts', imports: [] },
    { module: 'core', file: 'packages/core/readme.ts', imports: [] },
    { module: 'api', file: 'packages/api/src/x.ts', imports: [] },
  ];
  const top = listDir(files, 'core', 'packages/core', []);
  assert.deepEqual(top, [
    { name: 'src', kind: 'dir', fileCount: 2, imports: [] },
    { name: 'readme.ts', kind: 'file', fileCount: 0, imports: [] },
  ]);
  const src = listDir(files, 'core', 'packages/core', ['src']);
  assert.deepEqual(src.map((r) => [r.name, r.kind]), [['deep', 'dir'], ['a.ts', 'file']]);
  assert.deepEqual(src.find((r) => r.name === 'a.ts')?.imports, ['./b.ts', 'node:fs']);
  assert.equal(moduleFileCount(archModel(snap({ archObserved: { edges: [], skipped: [], files, exports: {} } })), 'core'), 3);
});

// ---- home card + reader card ----------------------------------------------

test('archSummary surfaces the highest tier: issue over advisory over the explicit clean line', () => {
  const clean = archSummary(snap());
  assert.deepEqual(clean.top, { kind: 'clean', text: 'observed imports respect every active constraint' });
  const advisory = archSummary(snap({ advisories: [violation('api', 'web', 'DEC-003')] }));
  assert.deepEqual(advisory.top, { kind: 'advisory', text: '1 observed import crosses a forbidden edge' });
  const issue = archSummary(snap({ issues: [violation('core', 'web', 'DEC-001')], advisories: [violation('api', 'web', 'DEC-003')] }));
  assert.equal(issue.top.kind, 'issue');
  assert.equal(clean.modules, 3);
});

test('advisory-severity violations never alter the issue count or the health color inputs (DEC-025)', () => {
  const s = snap({ advisories: [violation('api', 'web', 'DEC-003'), violation('api', 'web', 'DEC-003')] });
  assert.equal(s.issues.length, 0);
  const summary = archSummary(s);
  assert.equal(summary.advisoryViolations, 2);
  assert.equal(summary.top.kind, 'advisory');
});

test('decisionRules reads the decision frontmatter itself — proposed decisions show their declared rules too', () => {
  const proposed = doc({
    id: 'DEC-009',
    type: 'decision',
    title: 'Proposed wall',
    status: 'proposed',
    frontmatter: {
      architecture: { constraints: [{ from: 'core', to: ['api', 'web'], allowed: false, severity: 'error' }] },
    },
  });
  const rows = decisionRules(snap({ documents: [proposed] }), proposed);
  assert.deepEqual(rows.map((r) => [r.from, r.to, r.allowed, r.severity]), [
    ['core', 'api', false, 'error'],
    ['core', 'web', false, 'error'],
  ]);
  assert.deepEqual(rows.map((r) => r.observed), [0, 0]);
});

test('decisionRules marks observed status by tier and flags conflicted edges', () => {
  const dec = doc({
    id: 'DEC-003',
    type: 'decision',
    title: 'API serves',
    status: 'active',
    frontmatter: {
      architecture: { constraints: [{ from: 'api', to: 'web', allowed: false }, { from: 'web', to: 'api', allowed: false }] },
    },
  });
  const rows = decisionRules(RULES_SNAP, dec);
  assert.deepEqual(rows[0], { from: 'api', to: 'web', allowed: false, severity: 'advisory', observed: 1, tier: 'advisory', conflicted: false });
  assert.equal(rows[1].conflicted, true);
});

// ---- issue anchoring (derive.ts) ------------------------------------------

test('an arch-violation issue anchors to its governing decision for the banner and the HEALTH row', () => {
  const dec = doc({ id: 'DEC-001', type: 'decision', title: 'Core pure', status: 'active' });
  const s = snap({ documents: [dec], issues: [violation('core', 'web', 'DEC-001')] });
  assert.deepEqual(issuesByDoc(s).get('DEC-001'), [violation('core', 'web', 'DEC-001')]);
  assert.equal(issueDocId(s, violation('core', 'web', 'DEC-001')), 'DEC-001');
});
