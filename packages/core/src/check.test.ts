import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProject } from './load.ts';
import {
  bindsClaimGatedPath,
  checkDesignGateDiff,
  checkDesignGateMentions,
  checkIntuitionOnly,
  checkProductFiles,
  checkProject,
  checkSharedClaims,
  checkStaleClaims,
  checkStaleFocus,
  checkStampedBacklog,
  checkStructure,
  expectedSections,
  missingSections,
} from './check.ts';
import type { GitFacts } from './provenance.ts';
import { sourceKind } from './pending.ts';
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
    // REQ-032 (WO-114): a hypothesis with no declared outcome is an
    // untestable bet — flagged; constraints (and the kind-less default)
    // never are.
    dir: 'hypothesis-no-outcome',
    expected: [
      { kind: 'hypothesis-without-outcome', id: 'REQ-001', file: 'requirements/REQ-001-untestable-bet.md' },
    ],
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

test('a hypothesis with an outcome and a kind-less constraint both pass the outcome rule (REQ-032)', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-hypothesis-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'requirements'), { recursive: true });
  writeFileSync(
    join(dir, 'requirements', 'REQ-001-bet.md'),
    '---\nid: REQ-001\ntype: requirement\ntitle: A settled bet\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\nkind: hypothesis\noutcome:\n  metric: activation-rate\n  target: "> 40%"\n---\nBody.\n\n## Acceptance criteria\n\n- [ ] x\n',
  );
  writeFileSync(
    join(dir, 'requirements', 'REQ-002-constraint.md'),
    '---\nid: REQ-002\ntype: requirement\ntitle: No kind declared\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\nBody.\n\n## Acceptance criteria\n\n- [ ] x\n',
  );
  assert.deepEqual(checkProject(await loadProject(dir)).issues, []);
});

// --- Outcome links and the untested bet (REQ-033, WO-115) ---

const OUTCOME_FILES = {
  workflow: '---\nid: WF-001\ntype: workflow\ntitle: W\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\nRules.\n',
  hypothesis: (links = ''): string =>
    `---\nid: REQ-001\ntype: requirement\ntitle: The bet\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\nkind: hypothesis\noutcome:\n  metric: activation-rate\n  target: "> 40%"\n${links}---\nBody.\n\n## Acceptance criteria\n\n- [x] x\n\n## Receipts\n\n- none\n`,
  wo: (status: string): string =>
    `---\nid: WO-001\ntype: work-order\ntitle: Ship it\nstatus: ${status}\n${status === 'ready' || status === 'done' ? 'approved: 2026-08-01\n' : ''}${
      status === 'in-progress' ? 'claimed_by: s\nclaimed_at: 2026-08-01\n' : ''
    }created: 2026-08-01\nupdated: 2026-08-01\nlinks:\n  - id: REQ-001\n    rel: implements\n---\n## Summary\n\nx.\n\n## Acceptance tests\n\n- [x] x\n\n## Receipts\n\n- 2026-08-01 abc123 shipped\n`,
  outcomeSrc: (rel: string): string =>
    `---\nid: SRC-001\ntype: source\ntitle: What reality said\nstatus: imported\ncreated: 2026-08-02\nupdated: 2026-08-02\nlinks:\n  - id: REQ-001\n    rel: ${rel}\n  - id: WO-001\n    rel: outcome-of\n---\nActivation moved.\n`,
};

function writeOutcomeProject(dir: string, files: Record<string, string>): void {
  for (const sub of ['requirements', 'work-orders', 'sources', 'decisions']) mkdirSync(join(dir, sub), { recursive: true });
  writeFileSync(join(dir, 'workflow.md'), OUTCOME_FILES.workflow);
  for (const [file, text] of Object.entries(files)) writeFileSync(join(dir, file), text);
}

