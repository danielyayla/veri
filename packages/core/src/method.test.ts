import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { approveDocument } from './approve.ts';
import { checkMethodFiles, checkProject } from './check.ts';
import { assembleContext, estimateTokens } from './context.ts';
import { METHOD_DESCRIPTION_PLACEHOLDER, createDocument } from './create.ts';
import { CURRENT_FORMAT, classifyFormat, formatStatement, migrateProject, writeFormatMarker } from './format.ts';
import { DOC_TYPES, typeOfId } from './ids.ts';
import { loadProject } from './load.ts';
import { parseDocument } from './parse.ts';
import { METHODS_DIR, isPending } from './pending.ts';
import { ASSEMBLY_POLICY, INLINE_THRESHOLD_TOKENS, packingFor } from './schema.ts';
import { bumpUpdated } from './save.ts';
import { BODY_TEMPLATES } from './templates.ts';
import type { VeriDocument } from './types.ts';

/**
 * The seventh document type (REQ-040, DEC-130, WO-131). These cover the
 * acceptance tests of WO-131 one for one: parse and round-trip, the two
 * required frontmatter fields, the id-prefix superRefine, the promotion,
 * the assembly menu and its token cost, the placement rule, and the format
 * bump.
 */

function tmpVeri(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), 'veri-method-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const veriDir = join(root, 'veri');
  mkdirSync(join(veriDir, METHODS_DIR), { recursive: true });
  mkdirSync(join(veriDir, 'work-orders'), { recursive: true });
  mkdirSync(join(veriDir, 'requirements'), { recursive: true });
  writeFormatMarker(veriDir);
  return root;
}

function methodFile(
  id: string,
  status: string,
  { description = 'Route "I have an idea" and other unshaped intent to the gate that fits.', extra = '' } = {},
): string {
  return [
    '---',
    `id: ${id}`,
    'type: method',
    `title: "The ${id} gate"`,
    `status: ${status}`,
    `description: ${JSON.stringify(description)}`,
    'requires:',
    '  - file_requirement',
    '  - get_context',
    ...(extra === '' ? [] : [extra]),
    'created: 2026-08-01',
    'updated: 2026-08-01',
    '---',
    '',
    '## Purpose',
    '',
    'METHOD-BODY-MARKER',
    '',
  ].join('\n');
}

// --- Parse, schema, round-trip -------------------------------------------

test('a method under veri/methods/ parses with its machine-read fields, checks clean, and round-trips byte-identically', async (t) => {
  const root = tmpVeri(t);
  const veriDir = join(root, 'veri');
  const text = methodFile('MET-001', 'accepted', { extra: 'upstream: veri/wayfinder' });
  writeFileSync(join(veriDir, METHODS_DIR, 'MET-001-wayfinder.md'), text);

  const load = await loadProject(veriDir);
  const doc = load.documents.find((candidate) => candidate.id === 'MET-001')!;
  assert.equal(doc.type, 'method');
  assert.equal(doc.description, 'Route "I have an idea" and other unshaped intent to the gate that fits.');
  assert.deepEqual(doc.requires, ['file_requirement', 'get_context']);
  assert.equal(doc.upstream, 'veri/wayfinder');
  assert.deepEqual(checkProject(load).issues, []);

  // Byte-identical round-trip: the parsed body is exactly the text after the
  // fence, and the one rewrite the write path performs (`updated:`) is a
  // no-op when the date has not changed.
  const fenceEnd = text.indexOf('\n---\n', 3) + '\n---\n'.length;
  assert.equal(doc.body, text.slice(fenceEnd));
  assert.equal(bumpUpdated(text, doc.updated), text);
});

