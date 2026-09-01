import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { VeriDocument } from './index.ts';
import { lookupIntent, renderIntent } from './intent.ts';

function doc(partial: Partial<VeriDocument> & { id: string; type: VeriDocument['type'] }): VeriDocument {
  return {
    title: partial.id,
    status: 'done',
    created: '2026-08-25',
    updated: '2026-08-25',
    links: [],
    frontmatter: {},
    body: '## Summary\n\nx\n',
    file: `${partial.type}s/${partial.id}.md`,
    inlineRefs: [],
    ...partial,
  } as VeriDocument;
}

const WORKFLOW = doc({
  id: 'WF-001',
  type: 'workflow',
  status: 'accepted',
  frontmatter: {
    modules: [
      { name: 'core', path: 'packages/core', purpose: 'Pure domain logic' },
      { name: 'cli', path: 'packages/cli', purpose: 'Terminal surface' },
    ],
  },
});

// A done work order whose receipt names the path — receipts are pointers
// into git (DEC-142) and no longer evidence for this lookup (WO-141).
const RECEIPT_WO = doc({
  id: 'WO-010',
  type: 'work-order',
  title: 'Build the intake',
  links: [
    { id: 'REQ-002', rel: 'implements' },
    { id: 'DEC-005', rel: 'constrained-by' },
  ],
  body: '## Summary\n\nx\n\n## Receipts\n\n- 2026-08-20 — abc1234 — packages/core/src/intake.ts, packages/cli/src/commands.ts — shipped\n',
});

const BINDING_WO = doc({
  id: 'WO-004',
  type: 'work-order',
  title: 'Own the core pipeline',
  status: 'in-progress',
  links: [{ id: 'REQ-002', rel: 'implements' }],
  binds: { paths: ['packages/core/src/**'], tests: [] },
});

const REQ = doc({ id: 'REQ-002', type: 'requirement', title: 'The requirement', status: 'accepted' });
const DEC = doc({ id: 'DEC-005', type: 'decision', title: 'The decision', status: 'active' });

const CORPUS = [WORKFLOW, RECEIPT_WO, BINDING_WO, REQ, DEC];

test('a bound path matches via its binding; a receipt naming the path no longer matches (WO-141)', () => {
  const lookup = lookupIntent(CORPUS, 'packages/core/src/intake.ts');
  assert.deepEqual(
    lookup.matches.map((m) => [m.id, m.via]),
    [['WO-004', 'binding']],
  );
  assert.equal(lookup.matches[0].evidence, 'packages/core/src/**');
});

test('governing documents are the matched work orders frontmatter links, requirements before decisions', () => {
  const lookup = lookupIntent(CORPUS, 'packages/core/src/intake.ts');
  assert.deepEqual(
    lookup.governing.map((g) => g.id),
    ['REQ-002'],
  );
  const req = lookup.governing[0];
  assert.equal(req.title, 'The requirement');
  assert.deepEqual(
    req.citedBy.map((c) => c.workOrder),
    ['WO-004'],
  );
});

test('a directory query surfaces work orders bound to globs inside it', () => {
  const lookup = lookupIntent(CORPUS, 'packages/core');
  assert.deepEqual(
    lookup.matches.map((m) => m.id),
    ['WO-004'],
  );
  assert.equal(lookup.module?.name, 'core');
});

test('a path covered only by the module registry says so and names the module', () => {
  const lookup = lookupIntent(CORPUS, 'packages/cli/src/git.ts');
  assert.equal(lookup.matches.length, 0);
  assert.equal(lookup.module?.name, 'cli');
  assert.match(renderIntent(lookup), /no document-level matches/);
  assert.match(renderIntent(lookup), /cli · packages\/cli/);
});

test('a path nothing records renders the nothing-recorded statement', () => {
  const lookup = lookupIntent(CORPUS, 'docs/README.md');
  assert.equal(lookup.matches.length, 0);
  assert.equal(lookup.module, undefined);
  assert.match(renderIntent(lookup), /nothing recorded touches docs\/README\.md/);
});

test('newer work orders come first', () => {
  const older = doc({
    id: 'WO-002',
    type: 'work-order',
    status: 'ready',
    binds: { paths: ['packages/core/src/intake.ts'], tests: [] },
  });
  const lookup = lookupIntent([older, BINDING_WO], 'packages/core/src/intake.ts');
  assert.deepEqual(
    lookup.matches.map((m) => m.id),
    ['WO-004', 'WO-002'],
  );
});

test('the render is grounded-facts labeled and lists matches with evidence', () => {
  const text = renderIntent(lookupIntent(CORPUS, 'packages/core/src/intake.ts'));
  assert.match(text, /not a code index/);
  assert.match(text, /WO-004\s+in-progress\s+via binding \(packages\/core\/src\/\*\*\)/);
  assert.match(text, /REQ-002\s+accepted\s+The requirement — via/);
});

test('a done work order matches nothing — its binding no longer counts, and git holds its record', () => {
  const finished = doc({
    id: 'WO-020',
    type: 'work-order',
    status: 'done',
    binds: { paths: ['packages/core/src/**'], tests: [] },
    body: '## Receipts\n\n- 2026-08-20 — abc1234 — shipped\n',
  });
  const lookup = lookupIntent([finished], 'packages/core/src/intake.ts');
  assert.deepEqual(lookup.matches, []);
});

test('normalization strips ./ prefixes and trailing slashes', () => {
  const lookup = lookupIntent(CORPUS, './packages/core/');
  assert.equal(lookup.path, 'packages/core');
  assert.equal(lookup.module?.name, 'core');
  assert.ok(lookup.matches.some((m) => m.id === 'WO-004'));
});
