import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CommitFact, GitFacts, VeriDocument } from './index.ts';
import { checkDrift, checkSupersededLinks, parseGitLog } from './index.ts';

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

const RECEIPT_BODY = '## Summary\n\nx\n\n## Receipts\n\n- 2026-08-10 — bbbbbbb — veri/work-orders — closed\n';

// --- parseGitLog: the shared host-collector parser ---

test('parseGitLog reads sha, date, subject, and files from the escape format', () => {
  const raw = '\x01aaaa\x022026-08-18\x02WO-001: build\nfile-a.ts\nfile-b.ts\n\x01bbbb\x022026-08-17\x02older\nREADME.md\n';
  const { commits } = parseGitLog(raw);
  assert.equal(commits.length, 2);
  assert.deepEqual(commits[0], { sha: 'aaaa', date: '2026-08-18', subject: 'WO-001: build', files: ['file-a.ts', 'file-b.ts'] });
  assert.deepEqual(commits[1].files, ['README.md']);
});

// --- detector: in-progress work standing on superseded authority (pure) ---

test('an in-progress work order linking a superseded decision yields drift-superseded-link', () => {
  const documents = [
    doc({
      id: 'WO-001',
      type: 'work-order',
      status: 'in-progress',
      file: 'work-orders/WO-001.md',
      links: [{ id: 'DEC-001', rel: 'constrained-by' }],
    }),
    doc({ id: 'DEC-001', type: 'decision', status: 'superseded', supersededBy: 'DEC-002', file: 'decisions/DEC-001.md' }),
    doc({ id: 'DEC-002', type: 'decision', status: 'active', file: 'decisions/DEC-002.md' }),
  ];
  const advisories = checkSupersededLinks(documents);
  assert.equal(advisories.length, 1);
  assert.equal(advisories[0].kind, 'drift-superseded-link');
  assert.equal(advisories[0].id, 'WO-001');
  assert.match(advisories[0].message, /superseded by DEC-002/);
});

test('done and backlog work orders linking a superseded decision are history and planning, not drift', () => {
  const superseded = doc({ id: 'DEC-001', type: 'decision', status: 'superseded', file: 'decisions/DEC-001.md' });
  for (const status of ['done', 'backlog']) {
    const workOrder = doc({
      id: 'WO-001',
      type: 'work-order',
      status,
      file: 'work-orders/WO-001.md',
      links: [{ id: 'DEC-001', rel: 'constrained-by' }],
    });
    assert.deepEqual(checkSupersededLinks([workOrder, superseded]), [], status);
  }
});

// --- detector: requirement edited after its implementing work order closed ---

/** History (newest-first): REQ edit AFTER the WO-001 close commit. */
const EDIT_AFTER_CLOSE: GitFacts = {
  commits: [
    commit('a', '2026-08-12', 'REQ-001: sharpen wording', ['veri/requirements/REQ-001.md']),
    commit('b', '2026-08-10', 'WO-001: done — receipt', ['veri/work-orders/WO-001.md']),
    commit('c', '2026-08-05', 'REQ-001: drafted', ['veri/requirements/REQ-001.md']),
  ],
};

function implementingPair(): VeriDocument[] {
  return [
    doc({
      id: 'WO-001',
      type: 'work-order',
      status: 'done',
      file: 'work-orders/WO-001.md',
      body: RECEIPT_BODY,
      links: [{ id: 'REQ-001', rel: 'implements' }],
    }),
    doc({ id: 'REQ-001', type: 'requirement', status: 'accepted', file: 'requirements/REQ-001.md' }),
  ];
}

test('a requirement edited after its implementing work order closed yields drift-edited-after-done', () => {
  const advisories = checkDrift(implementingPair(), EDIT_AFTER_CLOSE, 'veri');
  assert.deepEqual(advisories.map((a) => a.kind), ['drift-edited-after-done']);
  assert.equal(advisories[0].id, 'REQ-001');
  assert.match(advisories[0].message, /after WO-001/);
});

test('a requirement edited before the close is not drift', () => {
  const editBefore: GitFacts = {
    commits: [
      commit('b', '2026-08-10', 'WO-001: done — receipt', ['veri/work-orders/WO-001.md']),
      commit('a', '2026-08-08', 'REQ-001: sharpen wording', ['veri/requirements/REQ-001.md']),
    ],
  };
  assert.deepEqual(checkDrift(implementingPair(), editBefore, 'veri'), []);
});

test('an approval after the close is a lifecycle write, not drift', () => {
  const approveAfter: GitFacts = {
    commits: [
      commit('a', '2026-08-12', 'REQ-001: approved', ['veri/requirements/REQ-001.md']),
      commit('b', '2026-08-10', 'WO-001: done — receipt', ['veri/work-orders/WO-001.md']),
    ],
  };
  assert.deepEqual(checkDrift(implementingPair(), approveAfter, 'veri'), []);
});

