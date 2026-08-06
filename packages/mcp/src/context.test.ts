import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { assembleContext } from './context.ts';

const FIXTURE = fileURLToPath(new URL('../fixtures/superseded-chain', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

test('package contains conventions, work order, requirement, and active decision in order', async () => {
  const pkg = await assembleContext(FIXTURE, 'WO-001');
  const text = pkg.text;

  assert.match(text, /^# Context package · WO-001 — Render invoices to PDF/);
  assert.match(text, /\(\d+ docs · ~\d+ tokens\)/);

  for (const marker of ['TEST-CONVENTIONS-MARKER', 'WO-BODY-MARKER', 'REQ-BODY-MARKER', 'NEW-BODY-MARKER']) {
    assert.ok(text.includes(marker), `package should contain ${marker}`);
  }

  const order = [
    '## Project conventions (CLAUDE.md)',
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
  assert.ok(text.includes('## Project conventions (CLAUDE.md)'));
  assert.ok(docCount >= 4);
  assert.ok(totalTokens > 500);
});