test('description and requires are required: absent, empty, or malformed is an invalid-frontmatter issue', () => {
  const base = [
    'id: MET-001',
    'type: method',
    'title: T',
    'status: draft',
    'created: 2026-08-01',
    'updated: 2026-08-01',
  ];
  const build = (lines: string[]): ReturnType<typeof parseDocument> =>
    parseDocument('methods/MET-001-t.md', `---\n${[...base, ...lines].join('\n')}\n---\n\nBody.\n`);

  // The happy shape, including the empty requires list a gate needing no
  // tools legitimately declares.
  const ok = build(['description: Routes vague intent.', 'requires: []']);
  assert.deepEqual(ok.issues, []);
  assert.deepEqual(ok.document?.requires, []);

  const noDescription = build(['requires: []']);
  assert.equal(noDescription.document, undefined);
  assert.partialDeepStrictEqual(noDescription.issues[0], { kind: 'invalid-frontmatter', field: 'description' });

  // An empty (or whitespace-only) description would emit a shell that
  // triggers on nothing — the field is present and still refused.
  for (const empty of ['description: ""', 'description: "   "']) {
    const blank = build([empty, 'requires: []']);
    assert.equal(blank.document, undefined);
    assert.partialDeepStrictEqual(blank.issues[0], { kind: 'invalid-frontmatter', field: 'description' });
    assert.match(blank.issues[0]!.message, /must not be empty/);
  }

  const noRequires = build(['description: Routes vague intent.']);
  assert.equal(noRequires.document, undefined);
  assert.partialDeepStrictEqual(noRequires.issues[0], { kind: 'invalid-frontmatter', field: 'requires' });

  const badRequires = build(['description: Routes vague intent.', 'requires: get_context']);
  assert.equal(badRequires.document, undefined);
  assert.partialDeepStrictEqual(badRequires.issues[0], { kind: 'invalid-frontmatter', field: 'requires' });
});

test('MET- ids resolve to the method type and a mismatched type fails the id-prefix superRefine', () => {
  assert.equal(typeOfId('MET-001'), 'method');
  assert.ok((DOC_TYPES as readonly string[]).includes('method'));

  const mismatch = parseDocument(
    'methods/MET-001-t.md',
    '---\nid: MET-001\ntype: workflow\ntitle: T\nstatus: draft\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\n\nBody.\n',
  );
  assert.equal(mismatch.document, undefined);
  assert.partialDeepStrictEqual(mismatch.issues[0], { kind: 'invalid-frontmatter', field: 'id' });
  assert.match(mismatch.issues[0]!.message, /id prefix implies type "method"/);

  // A MET- id on a type that has no such prefix is caught the other way too.
  const strayPrefix = parseDocument(
    'requirements/REQ-001-t.md',
    '---\nid: MET-9\ntype: requirement\ntitle: T\nstatus: draft\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\n\nBody.\n',
  );
  assert.partialDeepStrictEqual(strayPrefix.issues[0], { kind: 'invalid-frontmatter', field: 'id' });
});

// --- Promotion (DEC-125's "the user can amend and approve the method") ----

test('approve flips a draft method to accepted and stamps it; a retired one has nothing to approve', async (t) => {
  const root = tmpVeri(t);
  const veriDir = join(root, 'veri');
  const file = join(veriDir, METHODS_DIR, 'MET-001-wayfinder.md');
  writeFileSync(file, methodFile('MET-001', 'draft'));

  const draft = (await loadProject(veriDir)).documents[0]!;
  assert.ok(isPending(draft), 'a draft method awaits the user, like every other draft');

  const result = await approveDocument(veriDir, 'MET-001', '2026-08-27');
  assert.partialDeepStrictEqual(result, { id: 'MET-001', from: 'draft', to: 'accepted', approved: '2026-08-27' });
  const after = readFileSync(file, 'utf8');
  assert.match(after, /\nstatus: accepted\n/);
  assert.match(after, /\napproved: 2026-08-27\n/);
  assert.ok(after.includes('METHOD-BODY-MARKER'), 'approval edits frontmatter lines only');

  writeFileSync(file, methodFile('MET-001', 'retired'));
  await assert.rejects(() => approveDocument(veriDir, 'MET-001'), /nothing to approve — MET-001 is retired/);
});

// --- Placement (the method-file rule) ------------------------------------

function methodDoc(id: string, file: string, status = 'accepted'): VeriDocument {
  return {
    id,
    type: 'method',
    title: `M ${id}`,
    status,
    created: '2026-08-01',
    updated: '2026-08-01',
    links: [],
    description: 'Routes vague intent.',
    requires: [],
    frontmatter: {},
    body: 'The gate.\n',
    file,
    inlineRefs: [],
  };
}

