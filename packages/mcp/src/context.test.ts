import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleContext } from './context.ts';
import { ASSEMBLY_POLICY, INLINE_THRESHOLD_TOKENS, packingFor } from '@verikb/core';

const FIXTURE = fileURLToPath(new URL('../fixtures/superseded-chain', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

test('package contains workflow, work order, requirement, and active decision in order', async () => {
  const pkg = await assembleContext(FIXTURE, 'WO-001');
  const text = pkg.text;

  assert.match(text, /^# Context package · WO-001 — Render invoices to PDF/);
  assert.match(text, /\(\d+ docs · ~\d+ tokens\)/);

  for (const marker of ['TEST-CONVENTIONS-MARKER', 'WO-BODY-MARKER', 'REQ-BODY-MARKER', 'NEW-BODY-MARKER']) {
    assert.ok(text.includes(marker), `package should contain ${marker}`);
  }

  const order = [
    '## Workflow · WF-001',
    '## Work order WO-001',
    '## Requirements',
    '### REQ-001',
    '## Decisions',
    '### DEC-001',
    '## Sources (excerpts)',
    '### SRC-001',
  ].map((needle) => {
    const at = text.indexOf(needle);
    assert.ok(at >= 0, `package should contain "${needle}"`);
    return at;
  });
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'sections must be in deterministic order');
});

test('superseded decision is named under already rejected with its body omitted', async () => {
  const { text } = await assembleContext(FIXTURE, 'WO-001');
  assert.match(text, /### Already rejected \(superseded — bodies omitted\)/);
  assert.match(text, /- DEC-002 — Handlebars HTML templates \(superseded by DEC-001\)/);
  assert.ok(!text.includes('OLD-BODY-MARKER'), 'superseded body must be omitted');
});

test('pending documents appear only in the labeled proposals block (REQ-008)', async () => {
  const { text } = await assembleContext(FIXTURE, 'WO-001');

  const pendingAt = text.indexOf('## Pending proposals — not ratified, do not treat as binding');
  assert.ok(pendingAt >= 0, 'package should contain the pending block');
  for (const marker of ['PENDING-REQ-MARKER', 'PENDING-DEC-MARKER']) {
    const at = text.indexOf(marker);
    assert.ok(at > pendingAt, `${marker} must render inside the pending block, not before it`);
  }

  // The binding sections must not claim them: every REQ-002/DEC-003 heading
  // sits after the pending block starts.
  for (const heading of ['### REQ-002', '### DEC-003']) {
    assert.ok(text.indexOf(heading) > pendingAt, `${heading} must not appear in a binding section`);
  }
  const decisionsAt = text.indexOf('## Decisions');
  assert.ok(decisionsAt >= 0 && decisionsAt < pendingAt, 'binding decisions render before the pending block');
});

test('a project without a workflow document simply omits the section', async () => {
  const noWorkflow = fileURLToPath(new URL('../fixtures/no-workflow', import.meta.url));
  const { text } = await assembleContext(noWorkflow, 'WO-001');
  assert.ok(!text.includes('## Workflow'), 'no workflow section without a workflow document');
  assert.match(text, /## Work order WO-001/);
});

test('sources reached at hop 2 appear as truncated excerpts', async () => {
  const { text } = await assembleContext(FIXTURE, 'WO-001');
  assert.ok(text.includes('EXCERPT-START-MARKER'), 'excerpt should start with the source body');
  assert.ok(!text.includes('END-MARKER'), 'excerpt should be truncated before the end of the body');
  assert.match(text, /· excerpt ·/);
});

// --- Outcome sources ride their requirement (REQ-033, WO-115) ---

function writeOutcomeProject(root: string, extra: Record<string, string> = {}): void {
  const veri = join(root, 'veri');
  for (const sub of ['requirements', 'work-orders', 'sources', 'decisions']) mkdirSync(join(veri, sub), { recursive: true });
  writeFileSync(
    join(veri, 'work-orders', 'WO-001-ship.md'),
    '---\nid: WO-001\ntype: work-order\ntitle: Ship it\nstatus: done\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\nlinks:\n  - id: REQ-001\n    rel: implements\n---\n## Summary\n\nWO-BODY.\n\n## Receipts\n\n- 2026-08-01 abc123 shipped\n',
  );
  writeFileSync(
    join(veri, 'requirements', 'REQ-001-bet.md'),
    '---\nid: REQ-001\ntype: requirement\ntitle: The bet\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\nkind: hypothesis\noutcome:\n  metric: activation-rate\n  target: "> 40%"\n---\nREQ-BODY.\n\n## Acceptance criteria\n\n- [x] x\n',
  );
  writeFileSync(
    join(veri, 'sources', 'SRC-001-outcome.md'),
    '---\nid: SRC-001\ntype: source\ntitle: What reality said\nstatus: imported\ncreated: 2026-08-02\nupdated: 2026-08-02\nlinks:\n  - id: REQ-001\n    rel: supports\n  - id: WO-001\n    rel: outcome-of\n---\nOUTCOME-EVIDENCE-BODY activation moved.\n',
  );
  for (const [file, text] of Object.entries(extra)) writeFileSync(join(veri, file), text);
}

test("a requirement's package carries its outcome sources and names them as evidence (REQ-033)", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-outcome-ctx-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeOutcomeProject(dir);
  const { text, mode } = await assembleContext(dir, 'WO-001');
  assert.equal(mode, 'inline');
  assert.match(text, /## Sources \(excerpts\)/);
  assert.ok(text.includes('OUTCOME-EVIDENCE-BODY'), 'the outcome source body must ship');
  // The requirement itself names what reality said, right where the bet is stated.
  assert.match(text, /### REQ-001 — The bet · accepted · hypothesis/);
  assert.match(text, /Outcome evidence: SRC-001 \(supports\)/);
});

test("a work order with an inbound outcome-of source names it in the work-order section (WO-154)", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-outcome-wo-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeOutcomeProject(dir);
  const { text } = await assembleContext(dir, 'WO-001');
  const woAt = text.indexOf('## Work order WO-001');
  const reportedAt = text.indexOf('What shipped here reported back: SRC-001 (outcome-of)');
  assert.ok(woAt >= 0, 'the work-order section must render');
  assert.ok(reportedAt > woAt, 'the reported-back line must render inside the work-order section');
  const nextSection = text.indexOf('\n## ', woAt + 1);
  assert.ok(reportedAt < nextSection, 'the reported-back line belongs to the work-order section, not a later one');
});

test('a work order with no inbound outcome-of source renders no reported-back line', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-outcome-none-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  // The source reports on the requirement only — nothing links the work
  // order with outcome-of, so the work-order section stays as it was.
  writeOutcomeProject(dir, {
    'sources/SRC-001-outcome.md':
      '---\nid: SRC-001\ntype: source\ntitle: What reality said\nstatus: imported\ncreated: 2026-08-02\nupdated: 2026-08-02\nlinks:\n  - id: REQ-001\n    rel: supports\n---\nOUTCOME-EVIDENCE-BODY activation moved.\n',
  });
  const { text } = await assembleContext(dir, 'WO-001');
  assert.ok(!text.includes('What shipped here reported back:'), 'no reported-back line without an outcome-of edge');
});

test('outcome sources stay inlined in layered mode instead of falling to the context map', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-outcome-layered-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  // A huge hop-2 decision (linked from the requirement) pushes the inline
  // package over the threshold; the outcome source — also hop 2 by
  // traversal — must ride its requirement into the core ring regardless.
  writeOutcomeProject(dir, {
    'decisions/DEC-001-huge.md': `---\nid: DEC-001\ntype: decision\ntitle: Huge\nstatus: active\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\nlinks:\n  - id: REQ-001\n    rel: constrains\n---\n## Choice\n\n${'filler '.repeat(INLINE_THRESHOLD_TOKENS)}\n`,
    // This source links only the requirement — reached at hop 2, so only the
    // promotion keeps it out of the map.
    'sources/SRC-001-outcome.md':
      '---\nid: SRC-001\ntype: source\ntitle: What reality said\nstatus: imported\ncreated: 2026-08-02\nupdated: 2026-08-02\nlinks:\n  - id: REQ-001\n    rel: supports\n---\nOUTCOME-EVIDENCE-BODY activation moved.\n',
  });
  const { text, mode } = await assembleContext(dir, 'WO-001');
  assert.equal(mode, 'layered');
  assert.ok(text.includes('OUTCOME-EVIDENCE-BODY'), 'the outcome source must inline, not map');
  assert.match(text, /Outcome evidence: SRC-001 \(supports\)/);
  const mapAt = text.indexOf('## Context map');
  assert.ok(mapAt >= 0, 'the huge decision should force a context map');
  assert.ok(!text.slice(mapAt).includes('- SRC-001'), 'SRC-001 must not appear as a map row');
});

// --- The verify command in the work-order section (REQ-042, WO-145) ---

test('a work order declaring verify: shows the command in the work-order section', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-verify-ctx-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeOutcomeProject(dir, {
    'work-orders/WO-001-ship.md':
      '---\nid: WO-001\ntype: work-order\ntitle: Ship it\nstatus: done\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\nverify: npm test\nlinks:\n  - id: REQ-001\n    rel: implements\n---\n## Summary\n\nWO-BODY.\n\n## Receipts\n\n- 2026-08-01 abc123 shipped\n',
  });
  const { text } = await assembleContext(dir, 'WO-001');
  const woAt = text.indexOf('## Work order WO-001');
  const verifyAt = text.indexOf(
    "Verify: npm test — must exit 0; run it before the receipt and state the outcome in the receipt's sentence (REQ-042)",
  );
  assert.ok(woAt >= 0, 'package should contain the work-order section');
  assert.ok(verifyAt > woAt, 'the verify line renders in the work-order section');
  const nextSection = text.indexOf('## Requirements');
  assert.ok(nextSection > verifyAt, 'the verify line renders before the next section');
});

test('a work order without verify: renders no verify line — behaves exactly as today (REQ-042)', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-noverify-ctx-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeOutcomeProject(dir);
  const { text } = await assembleContext(dir, 'WO-001');
  assert.ok(!text.includes('Verify:'), 'no verify line without the field');
});