test('a SRC may link a REQ with tests/supports/refutes and the shipping WO with outcome-of (REQ-033)', async (t) => {
  for (const rel of ['tests', 'supports', 'refutes']) {
    const dir = mkdtempSync(join(tmpdir(), 'veri-outcome-ok-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    writeOutcomeProject(dir, {
      'requirements/REQ-001-bet.md': OUTCOME_FILES.hypothesis(),
      'work-orders/WO-001-ship.md': OUTCOME_FILES.wo('done'),
      'sources/SRC-001-outcome.md': OUTCOME_FILES.outcomeSrc(rel),
    });
    const { issues, advisories } = checkProject(await loadProject(dir));
    assert.deepEqual(issues, [], `rel ${rel} must validate cleanly`);
    assert.deepEqual(advisories.filter((advisory) => advisory.kind === 'untested-bet'), []);
  }
});

test('an outcome rel from a non-source, or at the wrong target type, is an invalid-outcome-link issue', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-outcome-bad-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeOutcomeProject(dir, {
    'requirements/REQ-001-bet.md': OUTCOME_FILES.hypothesis('links:\n  - id: SRC-001\n    rel: tests\n'),
    // supports at a work order, outcome-of at a requirement: both misdirected.
    'sources/SRC-001-outcome.md':
      '---\nid: SRC-001\ntype: source\ntitle: S\nstatus: imported\ncreated: 2026-08-02\nupdated: 2026-08-02\nlinks:\n  - id: WO-001\n    rel: supports\n  - id: REQ-001\n    rel: outcome-of\n---\nBody.\n',
    'work-orders/WO-001-ship.md': OUTCOME_FILES.wo('done'),
    // Free text survives: a WO "supporting" a requirement is the ordinary
    // English rel the bundled demo uses — never an outcome-link issue.
    'work-orders/WO-002-free-text.md':
      '---\nid: WO-002\ntype: work-order\ntitle: Free text\nstatus: backlog\ncreated: 2026-08-01\nupdated: 2026-08-01\nlinks:\n  - id: REQ-001\n    rel: supports\n---\n## Summary\n\nx.\n',
  });
  const issues = checkProject(await loadProject(dir)).issues;
  assert.partialDeepStrictEqual(
    issues.filter((issue) => issue.kind === 'invalid-outcome-link'),
    [
      { id: 'REQ-001', targetId: 'SRC-001', rel: 'tests' },
      { id: 'SRC-001', targetId: 'WO-001', rel: 'supports' },
      { id: 'SRC-001', targetId: 'REQ-001', rel: 'outcome-of' },
    ],
  );
});

test('a hypothesis whose WOs are all done with no outcome source is an untested bet — advisory, never an issue', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-untested-bet-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeOutcomeProject(dir, {
    'requirements/REQ-001-bet.md': OUTCOME_FILES.hypothesis(),
    'work-orders/WO-001-ship.md': OUTCOME_FILES.wo('done'),
  });
  const { issues, advisories } = checkProject(await loadProject(dir));
  assert.deepEqual(issues, [], 'the untested bet must never appear in the issues array');
  assert.partialDeepStrictEqual(
    advisories.filter((advisory) => advisory.kind === 'untested-bet'),
    [{ id: 'REQ-001', file: 'requirements/REQ-001-bet.md', workOrderIds: ['WO-001'] }],
  );
});

