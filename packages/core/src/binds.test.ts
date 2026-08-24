import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CommitFact, GitFacts, VeriDocument } from './index.ts';
import {
  DEFAULT_STALE_AFTER_DAYS,
  bindingClaimants,
  boundTests,
  checkBindingDrift,
  checkBoundTests,
  globToRegExp,
  pathMatchesBinds,
  staleAfterDays,
} from './index.ts';

function doc(overrides: Partial<VeriDocument> & Pick<VeriDocument, 'id' | 'type' | 'status' | 'file'>): VeriDocument {
  return {
    title: overrides.id,
    created: '2026-08-01',
    updated: '2026-08-01',
    links: [],
    frontmatter: {},
    body: '## Summary\n\nx\n',
    inlineRefs: [],
    ...overrides,
  };
}

function commit(sha: string, date: string, subject: string, files: string[]): CommitFact {
  return { sha: sha.repeat(40).slice(0, 40), date, subject, files };
}

function boundWo(id: string, paths: string[], created = '2026-08-01'): VeriDocument {
  return doc({
    id,
    type: 'work-order',
    status: 'in-progress',
    file: `work-orders/${id}.md`,
    created,
    binds: { paths, tests: [] },
  });
}

const OPTS = { veriPath: 'veri', today: '2026-08-24' };

// --- glob matching ---

test('globToRegExp: * stays inside a segment, ** crosses, ? is one char', () => {
  assert.ok(globToRegExp('src/*.ts').test('src/a.ts'));
  assert.ok(!globToRegExp('src/*.ts').test('src/deep/a.ts'));
  assert.ok(globToRegExp('src/**').test('src/deep/a.ts'));
  assert.ok(globToRegExp('**/limits.ts').test('limits.ts'));
  assert.ok(globToRegExp('**/limits.ts').test('src/billing/limits.ts'));
  assert.ok(globToRegExp('src/?.ts').test('src/a.ts'));
  assert.ok(!globToRegExp('src/?.ts').test('src/ab.ts'));
  // Regex specials in paths are literal, never operators.
  assert.ok(globToRegExp('src/a.b.ts').test('src/a.b.ts'));
  assert.ok(!globToRegExp('src/a.b.ts').test('src/aXb.ts'));
});

test('pathMatchesBinds: a glob-free pattern claims itself and everything beneath it', () => {
  assert.ok(pathMatchesBinds('packages/core/src/a.ts', ['packages/core']));
  assert.ok(pathMatchesBinds('packages/core', ['packages/core']));
  assert.ok(!pathMatchesBinds('packages/corex/a.ts', ['packages/core']));
  assert.ok(!pathMatchesBinds('anything', ['']));
});

// --- registries ---

test('bindingClaimants and boundTests read only in-progress work orders', () => {
  const documents = [
    boundWo('WO-001', ['src/**']),
    doc({ id: 'WO-002', type: 'work-order', status: 'backlog', file: 'work-orders/WO-002.md', binds: { paths: ['x/**'], tests: ['x/a.test.ts'] } }),
    doc({ id: 'WO-003', type: 'work-order', status: 'in-progress', file: 'work-orders/WO-003.md', binds: { paths: [], tests: ['tests/b.test.ts', 'tests/b.test.ts'] } }),
  ];
  assert.deepEqual(bindingClaimants(documents).map((d) => d.id), ['WO-001']);
  assert.deepEqual(boundTests(documents), ['tests/b.test.ts']);
});

test('staleAfterDays reads workflow frontmatter and falls back to the default', () => {
  assert.equal(staleAfterDays([]), DEFAULT_STALE_AFTER_DAYS);
  const workflow = doc({ id: 'WF-001', type: 'workflow', status: 'accepted', file: 'workflow.md', frontmatter: { stale_after_days: 30 } });
  assert.equal(staleAfterDays([workflow]), 30);
});

// --- detector: unclaimed code change ---

test('an era commit touching code no binding or subject claims is unclaimed', () => {
  const facts: GitFacts = {
    commits: [
      commit('a', '2026-08-20', 'tweak billing', ['src/billing/meter.ts', 'src/auth/login.ts']),
      commit('b', '2026-08-19', 'WO-001: started', ['veri/work-orders/WO-001.md']),
    ],
  };
  const advisories = checkBindingDrift([boundWo('WO-001', ['src/billing/**'])], facts, OPTS);
  assert.equal(advisories.length, 1);
  assert.equal(advisories[0].kind, 'drift-unclaimed-change');
  assert.equal(advisories[0].file, 'src/auth/login.ts');
  assert.match(advisories[0].message, /src\/auth\/login\.ts/);
});