test('method files: any name under methods/ is fine; a method outside it and a foreign type inside it are violations', () => {
  // Open collection: the *set* is not enumerated, so nothing here objects to
  // a filename the project invented.
  assert.deepEqual(
    checkMethodFiles([methodDoc('MET-001', 'methods/MET-001-wayfinder.md'), methodDoc('MET-014', 'methods/MET-014-our-own-gate.md')]),
    [],
  );

  const stray = checkMethodFiles([methodDoc('MET-002', 'decisions/MET-002-misfiled.md')]);
  assert.equal(stray.length, 1);
  assert.partialDeepStrictEqual(stray[0], { kind: 'method-file', id: 'MET-002', file: 'decisions/MET-002-misfiled.md' });

  const foreign = methodDoc('DEC-001', 'methods/DEC-001-smuggled.md');
  const smuggled = checkMethodFiles([{ ...foreign, type: 'decision', status: 'active' }]);
  assert.equal(smuggled.length, 1);
  assert.partialDeepStrictEqual(smuggled[0], { kind: 'method-file', id: 'DEC-001', file: 'methods/DEC-001-smuggled.md' });
});

test('checkProject reports the method-file violation for a misplaced method on disk', async (t) => {
  const root = tmpVeri(t);
  const veriDir = join(root, 'veri');
  writeFileSync(join(veriDir, 'requirements', 'MET-001-misfiled.md'), methodFile('MET-001', 'draft'));

  const load = await loadProject(veriDir);
  const issues = checkProject(load).issues;
  assert.equal(issues.length, 1, JSON.stringify(issues));
  assert.partialDeepStrictEqual(issues[0], { kind: 'method-file', id: 'MET-001', file: 'requirements/MET-001-misfiled.md' });
});

// --- Assembly: the gate menu (DEC-130) -----------------------------------

const WORKFLOW = [
  '---',
  'id: WF-001',
  'type: workflow',
  'title: W',
  'status: accepted',
  'approved: 2026-08-01',
  'created: 2026-08-01',
  'updated: 2026-08-01',
  '---',
  '',
  '## The path of work',
  '',
  'Evidence in, receipts out.',
  '',
].join('\n');

const WORK_ORDER = [
  '---',
  'id: WO-001',
  'type: work-order',
  'title: Do the thing',
  'status: backlog',
  'created: 2026-08-01',
  'updated: 2026-08-01',
  '---',
  '',
  '## Summary',
  '',
  'WO-BODY-MARKER',
  '',
].join('\n');

/** A project with `count` accepted methods, plus one draft and one retired. */
function projectWithMethods(t: TestContext, count: number): string {
  const root = tmpVeri(t);
  const veriDir = join(root, 'veri');
  writeFileSync(join(veriDir, 'workflow.md'), WORKFLOW);
  writeFileSync(join(veriDir, 'work-orders', 'WO-001-do.md'), WORK_ORDER);
  for (let n = 1; n <= count; n++) {
    const id = `MET-${String(n).padStart(3, '0')}`;
    writeFileSync(join(veriDir, METHODS_DIR, `${id}-gate.md`), methodFile(id, 'accepted'));
  }
  writeFileSync(join(veriDir, METHODS_DIR, 'MET-900-unratified.md'), methodFile('MET-900', 'draft'));
  writeFileSync(join(veriDir, METHODS_DIR, 'MET-901-retired.md'), methodFile('MET-901', 'retired'));
  return root;
}