test('the untested-bet advisory stays silent for constraints, open WOs, unshipped bets, and tested bets', async (t) => {
  const silent = async (files: Record<string, string>, label: string): Promise<void> => {
    const dir = mkdtempSync(join(tmpdir(), 'veri-tested-bet-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    writeOutcomeProject(dir, files);
    const advisories = checkProject(await loadProject(dir)).advisories;
    assert.deepEqual(advisories.filter((advisory) => advisory.kind === 'untested-bet'), [], label);
  };

  // A constraint (kind-less default) with done WOs is verified by acceptance
  // criteria, not outcomes — never an untested bet.
  await silent(
    {
      'requirements/REQ-001-bet.md':
        '---\nid: REQ-001\ntype: requirement\ntitle: C\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\nBody.\n\n## Acceptance criteria\n\n- [x] x\n',
      'work-orders/WO-001-ship.md': OUTCOME_FILES.wo('done'),
    },
    'constraint',
  );
  // An open work order: the bet is still shipping.
  await silent(
    {
      'requirements/REQ-001-bet.md': OUTCOME_FILES.hypothesis(),
      'work-orders/WO-001-ship.md': OUTCOME_FILES.wo('in-progress'),
    },
    'open WO',
  );
  // No linked work order at all: nothing has shipped to observe.
  await silent({ 'requirements/REQ-001-bet.md': OUTCOME_FILES.hypothesis() }, 'no WOs');
  // An outcome source linked: the loop is closed, whatever the verdict.
  await silent(
    {
      'requirements/REQ-001-bet.md': OUTCOME_FILES.hypothesis(),
      'work-orders/WO-001-ship.md': OUTCOME_FILES.wo('done'),
      'sources/SRC-001-outcome.md': OUTCOME_FILES.outcomeSrc('refutes'),
    },
    'tested',
  );
});

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

// Shared fixture for the declaration/mention/diff tiers (WO-113, DEC-114).
function writeDesignGateFixture(dir: string, withGatePaths = true): void {
  for (const sub of ['requirements', 'work-orders', 'sources']) mkdirSync(join(dir, sub), { recursive: true });
  writeFileSync(
    join(dir, 'workflow.md'),
    `---\nid: WF-001\ntype: workflow\ntitle: W\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\n${
      withGatePaths ? 'design_gate_paths:\n  - packages/ui\n' : ''
    }---\nRules.\n`,
  );
  writeFileSync(
    join(dir, 'requirements', 'REQ-001-ui.md'),
    '---\nid: REQ-001\ntype: requirement\ntitle: T\nstatus: accepted\ncreated: 2026-08-01\nupdated: 2026-08-01\napproved: 2026-08-01\n---\n## Acceptance criteria\n\n- [ ] x\n',
  );
  writeFileSync(
    join(dir, 'sources', 'SRC-001-design.md'),
    '---\nid: SRC-001\ntype: source\ntitle: Design handoff\nstatus: imported\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\nThe design.\n',
  );
}

const IMPLEMENTS = '  - id: REQ-001\n    rel: implements\n';
const DESIGNED = `${IMPLEMENTS}  - id: SRC-001\n    rel: designed-by\n`;
const BROKEN_DESIGN = `${IMPLEMENTS}  - id: SRC-999\n    rel: designed-by\n`;

function designWo(body: string, options: { links?: string; binds?: string[]; status?: string } = {}): string {
  const status = options.status ?? 'in-progress';
  const binds =
    options.binds === undefined ? '' : `binds:\n  paths:\n${options.binds.map((p) => `    - ${p}\n`).join('')}`;
  return `---\nid: WO-001\ntype: work-order\ntitle: T\nstatus: ${status}\n${
    status === 'in-progress' ? 'claimed_by: session-a\nclaimed_at: 2026-08-01\n' : ''
  }created: 2026-08-01\nupdated: 2026-08-01\nlinks:\n${options.links ?? IMPLEMENTS}${binds}---\n${body}`;
}

test('the design gate reads declarations: gated binds without a design fail; prose alone never does (WO-113)', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-design-gate-binds-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeDesignGateFixture(dir);
  const woPath = join(dir, 'work-orders', 'WO-001-ui.md');
  const gated = async (): Promise<string[]> =>
    checkProject(await loadProject(dir)).issues.filter((issue) => issue.kind === 'ui-wo-without-design').map((issue) => issue.message);

  // A declared gated bind with no designed-by link fails, and the message
  // names the declaration as its evidence.
  writeFileSync(woPath, designWo('## Summary\n\nRework the app panel.\n', { binds: ['packages/ui/src/**'] }));
  const messages = await gated();
  assert.equal(messages.length, 1);
  assert.ok(messages[0]!.includes('binds.paths'), messages[0]);

  // A glob that covers the gated directory claims it too.
  writeFileSync(woPath, designWo('## Summary\n\nEverything.\n', { binds: ['packages/**'] }));
  assert.equal((await gated()).length, 1);

  // A resolvable designed-by link satisfies the gate; a broken one does not.
  writeFileSync(woPath, designWo('## Summary\n\nRework the app panel.\n', { binds: ['packages/ui/src/**'], links: DESIGNED }));
  assert.deepEqual(await gated(), []);
  writeFileSync(woPath, designWo('## Summary\n\nRework the app panel.\n', { binds: ['packages/ui/src/**'], links: BROKEN_DESIGN }));
  assert.equal((await gated()).length, 1);

  // Prose naming a gated path it never declares is not issue evidence — the
  // WO-112 false positive (receipts, rationale, comparisons) is gone for good.
  writeFileSync(woPath, designWo('## Summary\n\nTouches packages/ui.\n\n## In scope\n\n- packages/ui work\n'));
  assert.deepEqual(await gated(), []);

  // Non-gated binds pass, prose mentions or not.
  writeFileSync(woPath, designWo('## Summary\n\nCompare with packages/ui.\n', { binds: ['packages/core/src/**'] }));
  assert.deepEqual(await gated(), []);

  // Backlog is exempt: the gate fires on promotion, as before.
  writeFileSync(woPath, designWo('## Summary\n\nApp work.\n', { binds: ['packages/ui/src/**'], status: 'backlog' }));
  assert.deepEqual(await gated(), []);
});

test('the mention heuristic is an advisory: undeclared prose claims nudge, declarations and designs silence it (WO-113)', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-design-gate-mention-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeDesignGateFixture(dir);
  const woPath = join(dir, 'work-orders', 'WO-001-ui.md');
  const mentions = async (): Promise<string[]> =>
    checkDesignGateMentions((await loadProject(dir)).documents).map((advisory) => advisory.message);

  // No binds declared, prose names the gated path: an advisory, naming its
  // evidence — never an issue.
  writeFileSync(woPath, designWo('## Summary\n\nx\n\n## In scope\n\n- packages/ui work\n'));
  const nudges = await mentions();
  assert.equal(nudges.length, 1);
  assert.ok(nudges[0]!.includes('body text'), nudges[0]);
  assert.deepEqual(checkProject(await loadProject(dir)).issues, []);

  // `## Out of scope` stays excluded (WO-112), and `## Receipts` joins it —
  // receipts record history, which the diff tier reads directly.
  writeFileSync(woPath, designWo('## Summary\n\nCore only.\n\n## Out of scope\n\n- Any change to packages/ui.\n'));
  assert.deepEqual(await mentions(), []);
  writeFileSync(woPath, designWo('## Summary\n\nCore only.\n\n## Receipts\n\n- 2026-08-01 — abc1234 — packages/ui/x.ts — done\n'));
  assert.deepEqual(await mentions(), []);

  // A work order that declares binds has spoken — its prose is no longer
  // evidence, whichever paths it declares.
  writeFileSync(woPath, designWo('## Summary\n\nCompare with packages/ui.\n', { binds: ['packages/core/src/**'] }));
  assert.deepEqual(await mentions(), []);

  // A designed-by link silences the nudge too.
  writeFileSync(woPath, designWo('## In scope\n\n- packages/ui work\n', { links: DESIGNED }));
  assert.deepEqual(await mentions(), []);

  // With no design_gate_paths declared, every tier is inert.
  writeDesignGateFixture(dir, false);
  writeFileSync(woPath, designWo('## In scope\n\n- packages/ui work\n', { binds: ['packages/ui/src/**'] }));
  const load = await loadProject(dir);
  assert.deepEqual(checkProject(load).issues, []);
  assert.deepEqual(checkDesignGateMentions(load.documents), []);
  assert.deepEqual(checkDesignGateDiff(load.documents, { commits: [] }), []);
});

