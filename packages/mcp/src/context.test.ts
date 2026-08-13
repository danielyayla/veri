import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { assembleContext } from './context.ts';
import { ASSEMBLY_POLICY, packingFor } from '@veri/core';

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

test('assembly is deterministic', async () => {
  const first = await assembleContext(FIXTURE, 'WO-001');
  const second = await assembleContext(FIXTURE, 'WO-001');
  assert.equal(first.text, second.text);
});

test('unknown ids and non-work-order ids are rejected', async () => {
  await assert.rejects(() => assembleContext(FIXTURE, 'WO-999'), /no document with id WO-999/);
  await assert.rejects(() => assembleContext(FIXTURE, 'REQ-001'), /expects a work order id/);
});

test("get_context on this repo's WO-003 includes REQ-003 and DEC-003 in full", async () => {
  const { text, docCount, totalTokens } = await assembleContext(REPO_ROOT, 'WO-003');
  assert.match(text, /### REQ-003 — MCP server assembles and serves context packages · accepted/);
  assert.match(text, /### DEC-003 — Receipts are per execution session/);
  assert.ok(text.includes('Sessions are the natural unit of agent work'), 'DEC-003 body should be present in full');
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

test('core assembly policy carries the values this package used to hardcode (DEC-025)', () => {
  assert.equal(ASSEMBLY_POLICY.workflow.include, 'always');
  assert.deepEqual(packingFor('work-order', 'in-progress'), { mode: 'full' });
  assert.deepEqual(packingFor('requirement', 'accepted'), { mode: 'full' });
  assert.deepEqual(packingFor('decision', 'active'), { mode: 'full' });
  assert.deepEqual(packingFor('decision', 'superseded'), { mode: 'name-only' });
  assert.deepEqual(packingFor('source', 'imported'), { mode: 'excerpt', chars: 600 });
});