test('assembly is deterministic', async () => {
  const first = await assembleContext(FIXTURE, 'WO-001');
  const second = await assembleContext(FIXTURE, 'WO-001');
  assert.equal(first.text, second.text);
});

test('unknown ids and non-work-order ids are rejected', async () => {
  await assert.rejects(() => assembleContext(FIXTURE, 'WO-999'), /no document with id WO-999/);
  await assert.rejects(() => assembleContext(FIXTURE, 'REQ-001'), /expects a work order id/);
});

test("get_context on this repo's WO-003 includes REQ-003 in full and names DEC-003 as superseded", async () => {
  const { text, docCount, totalTokens } = await assembleContext(REPO_ROOT, 'WO-003');
  assert.match(text, /### REQ-003 — MCP server assembles and serves context packages · accepted/);
  // DEC-003 was superseded by DEC-142 (receipts are one-line pointers):
  // a superseded decision is named as already rejected, body omitted.
  assert.match(text, /### Already rejected \(superseded — bodies omitted\)/);
  assert.match(text, /- DEC-003 — Receipts are per execution session.*\(superseded by DEC-142\)/);
  assert.ok(!text.includes('Sessions are the natural unit of agent work'), 'a superseded decision body must be omitted');
  assert.match(text, /## Workflow · WF-001 — Veri project workflow/);
  assert.ok(docCount >= 4);
  assert.ok(totalTokens > 500);
});

test('an accepted workflow renders unlabeled; a draft one carries the non-binding label (REQ-008)', async () => {
  const fixture = await assembleContext(FIXTURE, 'WO-001');
  assert.match(fixture.text, /## Workflow · WF-001 — Test project workflow · ~\d+ tokens/);
  assert.ok(!fixture.text.includes('WF-001 — Test project workflow · draft'), 'accepted workflow must not be labeled');

  // Exercise the label on a copy of the no-workflow fixture plus a draft workflow.
  const { cpSync, mkdtempSync, rmSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const noWorkflow = fileURLToPath(new URL('../fixtures/no-workflow', import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), 'veri-draft-workflow-'));
  try {
    cpSync(noWorkflow, dir, { recursive: true });
    writeFileSync(
      join(dir, 'veri', 'workflow.md'),
      '---\nid: WF-001\ntype: workflow\ntitle: Draft workflow\nstatus: draft\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n\nDRAFT-WF-MARKER\n',
    );
    const { text } = await assembleContext(dir, 'WO-001');
    assert.match(text, /## Workflow · WF-001 — Draft workflow · draft — not ratified, do not treat as binding/);
    assert.ok(text.includes('DRAFT-WF-MARKER'), 'draft workflow body stays visible');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('templates close every package, reflecting project overrides (REQ-010)', async (t) => {
  const { mkdirSync, rmSync, writeFileSync } = await import('node:fs');
  const { join } = await import('node:path');

  const { text: withDefaults } = await assembleContext(FIXTURE, 'WO-001');
  const templatesAt = withDefaults.indexOf('## Templates — how new documents start in this project');
  assert.ok(templatesAt >= 0, 'package should contain the templates section');
  assert.ok(
    templatesAt > withDefaults.indexOf('## Sources (excerpts)'),
    'templates render after the source excerpts',
  );
  for (const type of ['requirement', 'decision', 'work-order', 'source', 'workflow']) {
    assert.ok(
      withDefaults.includes(`### ${type} · built-in default`),
      `templates section should cover ${type}`,
    );
  }

  // A project file flips its type's provenance and body; read fresh, no cache.
  const templatesDir = join(FIXTURE, 'veri', 'templates');
  mkdirSync(templatesDir, { recursive: true });
  writeFileSync(join(templatesDir, 'decision.md'), '\nCUSTOM-TEMPLATE-MARKER\n');
  t.after(() => rmSync(templatesDir, { recursive: true, force: true }));

  const { text } = await assembleContext(FIXTURE, 'WO-001');
  assert.ok(text.includes('### decision · project template'), 'override changes provenance');
  assert.ok(text.includes('CUSTOM-TEMPLATE-MARKER'), 'override body is served');
  assert.ok(text.includes('### requirement · built-in default'), 'other types keep the default');
});

// ---- Layered assembly (DEC-035 / REQ-018) --------------------------------

/**
 * A hub corpus: WO-001 → REQ-001 (hop 1), and `decisions` fat decisions all
 * constraining REQ-001 (hop 2), plus a draft requirement and a neighboring
 * work order in the same ring. Each decision body is ~600 tokens, so the
 * inline package crosses the threshold as `decisions` grows.
 */
function hubCorpus(t: { after(fn: () => void): void }, decisions: number): string {
  const root = mkdtempSync(join(tmpdir(), 'veri-layered-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const veri = join(root, 'veri');
  for (const sub of ['requirements', 'decisions', 'work-orders']) mkdirSync(join(veri, sub), { recursive: true });

  const doc = (id: string, type: string, title: string, status: string, extra: string[], body: string): string =>
    ['---', `id: ${id}`, `type: ${type}`, `title: ${title}`, `status: ${status}`, 'created: 2026-08-01', 'updated: 2026-08-01', ...extra, '---', '', body, ''].join('\n');

  writeFileSync(join(veri, 'workflow.md'), doc('WF-001', 'workflow', 'Hub workflow', 'accepted', ['approved: 2026-08-01'], 'WF-MARKER'));
  writeFileSync(
    join(veri, 'work-orders', 'WO-001-hub-work.md'),
    doc('WO-001', 'work-order', 'Hub work', 'in-progress', ['links:', '  - id: REQ-001', '    rel: implements'], 'WO-BODY-MARKER'),
  );
  writeFileSync(
    join(veri, 'requirements', 'REQ-001-hub.md'),
    doc('REQ-001', 'requirement', 'Hub requirement', 'accepted', ['approved: 2026-08-01'], 'REQ1-BODY-MARKER'),
  );
  writeFileSync(
    join(veri, 'requirements', 'REQ-002-pending-ring.md'),
    doc('REQ-002', 'requirement', 'Pending ring requirement', 'draft', ['links:', '  - id: REQ-001', '    rel: extends'], 'PENDING-RING-MARKER'),
  );
  writeFileSync(
    join(veri, 'work-orders', 'WO-002-neighbor.md'),
    doc('WO-002', 'work-order', 'Neighbor work', 'backlog', ['links:', '  - id: REQ-001', '    rel: relates-to'], 'WO2-MARKER'),
  );
  for (let i = 1; i <= decisions; i++) {
    const id = `DEC-${String(i).padStart(3, '0')}`;
    writeFileSync(
      join(veri, 'decisions', `${id}-dense.md`),
      doc(id, 'decision', `Dense decision ${i}`, 'active', ['approved: 2026-08-01', 'links:', '  - id: REQ-001', '    rel: constrains'], `DEC-BODY-MARKER-${id} ${'x'.repeat(2400)}`),
    );
  }
  return root;
}

test('under the threshold everything inlines — the map never appears (DEC-035 escalation)', async (t) => {
  const pkg = await assembleContext(hubCorpus(t, 4), 'WO-001');
  assert.equal(pkg.mode, 'inline');
  assert.equal(pkg.mappedCount, 0);
  assert.ok(pkg.totalTokens <= INLINE_THRESHOLD_TOKENS);
  assert.ok(!pkg.text.includes('## Context map'), 'no map section in inline mode');
  assert.ok(pkg.text.includes('DEC-BODY-MARKER-DEC-001'), 'hop-2 bodies inline under the threshold');

  const fixture = await assembleContext(FIXTURE, 'WO-001');
  assert.equal(fixture.mode, 'inline'); // the existing fixture stays byte-stable
});

test('over the threshold the binding core ships whole and the hop-2 ring becomes the map', async (t) => {
  const pkg = await assembleContext(hubCorpus(t, 30), 'WO-001');
  assert.equal(pkg.mode, 'layered');
  assert.equal(pkg.mappedCount, 32); // 30 decisions + draft REQ-002 + neighbor WO-002

  // Binding set in full, at any corpus size (REQ-018).
  for (const marker of ['WF-MARKER', 'WO-BODY-MARKER', 'REQ1-BODY-MARKER']) {
    assert.ok(pkg.text.includes(marker), `core must inline ${marker}`);
  }
  // Hop-2 bodies are enumerated, never inlined…
  assert.ok(!pkg.text.includes('DEC-BODY-MARKER-DEC-001'), 'mapped bodies must not inline');
  assert.match(pkg.text, /## Context map — 32 adjacent documents, not inlined/);
  // …and every ring document appears with id, title, and how it connects.
  for (let i = 1; i <= 30; i++) {
    const id = `DEC-${String(i).padStart(3, '0')}`;
    assert.match(pkg.text, new RegExp(`^- ${id} — Dense decision ${i} · decision · active · via REQ-001 \\(constrains\\) · ~\\d+ tokens$`, 'm'));
  }
  // A pending ring document maps with its status visible instead of joining
  // the pending block (REQ-008 labeling applies to inlined bodies).
  assert.match(pkg.text, /^- REQ-002 — Pending ring requirement · requirement · draft · via REQ-001 \(extends\)/m);
  assert.ok(!pkg.text.includes('## Pending proposals'), 'no inlined pending bodies in this corpus');
  // A neighboring work order — invisible before DEC-035 — is now enumerated.
  assert.match(pkg.text, /^- WO-002 — Neighbor work · work-order · backlog · via REQ-001 \(relates-to\)/m);

  // The header keeps its exact shape: the package panel parses it (WO-013).
  assert.match(pkg.text, /\(\d+ docs · ~\d+ tokens\)/);

  // Determinism on this side of the threshold too.
  const again = await assembleContext(hubCorpus(t, 30), 'WO-001');
  assert.equal(pkg.text, again.text);
});

test('package tokens grow with the direct neighborhood, not corpus size (REQ-018)', async (t) => {
  const at30 = await assembleContext(hubCorpus(t, 30), 'WO-001');
  const at60 = await assembleContext(hubCorpus(t, 60), 'WO-001');
  assert.equal(at60.mappedCount, 62);
  // Doubling the hop-2 ring adds only map rows (~25 tokens each), not the
  // ~18k tokens its bodies would cost inline.
  const growth = at60.totalTokens - at30.totalTokens;
  assert.ok(growth < 1500, `growth ${growth} should be map rows only`);
  assert.ok(at60.totalTokens < INLINE_THRESHOLD_TOKENS, 'layered package stays bounded');
});

test('core assembly policy carries the values this package used to hardcode (DEC-025)', () => {
  assert.equal(ASSEMBLY_POLICY.workflow.include, 'always');
  assert.deepEqual(packingFor('work-order', 'in-progress'), { mode: 'full' });
  assert.deepEqual(packingFor('requirement', 'accepted'), { mode: 'full' });
  assert.deepEqual(packingFor('decision', 'active'), { mode: 'full' });
  assert.deepEqual(packingFor('decision', 'superseded'), { mode: 'name-only' });
  assert.deepEqual(packingFor('source', 'imported'), { mode: 'excerpt', chars: 600 });
});

test('the package carries the advisory tier for the subject work order — pure findings only (WO-045)', async (t) => {
  // Copy the fixture and start WO-001: an in-progress work order linking the
  // superseded DEC-002 is drift (revoked authority), and the package says so.
  const { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'veri-context-advisory-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  cpSync(FIXTURE, dir, { recursive: true });
  const workOrder = join(dir, 'veri/work-orders/WO-001-render-invoices.md');
  writeFileSync(workOrder, readFileSync(workOrder, 'utf8').replace('status: backlog', 'status: in-progress'));

  const { text } = await assembleContext(dir, 'WO-001');
  const advisoriesAt = text.indexOf('## Advisories on this work order — informational, never blocking (DEC-025)');
  assert.ok(advisoriesAt >= 0, 'package should carry the advisory section');
  assert.ok(advisoriesAt > text.indexOf('## Work order WO-001'), 'advisories follow the work order');
  assert.match(text, /WO-001 is in-progress but stands on DEC-002, which is superseded by DEC-001/);

  // Backlog planning is not drift: the pristine fixture has no such section.
  const pristine = await assembleContext(FIXTURE, 'WO-001');
  assert.ok(!pristine.text.includes('stands on DEC-002'), 'backlog work order stays quiet');
});

test('requirement kind rides the heading and a declared outcome ships as its own line (REQ-032, WO-114)', async (t) => {
  const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'veri-context-kind-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const sub of ['requirements', 'work-orders']) mkdirSync(join(dir, 'veri', sub), { recursive: true });
  writeFileSync(
    join(dir, 'veri', 'requirements', 'REQ-001-bet.md'),
    '---\nid: REQ-001\ntype: requirement\ntitle: Onboarding map improves activation\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\nkind: hypothesis\noutcome:\n  metric: activation-rate\n  target: "> 40%"\n---\nHYPOTHESIS-BODY-MARKER\n\n## Acceptance criteria\n\n- [ ] x\n',
  );
  writeFileSync(
    join(dir, 'veri', 'requirements', 'REQ-002-constraint.md'),
    '---\nid: REQ-002\ntype: requirement\ntitle: No data loss\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\nCONSTRAINT-BODY-MARKER\n\n## Acceptance criteria\n\n- [ ] x\n',
  );
  writeFileSync(
    join(dir, 'veri', 'work-orders', 'WO-001-work.md'),
    '---\nid: WO-001\ntype: work-order\ntitle: The work\nstatus: backlog\ncreated: 2026-08-01\nupdated: 2026-08-01\nlinks:\n  - id: REQ-001\n    rel: implements\n  - id: REQ-002\n    rel: implements\n---\n## Summary\n\nWork.\n',
  );

  const { text } = await assembleContext(dir, 'WO-001');
  assert.match(text, /### REQ-001 — Onboarding map improves activation · accepted · hypothesis · ~\d+ tokens/);
  assert.match(text, /^Outcome: activation-rate > 40%$/m);
  // The kind-less default renders explicitly as a constraint (REQ-032).
  assert.match(text, /### REQ-002 — No data loss · accepted · constraint · ~\d+ tokens/);
  // The outcome line belongs to the hypothesis, before its body.
  const outcomeAt = text.indexOf('Outcome: activation-rate > 40%');
  assert.ok(outcomeAt >= 0 && outcomeAt < text.indexOf('HYPOTHESIS-BODY-MARKER'));
});

// --- Intent-led packages (REQ-039, WO-124) ---

function writeIntentProject(root: string, focusStatus: 'accepted' | 'draft'): void {
  const veri = join(root, 'veri');
  for (const sub of ['requirements', 'work-orders', 'product']) mkdirSync(join(veri, sub), { recursive: true });
  writeFileSync(
    join(veri, 'workflow.md'),
    '---\nid: WF-001\ntype: workflow\ntitle: W\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\nWORKFLOW-BODY.\n',
  );
  writeFileSync(
    join(veri, 'product', 'vision.md'),
    '---\nid: PRD-001\ntype: product\ntitle: Vision\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\nVISION-BODY the system of record.\n',
  );
  writeFileSync(
    join(veri, 'product', 'current-focus.md'),
    `---\nid: PRD-002\ntype: product\ntitle: Current focus\nstatus: ${focusStatus}\n${
      focusStatus === 'accepted' ? 'approved: 2026-08-01\n' : ''
    }created: 2026-08-01\nupdated: 2026-08-01\n---\nFOCUS-BODY landing the layer.\n`,
  );
  writeFileSync(
    join(veri, 'requirements', 'REQ-001-bet.md'),
    '---\nid: REQ-001\ntype: requirement\ntitle: The activation bet\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\nkind: hypothesis\noutcome:\n  metric: activation-rate\n  target: "> 40%"\n---\nREQ-BODY.\n\n## Acceptance criteria\n\n- [ ] x\n',
  );
  writeFileSync(
    join(veri, 'work-orders', 'WO-001-ship.md'),
    '---\nid: WO-001\ntype: work-order\ntitle: Ship it\nstatus: backlog\ncreated: 2026-08-01\nupdated: 2026-08-01\nlinks:\n  - id: REQ-001\n    rel: implements\n---\n## Summary\n\nWO-BODY.\n\n## Receipts\n\n(none yet)\n',
  );
}

test('the package opens with the intent section — approved singletons in sanctioned order, ahead of workflow and requirements (REQ-039)', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-intent-ctx-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeIntentProject(dir, 'accepted');
  const { text } = await assembleContext(dir, 'WO-001');

  const order = ['## Intent', '### PRD-001 — Vision', '### PRD-002 — Current focus', '### The bet · REQ-001 · hypothesis', '## Workflow · WF-001', '## Work order WO-001', '## Requirements'].map((needle) => {
    const at = text.indexOf(needle);
    assert.ok(at >= 0, `package should contain "${needle}"`);
    return at;
  });
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'intent precedes process precedes specifics');
  assert.ok(text.includes('VISION-BODY'), 'vision body ships in full');
  assert.ok(text.includes('FOCUS-BODY'), 'focus body ships in full');
});

test('the bet is stated with metric and target for a hypothesis-implementing work order (REQ-039)', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-intent-bet-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeIntentProject(dir, 'accepted');
  const { text } = await assembleContext(dir, 'WO-001');
  assert.match(text, /This work order tests \[\[REQ-001\]\] — The activation bet\. Confirm or refute: activation-rate > 40%\./);
});

test('draft singletons never enter a package (REQ-039)', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-intent-draft-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeIntentProject(dir, 'draft');
  const { text } = await assembleContext(dir, 'WO-001');
  assert.ok(text.includes('VISION-BODY'), 'the accepted vision still ships');
  assert.ok(!text.includes('FOCUS-BODY'), 'the draft focus must not ship');
  assert.ok(!text.includes('PRD-002'), 'the draft focus must not be named anywhere');
});