test('the diff tier catches gated work that declared nothing (WO-113)', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-design-gate-diff-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeDesignGateFixture(dir);
  const woPath = join(dir, 'work-orders', 'WO-001-ui.md');
  const facts: GitFacts = {
    commits: [
      {
        sha: 'aaaa111122223333444455556666777788889999',
        date: '2026-08-02',
        subject: 'WO-001: build the panel',
        files: ['packages/ui/src/panel.ts', 'veri/work-orders/WO-001-ui.md'],
      },
      {
        sha: 'bbbb111122223333444455556666777788889999',
        date: '2026-08-02',
        subject: 'unrelated tinkering',
        files: ['packages/ui/src/other.ts'],
      },
    ],
  };
  const diff = async (gitFacts: GitFacts = facts): Promise<string[]> =>
    checkDesignGateDiff((await loadProject(dir)).documents, gitFacts).map((advisory) => advisory.message);

  // The false negative, caught: an in-progress work order whose claimed
  // commit touched the gated path without declaring it. The message names
  // the commit, the file, and the diff as evidence.
  writeFileSync(woPath, designWo('## Summary\n\nQuiet app work, never spelled out.\n'));
  const found = await diff();
  assert.equal(found.length, 1);
  assert.ok(found[0]!.includes('aaaa111') && found[0]!.includes('packages/ui/src/panel.ts'), found[0]);
  assert.ok(found[0]!.includes('commit diff'), found[0]);

  // An unclaimed commit (no WO-nnn: subject) is not this work order's touch.
  writeFileSync(woPath, designWo('## Summary\n\nQuiet.\n'));
  assert.deepEqual(await diff({ commits: [facts.commits[1]!] }), []);

  // A covering declaration hands the case to the issue tier; a designed-by
  // link satisfies the gate outright. Neither double-charges here.
  writeFileSync(woPath, designWo('## Summary\n\nQuiet.\n', { binds: ['packages/ui/**'] }));
  assert.deepEqual(await diff(), []);
  writeFileSync(woPath, designWo('## Summary\n\nQuiet.\n', { links: DESIGNED }));
  assert.deepEqual(await diff(), []);

  // Closed work orders are never audited retroactively (WO-113 out of scope).
  writeFileSync(woPath, designWo('## Summary\n\nQuiet.\n## Receipts\n\n- x\n', { status: 'done' }));
  assert.deepEqual(await diff(), []);
});