test('the method policy is always/name-only and the menu names accepted methods only', async (t) => {
  assert.deepEqual(ASSEMBLY_POLICY.method, { include: 'always', packing: { mode: 'name-only' } });
  assert.deepEqual(packingFor('method', 'accepted'), { mode: 'name-only' });

  const root = projectWithMethods(t, 2);
  const { text } = await assembleContext(root, 'WO-001');

  assert.match(text, /## Methods — 2 gates available/);
  assert.match(text, /- MET-001 — The MET-001 gate/);
  assert.match(text, /- MET-002 — The MET-002 gate/);
  // Name-only: no method body reaches the package, at any status.
  assert.ok(!text.includes('METHOD-BODY-MARKER'), 'method bodies are fetched on demand, never inlined');
  // A draft gate is not a gate yet, and a retired one is no longer one.
  assert.ok(!text.includes('MET-900'), 'a draft method never ships');
  assert.ok(!text.includes('MET-901'), 'a retired method never ships');

  // The menu sits between the process and the specifics, and never in the
  // traversal buckets or the pending block.
  const menuAt = text.indexOf('## Methods');
  assert.ok(text.indexOf('## Workflow') < menuAt, 'the workflow opens before the menu');
  assert.ok(menuAt < text.indexOf('## Work order'), 'the menu precedes the work order');
  assert.ok(!text.includes('## Pending proposals'), 'a draft method does not open a pending block of its own');
});

test('the fourteen-gate menu costs a bounded number of tokens — the reason name-only was chosen', async (t) => {
  const bare = await assembleContext(projectWithMethods(t, 0), 'WO-001');
  const full = await assembleContext(projectWithMethods(t, 14), 'WO-001');

  const menuCost = full.totalTokens - bare.totalTokens;
  assert.ok(menuCost > 0, 'the menu must actually cost something — it is real text in the package');
  // DEC-130 rejected full packing as unaffordable: fourteen coaching
  // documents against the inline threshold would spend the layering budget.
  // Name-only holds the whole menu to a rounding error against it.
  assert.ok(menuCost <= 400, `fourteen name-only gates must stay under 400 tokens, got ${menuCost}`);
  assert.ok(
    menuCost < INLINE_THRESHOLD_TOKENS / 20,
    `the menu must stay under 5% of the inline threshold (${INLINE_THRESHOLD_TOKENS}), got ${menuCost}`,
  );
  // The bodies it stands in for are the cost it avoids.
  const bodies = 14 * estimateTokens(methodFile('MET-001', 'accepted'));
  assert.ok(menuCost < bodies, 'the menu must cost less than inlining the same fourteen documents');

  // Neither count changes docCount: name-only rows ship no bodies.
  assert.equal(full.docCount, bare.docCount);
});

// --- Creation: an open collection, not a gated set -----------------------

test('generic creation mints a method under methods/ with a placeholder description the schema accepts', async (t) => {
  const root = tmpVeri(t);
  const veriDir = join(root, 'veri');
  writeFileSync(join(veriDir, 'workflow.md'), WORKFLOW);

  const created = await createDocument(veriDir, 'method', 'Our own gate', { date: '2026-08-27' });
  assert.equal(created.id, 'MET-001');
  assert.equal(created.file, 'methods/MET-001-our-own-gate.md');
  assert.match(created.text, /\nstatus: draft\n/);
  assert.ok(created.text.includes(METHOD_DESCRIPTION_PLACEHOLDER));
  assert.match(created.text, /\nrequires: \[\]\n/);

  // Type + title in, a check-passing file out — the property the required
  // fields must not break.
  const load = await loadProject(veriDir);
  assert.deepEqual(checkProject(load).issues, []);
  const doc = load.documents.find((candidate) => candidate.id === 'MET-001')!;
  assert.equal(doc.description, METHOD_DESCRIPTION_PLACEHOLDER);
  assert.deepEqual(doc.requires, []);
  assert.equal(doc.upstream, undefined, 'a project-authored method has no upstream');

  // Ids are minted on demand: a second method is simply the next one.
  const second = await createDocument(veriDir, 'method', 'Another gate', { date: '2026-08-27' });
  assert.equal(second.id, 'MET-002');

  // The body comes from the six-section template DEC-130 names.
  for (const section of ['## Purpose', '## What it reads', '## The interview', '## What it files', '## Guardrails', '## Handoff']) {
    assert.ok(BODY_TEMPLATES.method.includes(section), `the method template must offer ${section}`);
    assert.ok(created.text.includes(section));
  }
});

// --- Format 4 (superseded as current by WO-143's format 5) ----------------

test('a format-3 project migrates through 4 with no method-document change, and a newer marker reports the format', (t) => {
  const root = tmpVeri(t);
  const veriDir = join(root, 'veri');
  writeFormatMarker(veriDir, 3);
  const doc = methodFile('MET-001', 'accepted');
  writeFileSync(join(veriDir, METHODS_DIR, 'MET-001-wayfinder.md'), doc);

  const result = migrateProject(veriDir);
  assert.equal(result.from, 3);
  assert.equal(result.to, CURRENT_FORMAT);
  assert.equal(result.applied[0], '3 → 4: the method document type joins the schema (marker only; documents are already valid)');
  assert.equal(readFileSync(join(veriDir, METHODS_DIR, 'MET-001-wayfinder.md'), 'utf8'), doc, 'no method-document changes');
  assert.deepEqual(classifyFormat(veriDir), { kind: 'current', version: CURRENT_FORMAT });

  // What a reader one format behind sees: the marker, read before any
  // document is parsed, so it says "update Veri" instead of reporting the
  // method documents it cannot understand as invalid frontmatter.
  writeFormatMarker(veriDir, CURRENT_FORMAT + 1);
  const ahead = classifyFormat(veriDir);
  assert.deepEqual(ahead, { kind: 'newer', version: CURRENT_FORMAT + 1 });
  assert.match(formatStatement(ahead) ?? '', /update Veri to open it/);
});
