import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProject } from './load.ts';
import { checkProject } from './check.ts';

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
];

for (const { dir, expected } of CASES) {
  test(`broken fixture "${dir}" yields exactly its expected issue`, async () => {
    const load = await loadProject(new URL(`../fixtures/broken/${dir}`, import.meta.url));
    const issues = checkProject(load);
    assert.equal(issues.length, expected.length, JSON.stringify(issues, null, 2));
    assert.partialDeepStrictEqual(issues, expected);
    for (const issue of issues) {
      assert.equal(typeof issue.message, 'string');
      assert.ok(issue.message.length > 0);
    }
  });
}