test('bindsClaimGatedPath: names, globs, and directory prefixes', () => {
  assert.ok(bindsClaimGatedPath(['packages/ui'], 'packages/ui'));
  assert.ok(bindsClaimGatedPath(['packages/ui/src/**'], 'packages/ui'));
  assert.ok(bindsClaimGatedPath(['packages/**'], 'packages/ui'));
  assert.ok(!bindsClaimGatedPath(['packages/core/src/**'], 'packages/ui'));
  assert.ok(!bindsClaimGatedPath([], 'packages/ui'));
  assert.ok(!bindsClaimGatedPath(['packages/ui'], ''));
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

// --- The demotion hole (WO-111) ---

test('stamped backlog: a backlog work order carrying approved: is a violation naming veri approve', () => {
  // The WO-104 shape: demoted ready → backlog with the stamp left behind.
  const demoted = claimedWo('WO-104', 'backlog', {});
  demoted.approved = '2026-08-25';
  const issues = checkStampedBacklog([demoted]);
  assert.equal(issues.length, 1);
  assert.partialDeepStrictEqual(issues[0], {
    kind: 'stamped-backlog',
    id: 'WO-104',
    file: 'work-orders/WO-104-t.md',
  });
  assert.match(issues[0]!.message, /veri approve WO-104/);

});

test('stamped backlog: checkProject reports it despite the backlog skips, and re-approval clears it', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-stamped-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'work-orders'), { recursive: true });
  const wo = (status: string, stamp: string): string =>
    `---\nid: WO-001\ntype: work-order\ntitle: T\nstatus: ${status}\n${stamp}created: 2026-08-01\nupdated: 2026-08-01\nlinks:\n  - id: WO-001\n    rel: relates-to\n---\n## Summary\n\nWork.\n`;
  const woPath = join(dir, 'work-orders', 'WO-001-t.md');

  // The demoted state: backlog with the stamp stranded.
  writeFileSync(woPath, wo('backlog', 'approved: 2026-08-25\n'));
  const before = checkProject(await loadProject(dir)).issues;
  assert.equal(before.length, 1);
  assert.equal(before[0]!.kind, 'stamped-backlog');

  // The remedy the message names — veri approve re-stamps to ready. (A REQ
  // link would be required by the prospective gate; here we only assert the
  // resulting state is clean.)
  writeFileSync(woPath, wo('ready', 'approved: 2026-08-26\n'));
  const after = checkProject(await loadProject(dir)).issues;
  assert.ok(!after.some((issue) => issue.kind === 'stamped-backlog'));
});

