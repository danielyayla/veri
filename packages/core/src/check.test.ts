import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProject } from './load.ts';
import { checkProject, checkSharedClaims, checkStaleClaims, checkStructure, expectedSections, missingSections } from './check.ts';
import type { VeriDocument } from './types.ts';

interface BrokenCase {
  dir: string;
  expected: Array<Record<string, unknown>>;
}

const CASES: BrokenCase[] = [
  {
    dir: 'invalid-yaml',
    expected: [{ kind: 'invalid-frontmatter', file: 'requirements/REQ-001-broken.md', field: null }],
  },
  {
    dir: 'missing-field',
    expected: [{ kind: 'invalid-frontmatter', file: 'requirements/REQ-001-no-status.md', field: 'status' }],
  },
  {
    dir: 'bad-status',
    expected: [{ kind: 'invalid-frontmatter', file: 'requirements/REQ-001-bad-status.md', field: 'status' }],
  },
  {
    dir: 'id-prefix-mismatch',
    expected: [{ kind: 'invalid-frontmatter', file: 'requirements/DEC-001-wrong-prefix.md', field: 'id' }],
  },
  {
    dir: 'superseded-missing-target',
    expected: [{ kind: 'invalid-frontmatter', file: 'decisions/DEC-001-superseded.md', field: 'superseded_by' }],
  },
  {
    dir: 'duplicate-id',
    expected: [
      {
        kind: 'duplicate-id',
        id: 'REQ-001',
        files: ['requirements/REQ-001-first.md', 'requirements/REQ-001-second.md'],
      },
    ],
  },
  {
    dir: 'broken-frontmatter-link',
    expected: [{ kind: 'broken-link', sourceId: 'REQ-001', targetId: 'DEC-999', via: 'frontmatter' }],
  },
  {
    dir: 'broken-inline-ref',
    expected: [{ kind: 'broken-link', sourceId: 'REQ-001', targetId: 'SRC-999', via: 'inline' }],
  },
  {
    dir: 'broken-superseded-by',
    expected: [{ kind: 'broken-link', sourceId: 'DEC-001', targetId: 'DEC-999', via: 'superseded_by' }],
  },
  {
    dir: 'wo-without-requirement',
    expected: [{ kind: 'wo-without-requirement', id: 'WO-001' }],
  },
  {
    dir: 'done-wo-unchecked',
    expected: [{ kind: 'done-wo-violation', id: 'WO-001', problem: 'unchecked-criteria' }],
  },
  {
    dir: 'done-wo-no-receipt',
    expected: [{ kind: 'done-wo-violation', id: 'WO-001', problem: 'no-receipt' }],
  },
  {
    dir: 'gated-wo',
    expected: [{ kind: 'gated-wo', id: 'WO-001', targetId: 'REQ-001', targetStatus: 'draft' }],
  },
  {
    dir: 'missing-approval',
    expected: [{ kind: 'missing-approval', id: 'DEC-001', file: 'decisions/DEC-001-unstamped.md' }],
  },
  {
    dir: 'workflow-missing-approval',
    expected: [{ kind: 'missing-approval', id: 'WF-001', file: 'workflow.md' }],
  },
  {
    dir: 'gated-wo-workflow',
    expected: [{ kind: 'gated-wo', id: 'WO-001', targetId: 'WF-001', targetStatus: 'draft' }],
  },
  {
    // WO-098: ready is a promotion — reached without the stamp it fails.
    dir: 'ready-wo-unstamped',
    expected: [{ kind: 'missing-approval', id: 'WO-001', file: 'work-orders/WO-001-ready-unstamped.md' }],
  },
  {
    // WO-098: the gate covers ready like any started status — dispatch
    // clearance over a pending link is a violation.
    dir: 'gated-wo-ready',
    expected: [{ kind: 'gated-wo', id: 'WO-001', targetId: 'REQ-001', targetStatus: 'draft' }],
  },
  {
    // WO-099: in-progress asserts a session holds the work — no claim, no
    // account of which one.
    dir: 'unclaimed-wo',
    expected: [{ kind: 'unclaimed-wo', id: 'WO-001', file: 'work-orders/WO-001-unclaimed.md' }],
  },
  {
    // WO-099: claimed_by and claimed_at travel together — half a claim is
    // malformed frontmatter, not a satisfied check.
    dir: 'half-claim',
    expected: [{ kind: 'invalid-frontmatter', file: 'work-orders/WO-001-half-claimed.md', field: 'claimed_at' }],
  },
  {
    dir: 'ui-wo-without-design',
    expected: [{ kind: 'ui-wo-without-design', id: 'WO-001', file: 'work-orders/WO-001-ui-no-design.md' }],
  },
  {
    // A designed-by link to a missing id is reported AND does not satisfy
    // the design gate — both issues fire (WO-010).
    dir: 'ui-wo-broken-design-link',
    expected: [
      { kind: 'broken-link', sourceId: 'WO-001', targetId: 'SRC-999', via: 'frontmatter' },
      { kind: 'ui-wo-without-design', id: 'WO-001' },
    ],
  },
];