test('binding-matched files and subject-claimed commits are never unclaimed', () => {
  const facts: GitFacts = {
    commits: [
      commit('a', '2026-08-20', 'refactor everything', ['other/place.ts']),
      commit('b', '2026-08-20', 'tweak meter', ['src/billing/meter.ts']),
      commit('c', '2026-08-19', 'WO-001: started', ['veri/work-orders/WO-001.md']),
    ],
  };
  const claimed = checkBindingDrift([boundWo('WO-001', ['src/billing/**'])], facts, OPTS);
  assert.equal(claimed.filter((a) => a.kind === 'drift-unclaimed-change' && a.file.startsWith('src/')).length, 0);
  const bySubject = checkBindingDrift(
    [boundWo('WO-001', ['src/billing/**'])],
    { commits: [commit('d', '2026-08-20', 'WO-002: other work', ['other/place.ts']), ...facts.commits] },
    OPTS,
  );
  assert.ok(!bySubject.some((a) => a.kind === 'drift-unclaimed-change' && a.message.includes('WO-002')));
});

test('commits before the era, and veri/-only commits, are not unclaimed', () => {
  const facts: GitFacts = {
    commits: [
      commit('a', '2026-08-20', 'notes', ['veri/sources/SRC-001.md']),
      commit('b', '2026-08-19', 'WO-001: started', ['veri/work-orders/WO-001.md']),
      commit('c', '2026-08-15', 'ancient unclaimed work', ['src/other/old.ts']),
    ],
  };
  const advisories = checkBindingDrift([boundWo('WO-001', ['src/billing/**'])], facts, OPTS);
  assert.equal(advisories.filter((a) => a.kind === 'drift-unclaimed-change').length, 0);
});

test('without a start commit the era falls back to the created date', () => {
  const facts: GitFacts = {
    commits: [
      commit('a', '2026-08-20', 'in-era edit', ['src/other/new.ts']),
      commit('b', '2026-08-05', 'pre-era edit', ['src/other/old.ts']),
    ],
  };
  const advisories = checkBindingDrift([boundWo('WO-001', ['src/billing/**'], '2026-08-10')], facts, OPTS);
  const unclaimed = advisories.filter((a) => a.kind === 'drift-unclaimed-change');
  assert.equal(unclaimed.length, 1);
  assert.equal(unclaimed[0].file, 'src/other/new.ts');
});

test('no binding claimants, or a knowledge-base-only repo, means inert detectors', () => {
  const facts: GitFacts = { commits: [commit('a', '2026-08-20', 'anything', ['src/x.ts'])] };
  assert.deepEqual(checkBindingDrift([], facts, OPTS), []);
  assert.deepEqual(checkBindingDrift([boundWo('WO-001', ['src/**'])], facts, { ...OPTS, veriPath: '' }), []);
});

// --- detector: stale work order ---

test('an in-progress work order with silent bound paths past the window is stale', () => {
  const facts: GitFacts = {
    commits: [commit('b', '2026-08-01', 'WO-001: started', ['veri/work-orders/WO-001.md'])],
  };
  const advisories = checkBindingDrift([boundWo('WO-001', ['src/billing/**'])], facts, OPTS);
  const stale = advisories.filter((a) => a.kind === 'drift-stale-wo');
  assert.equal(stale.length, 1);
  assert.equal(stale[0].id, 'WO-001');
  assert.match(stale[0].message, /stale after 14 days/);
});

test('recent bound-path commits, or a young work order, are not stale', () => {
  const active: GitFacts = {
    commits: [
      commit('a', '2026-08-22', 'WO-001: progress', ['src/billing/meter.ts']),
      commit('b', '2026-08-01', 'WO-001: started', ['veri/work-orders/WO-001.md']),
    ],
  };
  assert.equal(checkBindingDrift([boundWo('WO-001', ['src/billing/**'])], active, OPTS).filter((a) => a.kind === 'drift-stale-wo').length, 0);
  const young: GitFacts = {
    commits: [commit('c', '2026-08-20', 'WO-001: started', ['veri/work-orders/WO-001.md'])],
  };
  assert.equal(checkBindingDrift([boundWo('WO-001', ['src/billing/**'])], young, OPTS).filter((a) => a.kind === 'drift-stale-wo').length, 0);
});

test('the staleness window is configurable', () => {
  const facts: GitFacts = {
    commits: [commit('b', '2026-08-18', 'WO-001: started', ['veri/work-orders/WO-001.md'])],
  };
  const advisories = checkBindingDrift([boundWo('WO-001', ['src/**'])], facts, { ...OPTS, staleAfterDays: 3 });
  assert.match(advisories.filter((a) => a.kind === 'drift-stale-wo')[0]!.message, /stale after 3 days/);
});

// --- detector: bound tests ---

test('a bound test the host reports missing is an advisory; resolved and unresolved ids are not', () => {
  const wo = doc({
    id: 'WO-001',
    type: 'work-order',
    status: 'in-progress',
    file: 'work-orders/WO-001.md',
    binds: { paths: [], tests: ['tests/a.test.ts', 'tests/b.test.ts::caps', 'tests/unresolved.test.ts'] },
  });
  const advisories = checkBoundTests(
    [wo],
    [
      { id: 'tests/a.test.ts', exists: true },
      { id: 'tests/b.test.ts::caps', exists: false },
    ],
  );
  assert.equal(advisories.length, 1);
  assert.equal(advisories[0].kind, 'drift-missing-test');
  assert.match(advisories[0].message, /tests\/b\.test\.ts::caps/);
});