test('stamped backlog: fires on the contradiction only', () => {
  // An unstamped backlog work order is ordinary planning.
  assert.deepEqual(checkStampedBacklog([claimedWo('WO-001', 'backlog', {})]), []);
  // A stamped ready work order is the legitimate promoted state (DEC-096).
  const ready = claimedWo('WO-002', 'ready', {});
  ready.approved = '2026-08-25';
  assert.deepEqual(checkStampedBacklog([ready]), []);
  // Past ready, the stamp is spent clearance — valid history, never flagged.
  const done = claimedWo('WO-003', 'done', {});
  done.approved = '2026-08-25';
  assert.deepEqual(checkStampedBacklog([done]), []);
  // Withdrawn keeps its history out of play (DEC-110).
  const withdrawn = claimedWo('WO-004', 'withdrawn', {});
  withdrawn.approved = '2026-08-25';
  assert.deepEqual(checkStampedBacklog([withdrawn]), []);
  // Other types with stamps are the normal promoted world.
  assert.deepEqual(
    checkStampedBacklog([
      { ...claimedWo('WO-005', 'backlog', {}), type: 'requirement', id: 'REQ-005', status: 'accepted', approved: '2026-08-01' },
    ]),
    [],
  );
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

// --- The product layer (REQ-037, WO-121) ---

/** Minimal in-memory document for the pure product-layer checks. */
function productDoc(id: string, file: string, status = 'accepted', overrides: Partial<VeriDocument> = {}): VeriDocument {
  return {
    id,
    type: 'product',
    title: `P ${id}`,
    status,
    created: '2026-08-01',
    updated: '2026-08-01',
    links: [],
    frontmatter: {},
    body: 'The model.\n',
    file,
    inlineRefs: [],
    ...overrides,
  };
}

test('product files: the four sanctioned singletons are clean; a fifth path and a foreign type are violations', () => {
  const sanctioned = [
    productDoc('PRD-001', 'product/vision.md'),
    productDoc('PRD-002', 'product/users.md'),
    productDoc('PRD-003', 'product/principles.md'),
    productDoc('PRD-004', 'product/current-focus.md'),
  ];
  assert.deepEqual(checkProductFiles(sanctioned), []);

  // A product document outside the sanctioned set — there is no fifth singleton.
  const stray = checkProductFiles([productDoc('PRD-005', 'product/current-bets.md')]);
  assert.equal(stray.length, 1);
  assert.partialDeepStrictEqual(stray[0], { kind: 'product-file', id: 'PRD-005', file: 'product/current-bets.md' });

  // A non-product document parked inside product/ smuggles ungated content in.
  const foreign = claimedWo('WO-001', 'backlog', {});
  foreign.file = 'product/WO-001-t.md';
  const smuggled = checkProductFiles([foreign]);
  assert.equal(smuggled.length, 1);
  assert.partialDeepStrictEqual(smuggled[0], { kind: 'product-file', id: 'WO-001', file: 'product/WO-001-t.md' });

  // The same work order in its own directory is nobody's business here.
  assert.deepEqual(checkProductFiles([claimedWo('WO-002', 'backlog', {})]), []);
});

test('stale focus: silence past the window advises; a fresh or draft focus never does', () => {
  const focus = productDoc('PRD-004', 'product/current-focus.md', 'accepted', { updated: '2026-08-01' });
  assert.deepEqual(checkStaleFocus([focus], '2026-08-14', 14), []);

  const stale = checkStaleFocus([focus], '2026-08-15', 14);
  assert.equal(stale.length, 1);
  assert.partialDeepStrictEqual(stale[0], { kind: 'stale-focus', id: 'PRD-004', file: 'product/current-focus.md' });
  assert.match(stale[0]!.message, /2026-08-01/);

  // A draft focus already sits in the approval queue — no advisory on top.
  const draft = productDoc('PRD-004', 'product/current-focus.md', 'draft', { updated: '2026-08-01' });
  assert.deepEqual(checkStaleFocus([draft], '2027-01-01', 14), []);

  // The other singletons never trip the focus rule.
  const vision = productDoc('PRD-001', 'product/vision.md', 'accepted', { updated: '2026-01-01' });
  assert.deepEqual(checkStaleFocus([vision], '2027-01-01', 14), []);
});

test('stale focus: a focus referencing only finished work orders advises even inside the window', () => {
  const doneWo = claimedWo('WO-010', 'done', { by: 'a', at: '2026-08-01' });
  const openWo = claimedWo('WO-011', 'in-progress', { by: 'a', at: '2026-08-01' });
  const focus = productDoc('PRD-004', 'product/current-focus.md', 'accepted', {
    updated: '2026-08-10',
    inlineRefs: ['WO-010'],
  });

  const shipped = checkStaleFocus([focus, doneWo], '2026-08-12', 14);
  assert.equal(shipped.length, 1);
  assert.match(shipped[0]!.message, /WO-010/);

  // One live referenced work order keeps the focus current.
  const stillLive = productDoc('PRD-004', 'product/current-focus.md', 'accepted', {
    updated: '2026-08-10',
    inlineRefs: ['WO-010', 'WO-011'],
  });
  assert.deepEqual(checkStaleFocus([stillLive, doneWo, openWo], '2026-08-12', 14), []);

  // A focus that references no work orders is judged by its date alone.
  const noRefs = productDoc('PRD-004', 'product/current-focus.md', 'accepted', { updated: '2026-08-10' });
  assert.deepEqual(checkStaleFocus([noRefs, doneWo], '2026-08-12', 14), []);
});

test('a freeform file under product/ fails the load; sanctioned singletons pass checkProject', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-product-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'product'), { recursive: true });
  writeFileSync(
    join(dir, 'product', 'vision.md'),
    '---\nid: PRD-001\ntype: product\ntitle: Vision\nstatus: draft\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\nThe vision.\n',
  );
  writeFileSync(join(dir, 'product', 'notes.md'), 'Some ungated notes.\n');

  const load = await loadProject(dir);
  const issues = checkProject(load).issues;
  assert.equal(issues.length, 1);
  assert.partialDeepStrictEqual(issues[0], { kind: 'invalid-frontmatter', file: 'product/notes.md' });
});

