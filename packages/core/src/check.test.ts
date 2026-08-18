import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProject } from './load.ts';
import { checkProject, checkStructure, expectedSections, missingSections } from './check.ts';

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
    `---\nid: WO-001\ntype: work-order\ntitle: T\nstatus: ${status}\ncreated: 2026-08-01\nupdated: 2026-08-01\nlinks:\n${links}---\n## Summary\n\nTouches packages/ui.\n`;

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