for (const { dir, expected } of CASES) {
  test(`broken fixture "${dir}" yields exactly its expected issue`, async () => {
    const load = await loadProject(new URL(`../fixtures/broken/${dir}`, import.meta.url));
    const issues = checkProject(load).issues;
    assert.equal(issues.length, expected.length, JSON.stringify(issues, null, 2));
    assert.partialDeepStrictEqual(issues, expected);
    for (const issue of issues) {
      assert.equal(typeof issue.message, 'string');
      assert.ok(issue.message.length > 0);
    }
  });
}

test('a backlog work order may cite pending documents — the gate is on starting work', async () => {
  const load = await loadProject(new URL('../fixtures/pending-ok', import.meta.url));
  assert.equal(load.documents.length, 3);
  assert.deepEqual(checkProject(load).issues, []);
});

// --- Design gate (DEC-012, machine-checked per WO-010) ---

test('a resolvable designed-by link satisfies the design gate; backlog is exempt', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-design-gate-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const sub of ['requirements', 'work-orders', 'sources']) mkdirSync(join(dir, sub), { recursive: true });
  // The gate's trigger paths come from the workflow document (DEC-039).
  writeFileSync(
    join(dir, 'workflow.md'),
    '---\nid: WF-001\ntype: workflow\ntitle: W\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\ndesign_gate_paths:\n  - packages/ui\n---\nRules.\n',
  );
  writeFileSync(
    join(dir, 'requirements', 'REQ-001-ui.md'),
    '---\nid: REQ-001\ntype: requirement\ntitle: T\nstatus: accepted\ncreated: 2026-08-01\nupdated: 2026-08-01\napproved: 2026-08-01\n---\n## Acceptance criteria\n\n- [ ] x\n',
  );
  writeFileSync(
    join(dir, 'sources', 'SRC-001-design.md'),
    '---\nid: SRC-001\ntype: source\ntitle: Design handoff\nstatus: imported\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\nThe design.\n',
  );
  const wo = (status: string, links: string): string =>
    `---\nid: WO-001\ntype: work-order\ntitle: T\nstatus: ${status}\n${
      status === 'in-progress' ? 'claimed_by: session-a\nclaimed_at: 2026-08-01\n' : ''
    }created: 2026-08-01\nupdated: 2026-08-01\nlinks:\n${links}---\n## Summary\n\nTouches packages/ui.\n`;

  // In-progress with a resolvable designed-by link: clean.
  const woPath = join(dir, 'work-orders', 'WO-001-ui.md');
  writeFileSync(woPath, wo('in-progress', '  - id: REQ-001\n    rel: implements\n  - id: SRC-001\n    rel: designed-by\n'));
  assert.deepEqual(checkProject(await loadProject(dir)).issues, []);

  // Backlog with no designed-by link: exempt — the gate fires on starting work.
  writeFileSync(woPath, wo('backlog', '  - id: REQ-001\n    rel: implements\n'));
  assert.deepEqual(checkProject(await loadProject(dir)).issues, []);

  // No declared design_gate_paths: the gate is inert, whatever bodies mention
  // (DEC-039) — core ships the mechanism, never a repo-specific trigger.
  writeFileSync(woPath, wo('in-progress', '  - id: REQ-001\n    rel: implements\n'));
  writeFileSync(
    join(dir, 'workflow.md'),
    '---\nid: WF-001\ntype: workflow\ntitle: W\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\nRules.\n',
  );
  assert.deepEqual(checkProject(await loadProject(dir)).issues, []);
});