// --- Source kinds and the intuition-only bet (REQ-038, WO-122) ---

test('source kinds: a declared kind parses, an unknown kind is an invalid-frontmatter issue, absent means reference', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-srckind-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'sources'), { recursive: true });
  const src = (id: string, kindLine: string): string =>
    `---\nid: ${id}\ntype: source\ntitle: S ${id}\nstatus: imported\n${kindLine}created: 2026-08-01\nupdated: 2026-08-01\n---\nEvidence.\n`;
  writeFileSync(join(dir, 'sources', 'SRC-001-declared.md'), src('SRC-001', 'kind: user-feedback\n'));
  writeFileSync(join(dir, 'sources', 'SRC-002-bare.md'), src('SRC-002', ''));
  writeFileSync(join(dir, 'sources', 'SRC-003-bad.md'), src('SRC-003', 'kind: vibes\n'));

  const load = await loadProject(dir);
  const issues = checkProject(load).issues;
  assert.equal(issues.length, 1, JSON.stringify(issues));
  assert.partialDeepStrictEqual(issues[0], { kind: 'invalid-frontmatter', file: 'sources/SRC-003-bad.md', field: 'kind' });

  const declared = load.documents.find((doc) => doc.id === 'SRC-001')!;
  const bare = load.documents.find((doc) => doc.id === 'SRC-002')!;
  assert.equal(declared.kind, 'user-feedback');
  assert.equal(sourceKind(declared), 'user-feedback');
  assert.equal(bare.kind, undefined);
  assert.equal(sourceKind(bare), 'reference');
});