// --- detector: approved document edited after its stamp ---

test('an approved document edited after its stamp commit yields drift-approved-edited', () => {
  const documents = [
    doc({ id: 'DEC-001', type: 'decision', status: 'active', approved: '2026-08-10', file: 'decisions/DEC-001.md' }),
  ];
  const facts: GitFacts = {
    commits: [
      commit('a', '2026-08-12', 'tighten the rationale', ['veri/decisions/DEC-001.md']),
      commit('b', '2026-08-10', 'DEC-001: approved', ['veri/decisions/DEC-001.md']),
      commit('c', '2026-08-09', 'DEC-001: proposed', ['veri/decisions/DEC-001.md']),
    ],
  };
  const advisories = checkDrift(documents, facts, 'veri');
  assert.deepEqual(advisories.map((a) => a.kind), ['drift-approved-edited']);
  assert.match(advisories[0].message, /approved 2026-08-10/);
});

test('the approve flow\'s own guarded-line write is not drift', () => {
  const documents = [
    doc({ id: 'DEC-001', type: 'decision', status: 'active', approved: '2026-08-10', file: 'decisions/DEC-001.md' }),
  ];
  const facts: GitFacts = {
    commits: [
      commit('b', '2026-08-10', 'DEC-001: approved', ['veri/decisions/DEC-001.md']),
      commit('c', '2026-08-09', 'DEC-001: proposed', ['veri/decisions/DEC-001.md']),
    ],
  };
  assert.deepEqual(checkDrift(documents, facts, 'veri'), []);
});

test('without a recognizable stamp commit, committer dates after the stamp date decide', () => {
  const documents = [
    doc({ id: 'REQ-001', type: 'requirement', status: 'accepted', approved: '2026-08-10', file: 'requirements/REQ-001.md' }),
  ];
  const stampless: GitFacts = {
    commits: [
      commit('a', '2026-08-12', 'reword acceptance criteria', ['veri/requirements/REQ-001.md']),
      commit('c', '2026-08-08', 'batch ratification of the corpus', ['veri/requirements/REQ-001.md']),
    ],
  };
  const advisories = checkDrift(documents, stampless, 'veri');
  assert.deepEqual(advisories.map((a) => a.kind), ['drift-approved-edited']);
  const editedBeforeOnly: GitFacts = { commits: [stampless.commits[1]] };
  assert.deepEqual(checkDrift(documents, editedBeforeOnly, 'veri'), []);
});

test('superseded documents are history — their stamps are not checked', () => {
  const documents = [
    doc({ id: 'DEC-001', type: 'decision', status: 'superseded', approved: '2026-08-10', file: 'decisions/DEC-001.md' }),
  ];
  const facts: GitFacts = {
    commits: [commit('a', '2026-08-12', 'edited anyway', ['veri/decisions/DEC-001.md'])],
  };
  assert.deepEqual(checkDrift(documents, facts, 'veri'), []);
});

test('a veri/ directory at the repo root maps document paths without a prefix', () => {
  const documents = [
    doc({ id: 'DEC-001', type: 'decision', status: 'active', approved: '2026-08-10', file: 'decisions/DEC-001.md' }),
  ];
  const facts: GitFacts = {
    commits: [
      commit('a', '2026-08-12', 'tweak', ['decisions/DEC-001.md']),
      commit('b', '2026-08-10', 'DEC-001: approved', ['decisions/DEC-001.md']),
    ],
  };
  assert.equal(checkDrift(documents, facts, '').length, 1);
});

test('a re-approval newer than the offending edit resolves drift-edited-after-done', () => {
  const ratified: GitFacts = {
    commits: [
      commit('d', '2026-08-13', 'REQ-001: re-approved', ['veri/requirements/REQ-001.md']),
      commit('a', '2026-08-12', 'REQ-001: sharpen wording', ['veri/requirements/REQ-001.md']),
      commit('b', '2026-08-10', 'WO-001: done — receipt', ['veri/work-orders/WO-001.md']),
    ],
  };
  assert.deepEqual(checkDrift(implementingPair(), ratified, 'veri'), []);
  // A ratification older than the edit covers nothing: still drift.
  const staleRatification: GitFacts = {
    commits: [
      commit('a', '2026-08-14', 'REQ-001: sharpen wording', ['veri/requirements/REQ-001.md']),
      commit('d', '2026-08-13', 'REQ-001: approved', ['veri/requirements/REQ-001.md']),
      commit('b', '2026-08-10', 'WO-001: done — receipt', ['veri/work-orders/WO-001.md']),
    ],
  };
  assert.deepEqual(
    checkDrift(implementingPair(), staleRatification, 'veri').map((a) => a.kind),
    ['drift-edited-after-done'],
  );
});