test('the design gate ignores a gated path named only under "## Out of scope" (WO-112)', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-design-gate-scope-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const sub of ['requirements', 'work-orders', 'sources']) mkdirSync(join(dir, sub), { recursive: true });
  writeFileSync(
    join(dir, 'workflow.md'),
    '---\nid: WF-001\ntype: workflow\ntitle: W\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\ndesign_gate_paths:\n  - packages/ui\n---\nRules.\n',
  );
  writeFileSync(
    join(dir, 'requirements', 'REQ-001-ui.md'),
    '---\nid: REQ-001\ntype: requirement\ntitle: T\nstatus: accepted\ncreated: 2026-08-01\nupdated: 2026-08-01\napproved: 2026-08-01\n---\n## Acceptance criteria\n\n- [ ] x\n',
  );
  writeFileSync(
    join(dir, 'sources', 'SRC-001-design.md'),
    '---\nid: SRC-001\ntype: source\ntitle: Design handoff\nstatus: imported\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\nThe design.\n',
  );
  const woPath = join(dir, 'work-orders', 'WO-001-ui.md');
  const wo = (body: string, links = '  - id: REQ-001\n    rel: implements\n'): string =>
    `---\nid: WO-001\ntype: work-order\ntitle: T\nstatus: in-progress\nclaimed_by: session-a\nclaimed_at: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\nlinks:\n${links}---\n${body}`;
  const gated = async (): Promise<string[]> =>
    checkProject(await loadProject(dir)).issues.filter((issue) => issue.kind === 'ui-wo-without-design').map((issue) => issue.message);

  // An exclusion is a promise not to touch the path — never a claim to it.
  writeFileSync(woPath, wo('## Summary\n\nCore only.\n\n## Out of scope\n\n- Any change to packages/ui — its own work order.\n'));
  assert.deepEqual(await gated(), []);

  // Every other section still triggers, Summary and In scope alike.
  writeFileSync(woPath, wo('## Summary\n\nTouches packages/ui.\n\n## Out of scope\n\n- Nothing.\n'));
  assert.equal((await gated()).length, 1);
  writeFileSync(woPath, wo('## Summary\n\nx\n\n## In scope\n\n- packages/ui work\n\n## Out of scope\n\n- Nothing.\n'));
  assert.equal((await gated()).length, 1);

  // Mentioned in both: the claim wins — excluding one sentence never licenses
  // the other.
  writeFileSync(woPath, wo('## In scope\n\n- packages/ui work\n\n## Out of scope\n\n- Other packages/ui screens.\n'));
  assert.equal((await gated()).length, 1);

  // A resolvable designed-by link satisfies the gate wherever the path sits.
  const designed = '  - id: REQ-001\n    rel: implements\n  - id: SRC-001\n    rel: designed-by\n';
  writeFileSync(woPath, wo('## In scope\n\n- packages/ui work\n\n## Out of scope\n\n- packages/ui elsewhere.\n', designed));
  assert.deepEqual(await gated(), []);

  // A designed-by link to a missing id still fails the gate, as before.
  const broken = '  - id: REQ-001\n    rel: implements\n  - id: SRC-999\n    rel: designed-by\n';
  writeFileSync(woPath, wo('## In scope\n\n- packages/ui work\n', broken));
  assert.equal((await gated()).length, 1);
});

// --- Multi-maintainer stamps (REQ-026, DEC-071) ---