/** Minimal in-memory requirement for the pure intuition-only checks. */
function reqDoc(id: string, status: string, links: Array<{ id: string; rel: string }> = []): VeriDocument {
  return {
    id,
    type: 'requirement',
    title: `R ${id}`,
    status,
    created: '2026-08-01',
    updated: '2026-08-01',
    links,
    frontmatter: {},
    body: 'Must hold.\n',
    file: `requirements/${id}-r.md`,
    inlineRefs: [],
  };
}

function srcDoc(id: string, links: Array<{ id: string; rel: string }> = []): VeriDocument {
  return {
    id,
    type: 'source',
    title: `S ${id}`,
    status: 'imported',
    created: '2026-08-01',
    updated: '2026-08-01',
    links,
    frontmatter: {},
    body: 'Evidence.\n',
    file: `sources/${id}-s.md`,
    inlineRefs: [],
  };
}

test('intuition-only: an accepted requirement with no evidence advises; derived-from or outcome evidence clears it', () => {
  const evidence = srcDoc('SRC-001');

  // Accepted with no evidence link — the bet is visible.
  const bare = reqDoc('REQ-001', 'accepted');
  const flagged = checkIntuitionOnly([bare, evidence]);
  assert.equal(flagged.length, 1);
  assert.partialDeepStrictEqual(flagged[0], { kind: 'intuition-only', id: 'REQ-001', file: 'requirements/REQ-001-r.md' });

  // A derived-from link to a real source clears it.
  const derived = reqDoc('REQ-001', 'accepted', [{ id: 'SRC-001', rel: 'derived-from' }]);
  assert.deepEqual(checkIntuitionOnly([derived, evidence]), []);

  // derived-from at a non-source (a DEC) is not evidence.
  const fromDec = reqDoc('REQ-001', 'accepted', [{ id: 'DEC-001', rel: 'derived-from' }]);
  assert.equal(checkIntuitionOnly([fromDec, evidence]).length, 1);

  // Inbound outcome evidence (REQ-033) also clears it: a tested bet is not
  // an intuition-only one.
  const reported = srcDoc('SRC-002', [{ id: 'REQ-001', rel: 'supports' }]);
  assert.deepEqual(checkIntuitionOnly([bare, reported]), []);

  // Drafts are proposals, not bets; retired and withdrawn have left play.
  assert.deepEqual(checkIntuitionOnly([reqDoc('REQ-002', 'draft')]), []);
  assert.deepEqual(checkIntuitionOnly([reqDoc('REQ-003', 'retired')]), []);
  assert.deepEqual(checkIntuitionOnly([reqDoc('REQ-004', 'withdrawn')]), []);
});