test('maintainer stamps: unlisted approver is an issue, missing approver an advisory, solo repos untouched', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-maintainers-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'decisions'), { recursive: true });
  const workflow = (maintainers: string): string =>
    `---\nid: WF-001\ntype: workflow\ntitle: W\nstatus: accepted\napproved: 2026-08-01\napproved_by: Ada\ncreated: 2026-08-01\nupdated: 2026-08-01\n${maintainers}---\nRules.\n`;
  const dec = (stamp: string): string =>
    `---\nid: DEC-001\ntype: decision\ntitle: T\nstatus: active\napproved: 2026-08-02\n${stamp}created: 2026-08-02\nupdated: 2026-08-02\n---\n## Choice\n\nx\n\n## Rejected alternatives\n\n- **y** — z\n\n## Rationale\n\nw\n`;
  const decPath = join(dir, 'decisions', 'DEC-001-choice.md');

  // A listed maintainer's stamp binds exactly like the owner's: clean.
  writeFileSync(join(dir, 'workflow.md'), workflow('maintainers:\n  - Ada\n  - Grace\n'));
  writeFileSync(decPath, dec('approved_by: Grace\n'));
  // Bodies here are minimal, so structure advisories fire; only the
  // maintainer tier is under test.
  const approverAdvisories = (r: { advisories: Array<{ kind: string }> }): Array<{ kind: string }> =>
    r.advisories.filter((advisory) => advisory.kind === 'missing-approver');
  let result = checkProject(await loadProject(dir));
  assert.deepEqual(result.issues, []);
  assert.deepEqual(approverAdvisories(result), []);

  // A stamp naming someone off the roster fails — misattribution is an issue.
  writeFileSync(decPath, dec('approved_by: Mallory\n'));
  result = checkProject(await loadProject(dir));
  assert.partialDeepStrictEqual(result.issues, [
    { kind: 'unknown-approver', id: 'DEC-001', file: 'decisions/DEC-001-choice.md', approver: 'Mallory' },
  ]);
  assert.equal(result.issues.length, 1);

  // A pre-team stamp with no approver only warns (grandfathered, DEC-025).
  writeFileSync(decPath, dec(''));
  result = checkProject(await loadProject(dir));
  assert.deepEqual(result.issues, []);
  assert.partialDeepStrictEqual(approverAdvisories(result), [
    { kind: 'missing-approver', id: 'DEC-001', file: 'decisions/DEC-001-choice.md' },
  ]);
  assert.equal(approverAdvisories(result).length, 1);

  // No maintainers list: team semantics inert — even a stray approved_by
  // passes, and nothing warns. The solo experience is untouched (REQ-026).
  writeFileSync(join(dir, 'workflow.md'), workflow(''));
  writeFileSync(decPath, dec('approved_by: Mallory\n'));
  result = checkProject(await loadProject(dir));
  assert.deepEqual(result.issues, []);
  assert.deepEqual(approverAdvisories(result), []);
});

// --- Structure advisories (REQ-006 at DEC-025's advisory severity) ---

function structureSandbox(t: TestContext): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-structure-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

const DOC = (id: string, type: string, status: string, body: string): string =>
  `---\nid: ${id}\ntype: ${type}\ntitle: T\nstatus: ${status}\ncreated: 2026-08-13\nupdated: 2026-08-13\n---\n${body}`;

test('expected sections are the ## headings of the effective template, in order', (t) => {
  const dir = structureSandbox(t);
  // No project file: the built-in decision template applies.
  assert.deepEqual(expectedSections(dir, 'decision'), ['Choice', 'Rejected alternatives', 'Rationale']);
  // A customized template replaces the built-in sections entirely (DEC-025).
  mkdirSync(join(dir, 'templates'), { recursive: true });
  writeFileSync(join(dir, 'templates', 'decision.md'), '## Context\n\n## Consequences\n\n### Not a section\n');
  assert.deepEqual(expectedSections(dir, 'decision'), ['Context', 'Consequences']);
  const doc = { type: 'decision' as const, body: '## Choice\n\nx\n\n## Consequences\n\ny\n' };
  assert.deepEqual(missingSections(dir, doc), ['Context']);
});

test('a template with no ## headings expects nothing', (t) => {
  const dir = structureSandbox(t);
  // The built-in source template has no ## headings.
  assert.deepEqual(expectedSections(dir, 'source'), []);
  assert.deepEqual(missingSections(dir, { type: 'source', body: 'anything at all' }), []);
});

test('missing sections are advisories with file and one-line message — never issues', async (t) => {
  const dir = structureSandbox(t);
  mkdirSync(join(dir, 'requirements'), { recursive: true });
  writeFileSync(join(dir, 'requirements', 'REQ-001-bare.md'), DOC('REQ-001', 'requirement', 'draft', '(prose, no sections)\n'));
  const load = await loadProject(dir);
  const { issues, advisories } = checkProject(load);
  assert.deepEqual(issues, []);
  assert.deepEqual(advisories, [
    {
      kind: 'missing-section',
      file: 'requirements/REQ-001-bare.md',
      id: 'REQ-001',
      section: 'Acceptance criteria',
      message: 'REQ-001 has no "## Acceptance criteria" section — the requirement template expects one',
    },
  ]);
  assert.ok(!advisories[0]!.message.includes('\n'));
});

test('a custom-template project is checked against its own headings', async (t) => {
  const dir = structureSandbox(t);
  mkdirSync(join(dir, 'templates'), { recursive: true });
  mkdirSync(join(dir, 'requirements'), { recursive: true });
  writeFileSync(join(dir, 'templates', 'requirement.md'), '## Story\n\n## Verification\n');
  writeFileSync(
    join(dir, 'requirements', 'REQ-001-custom.md'),
    DOC('REQ-001', 'requirement', 'draft', '## Story\n\ns\n\n## Verification\n\nv\n'),
  );
  const load = await loadProject(dir);
  // Matches its own structure — the built-in "Acceptance criteria" stops applying.
  assert.deepEqual(checkStructure(dir, load.documents), []);
});

// --- Claim semantics (WO-099) ---

/** Minimal in-memory work order for the pure claim checks. */
function claimedWo(
  id: string,
  status: string,
  claim: { by?: string; at?: string },
  body = '## Summary\n\nWork.\n',
): VeriDocument {
  return {
    id,
    type: 'work-order',
    title: `T ${id}`,
    status,
    created: '2026-08-01',
    updated: '2026-08-01',
    links: [],
    ...(claim.by !== undefined ? { claimedBy: claim.by } : {}),
    ...(claim.at !== undefined ? { claimedAt: claim.at } : {}),
    frontmatter: {},
    body,
    file: `work-orders/${id}-t.md`,
    inlineRefs: [],
  };
}

test('shared claims: one identity holding two in-progress work orders advises; distinct identities are clean', () => {
  const clean = [claimedWo('WO-001', 'in-progress', { by: 'a', at: '2026-08-01' }), claimedWo('WO-002', 'in-progress', { by: 'b', at: '2026-08-01' })];
  assert.deepEqual(checkSharedClaims(clean), []);

  const shared = [
    claimedWo('WO-002', 'in-progress', { by: 'a', at: '2026-08-01' }),
    claimedWo('WO-001', 'in-progress', { by: 'a', at: '2026-08-01' }),
    // Done under the same identity is history, not a live claim.
    claimedWo('WO-003', 'done', { by: 'a', at: '2026-08-01' }),
  ];
  const advisories = checkSharedClaims(shared);
  assert.equal(advisories.length, 1);
  assert.partialDeepStrictEqual(advisories[0], {
    kind: 'shared-claim',
    id: 'WO-002',
    otherId: 'WO-001',
    claimedBy: 'a',
    file: 'work-orders/WO-002-t.md',
  });

  // A declared chain is exempt: a session that split out a prerequisite and
  // linked it holds both deliberately.
  const chainHead = claimedWo('WO-001', 'in-progress', { by: 'a', at: '2026-08-01' });
  const prerequisite = claimedWo('WO-002', 'in-progress', { by: 'a', at: '2026-08-01' }, '## Summary\n\nThe seam [[WO-001]] needs first.\n');
  prerequisite.inlineRefs.push('WO-001');
  assert.deepEqual(checkSharedClaims([chainHead, prerequisite]), []);
});

test('stale claims: silence past the window advises; a receipt inside it resets the clock', () => {
  const wo = claimedWo('WO-001', 'in-progress', { by: 'a', at: '2026-08-01' });

  // 13 days of silence with a 14-day window: too young to flag.
  assert.deepEqual(checkStaleClaims([wo], '2026-08-14', 14), []);
  // Day 14: stale.
  const stale = checkStaleClaims([wo], '2026-08-15', 14);
  assert.equal(stale.length, 1);
  assert.partialDeepStrictEqual(stale[0], { kind: 'stale-claim', id: 'WO-001', file: 'work-orders/WO-001-t.md' });
  assert.match(stale[0]!.message, /was claimed 2026-08-01/);

  // A receipt is activity: the newest receipt date anchors staleness.
  const withReceipt = claimedWo(
    'WO-001',
    'in-progress',
    { by: 'a', at: '2026-08-01' },
    '## Summary\n\nWork.\n\n## Receipts\n\n- 2026-08-10 — abc1234 — files — first session\n',
  );
  assert.deepEqual(checkStaleClaims([withReceipt], '2026-08-15', 14), []);
  const staleAgain = checkStaleClaims([withReceipt], '2026-08-24', 14);
  assert.equal(staleAgain.length, 1);
  assert.match(staleAgain[0]!.message, /last filed a receipt 2026-08-10/);

  // Only claimed in-progress work orders are eligible: ready, done, and
  // unclaimed (already a violation) never advise.
  assert.deepEqual(checkStaleClaims([claimedWo('WO-002', 'ready', {})], '2027-01-01', 14), []);
  assert.deepEqual(checkStaleClaims([claimedWo('WO-003', 'done', { by: 'a', at: '2026-01-01' })], '2027-01-01', 14), []);
  assert.deepEqual(checkStaleClaims([claimedWo('WO-004', 'in-progress', {})], '2027-01-01', 14), []);
});
