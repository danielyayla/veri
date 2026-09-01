import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS_MD } from '@verikb/core';

const SERVER = fileURLToPath(new URL('../dist/server.js', import.meta.url));
const FIXTURE = fileURLToPath(new URL('../fixtures/superseded-chain', import.meta.url));

interface RpcResponse {
  id?: number;
  result?: {
    tools?: Array<{ name: string; description?: string; inputSchema?: { additionalProperties?: boolean } }>;
    content?: Array<{ type: string; text: string }>;
    isError?: boolean;
  };
  error?: { code: number; message: string };
}

/** Speak newline-delimited JSON-RPC to the server over stdio, as an MCP client would. */
async function rpcSession(requests: object[], expectIds: number[], root: string = FIXTURE): Promise<Map<number, RpcResponse>> {
  const child = spawn(process.execPath, [SERVER, root], { stdio: ['pipe', 'pipe', 'pipe'] });
  const responses = new Map<number, RpcResponse>();
  const done = new Promise<void>((resolvePromise, reject) => {
    let buffer = '';
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (line.trim() === '') continue;
        const message = JSON.parse(line) as RpcResponse;
        if (typeof message.id === 'number') responses.set(message.id, message);
        if (expectIds.every((id) => responses.has(id))) resolvePromise();
      }
    });
    child.on('error', reject);
    setTimeout(() => reject(new Error(`timed out; got responses for ids ${[...responses.keys()].join(',')}`)), 10_000);
  });
  for (const request of requests) child.stdin.write(`${JSON.stringify(request)}\n`);
  try {
    await done;
  } finally {
    child.kill();
  }
  return responses;
}

test('the built server answers tools/list and get_context over stdio', { skip: !existsSync(SERVER) }, async () => {
  const responses = await rpcSession(
    [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0.0.0' } },
      },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_context', arguments: { id: 'WO-001' } } },
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'search', arguments: { query: 'typst' } } },
    ],
    [1, 2, 3, 4],
  );

  const toolNames = (responses.get(2)?.result?.tools ?? []).map((tool) => tool.name).sort();
  // The complete write surface: file_* only creates unapproved documents or
  // appends receipts, amend_document revises still-pending ones (DEC-103),
  // init_project brings an absent knowledge base into being without touching an
  // existing one (WO-129), and supersede_decision retires a decision only once
  // the user has stamped its successor (WO-138) — no tool approves or promotes
  // (REQ-017).
  assert.deepEqual(toolNames, [
    'amend_document',
    'file_decision',
    'file_receipt',
    'file_requirement',
    'file_source',
    'file_work_order',
    'get_context',
    'get_document',
    'get_import_instructions',
    'get_intent',
    'get_neighbors',
    'get_queue',
    'get_receipts',
    'init_project',
    'list_documents',
    'run_check',
    'search',
    'start_work_order',
    'supersede_decision',
  ]);

  const context = responses.get(3)?.result;
  assert.ok(context && !context.isError, JSON.stringify(context));
  const text = context.content?.[0]?.text ?? '';
  assert.match(text, /# Context package · WO-001/);
  assert.ok(text.includes('REQ-BODY-MARKER'));
  assert.ok(text.includes('Already rejected'));

  const search = responses.get(4)?.result;
  // Ranked hits carry their score and matched fields (WO-090).
  assert.match(search?.content?.[0]?.text ?? '', /DEC-001\s+decision\s+active\s+.*\[score \d+ · [a-z,]+\]/);
});

// REQ-019's drift test, MCP side: the tool names scaffolded harness files
// instruct must exist on the live server, and get_context's description must
// match what assembly actually emits — both checked against the build.
test('scaffolded tool mentions and the get_context description match the build (REQ-019)', { skip: !existsSync(SERVER) }, async () => {
  const responses = await rpcSession(
    [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0.0.0' } },
      },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_context', arguments: { id: 'WO-001' } } },
    ],
    [1, 2, 3],
  );

  const tools = responses.get(2)?.result?.tools ?? [];
  const names = new Set(tools.map((tool) => tool.name));
  const instructed = [...new Set([...AGENTS_MD.matchAll(/`([a-z_]+)\(/g)].map((m) => m[1]!))];
  assert.ok(instructed.includes('get_context'), 'expected AGENTS.md to instruct get_context');
  for (const name of instructed) {
    assert.ok(names.has(name), `scaffolded AGENTS.md instructs ${name} but the server does not expose it`);
  }

  const description = tools.find((tool) => tool.name === 'get_context')?.description ?? '';
  const text = responses.get(3)?.result?.content?.[0]?.text ?? '';
  // Every section the real package emits is named in the description…
  const sections: Array<[RegExp, string]> = [
    [/^## Workflow · /m, 'workflow'],
    [/^## Work order /m, 'work order'],
    [/^## Requirements$/m, 'requirement'],
    [/^## Decisions$/m, 'decision'],
    [/^## Sources \(excerpts\)$/m, 'source'],
    [/^## Templates — /m, 'template'],
  ];
  for (const [emitted, term] of sections) {
    if (emitted.test(text)) {
      assert.ok(description.toLowerCase().includes(term), `package emits a section the description never names: ${term}`);
    }
  }
  // …the layered contract is described even when this corpus inlines…
  assert.ok(description.toLowerCase().includes('context map'), 'description must name the context map (DEC-035)');
  // …and nothing DEC-018 removed is still claimed.
  for (const stale of ['CLAUDE.md', 'conventions']) {
    assert.ok(!description.includes(stale), `description still claims "${stale}" — removed by DEC-018`);
  }
});

test('every tool states a newer format instead of operating (REQ-015)', { skip: !existsSync(SERVER) }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-format-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'veri', 'requirements'), { recursive: true });
  writeFileSync(join(root, 'veri', 'format'), '99\n');

  const responses = await rpcSession(
    [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0.0.0' } },
      },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'search', arguments: { query: 'x' } } },
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_context', arguments: { id: 'WO-001' } } },
    ],
    [1, 2, 3],
    root,
  );

  for (const id of [2, 3]) {
    const result = responses.get(id)?.result;
    assert.equal(result?.isError, true, `tool call ${id} must refuse`);
    assert.match(result?.content?.[0]?.text ?? '', /format 99.*update Veri/);
  }
});

test('start_work_order flips a ready work order and records the claim (WO-099)', { skip: !existsSync(SERVER) }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-start-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'veri', 'requirements'), { recursive: true });
  mkdirSync(join(root, 'veri', 'work-orders'), { recursive: true });
  writeFileSync(
    join(root, 'veri', 'requirements', 'REQ-001-req.md'),
    '---\nid: REQ-001\ntype: requirement\ntitle: R\nstatus: accepted\ncreated: 2026-08-01\nupdated: 2026-08-01\napproved: 2026-08-01\n---\n## Acceptance criteria\n\n- [ ] x\n',
  );
  writeFileSync(
    join(root, 'veri', 'work-orders', 'WO-001-work.md'),
    '---\nid: WO-001\ntype: work-order\ntitle: W\nstatus: ready\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\nlinks:\n  - id: REQ-001\n    rel: implements\n---\n## Summary\n\nWork.\n\n## Receipts\n\n(none yet)\n',
  );

  const call = (id: number, args: object): object => ({
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name: 'start_work_order', arguments: args },
  });
  const init = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0.0.0' } },
  };
  const initialized = { jsonrpc: '2.0', method: 'notifications/initialized' };
  const responses = await rpcSession([init, initialized, call(2, { id: 'WO-001', claimed_by: 'agent-session-1' })], [1, 2], root);
  // A second session's claim on the now-held work order is refused, naming
  // the holder — the collision guard. A fresh server, as a second concurrent
  // agent session would be.
  const second = await rpcSession([init, initialized, call(3, { id: 'WO-001', claimed_by: 'agent-session-2' })], [1, 3], root);

  const started = responses.get(2)?.result;
  assert.ok(started?.isError !== true, started?.content?.[0]?.text);
  assert.match(started?.content?.[0]?.text ?? '', /WO-001 ready → in-progress — claimed by agent-session-1/);
  const file = readFileSync(join(root, 'veri', 'work-orders', 'WO-001-work.md'), 'utf8');
  assert.match(file, /^status: in-progress\nclaimed_by: agent-session-1\nclaimed_at: \d{4}-\d{2}-\d{2}$/m);

  const refused = second.get(3)?.result;
  assert.equal(refused?.isError, true);
  assert.match(refused?.content?.[0]?.text ?? '', /already in-progress, claimed by "agent-session-1"/);
});

// The DEC-112 incident (WO-118): a filing call carrying a section under a key
// the schema does not declare must be refused naming the key — zod's default
// strip mode silently discarded it, the call succeeded, and the document
// landed with only the Choice section. Same class as the WO-100 body-drop.
test('write tools refuse unknown argument keys instead of silently dropping content (WO-118)', { skip: !existsSync(SERVER) }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-strict-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'veri', 'decisions'), { recursive: true });

  const init = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0.0.0' } },
  };
  const initialized = { jsonrpc: '2.0', method: 'notifications/initialized' };
  const responses = await rpcSession(
    [
      init,
      initialized,
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'file_decision',
          // rejected_alternatives and rationale misspelled, as an agent or a
          // host with a stale tool schema would send them.
          arguments: {
            title: 'Strictness repro',
            choice: 'The chosen thing.',
            alternatives_rejected: '- **Alt A** — too slow',
            reasoning: 'Because reasons.',
          },
        },
      },
      { jsonrpc: '2.0', id: 3, method: 'tools/list' },
      {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'file_decision',
          arguments: {
            title: 'Fully specified',
            choice: 'The chosen thing.',
            rejected_alternatives: '- **Alt A** — too slow',
            rationale: 'Because reasons.',
          },
        },
      },
    ],
    [1, 2, 3, 4],
    root,
  );

  // The misspelled call is refused, naming the keys it did not recognize —
  // never a success that silently drops the content.
  const refused = responses.get(2)?.result;
  assert.equal(refused?.isError, true, `unknown keys must be a validation error, got: ${JSON.stringify(refused)}`);
  const refusal = refused?.content?.[0]?.text ?? '';
  assert.match(refusal, /alternatives_rejected/);
  assert.match(refusal, /reasoning/);
  // The correctly-keyed call (sent after the refused one) persists every
  // provided section — and lands as DEC-001, proving the refused call wrote
  // nothing and consumed no id.
  const filed = responses.get(4)?.result;
  assert.ok(filed && filed.isError !== true, JSON.stringify(filed));
  const written = readdirSync(join(root, 'veri', 'decisions'));
  assert.deepEqual(written, ['DEC-001-fully-specified.md']);
  const content = readFileSync(join(root, 'veri', 'decisions', written[0]!), 'utf8');
  assert.match(content, /## Choice\n\nThe chosen thing\./);
  assert.match(content, /## Rejected alternatives\n\n- \*\*Alt A\*\* — too slow/);
  assert.match(content, /## Rationale\n\nBecause reasons\./);

  // Every write tool advertises the strictness, so compliant hosts refuse
  // near-miss keys client-side too.
  const writeTools = ['file_decision', 'file_work_order', 'file_requirement', 'file_source', 'file_receipt', 'amend_document', 'start_work_order', 'supersede_decision'];
  const tools = responses.get(3)?.result?.tools ?? [];
  for (const name of writeTools) {
    const tool = tools.find((entry) => entry.name === name);
    assert.ok(tool, `tools/list must include ${name}`);
    assert.equal(tool.inputSchema?.additionalProperties, false, `${name} must advertise additionalProperties: false`);
  }
});

test('amend_document revises a backlog work order and refuses past the approval boundary (WO-100)', { skip: !existsSync(SERVER) }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-amend-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'veri', 'requirements'), { recursive: true });
  mkdirSync(join(root, 'veri', 'work-orders'), { recursive: true });
  writeFileSync(
    join(root, 'veri', 'requirements', 'REQ-001-req.md'),
    '---\nid: REQ-001\ntype: requirement\ntitle: R\nstatus: accepted\ncreated: 2026-08-01\nupdated: 2026-08-01\napproved: 2026-08-01\n---\n## Acceptance criteria\n\n- [ ] x\n',
  );
  writeFileSync(
    join(root, 'veri', 'work-orders', 'WO-001-work.md'),
    '---\nid: WO-001\ntype: work-order\ntitle: W\nstatus: backlog\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\n## Summary\n\nWork.\n\n## Receipts\n\n(none yet)\n',
  );

  const call = (id: number, args: object): object => ({
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name: 'amend_document', arguments: args },
  });
  const init = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0.0.0' } },
  };
  const initialized = { jsonrpc: '2.0', method: 'notifications/initialized' };
  const responses = await rpcSession(
    [
      init,
      initialized,
      call(2, {
        id: 'WO-001',
        title: 'W, re-scoped',
        body: '## Summary\n\nRevised after review.',
        links: [{ id: 'REQ-001', rel: 'implements' }],
      }),
      call(3, { id: 'REQ-001', title: 'Rewritten canon' }),
    ],
    [1, 2, 3],
    root,
  );

  const amended = responses.get(2)?.result;
  assert.ok(amended?.isError !== true, amended?.content?.[0]?.text);
  assert.match(amended?.content?.[0]?.text ?? '', /Amended WO-001 .* still pending the user's review/);
  const file = readFileSync(join(root, 'veri', 'work-orders', 'WO-001-work.md'), 'utf8');
  assert.match(file, /^title: "W, re-scoped"$/m);
  assert.match(file, /^status: backlog$/m); // never a promotion
  assert.match(file, /Revised after review/);
  assert.match(file, /## Receipts\n\n\(none yet\)/); // carried over verbatim

  const refused = responses.get(3)?.result;
  assert.equal(refused?.isError, true);
  assert.match(refused?.content?.[0]?.text ?? '', /past the approval boundary \(REQ-008\)/);
});

test('list_documents and get_queue enumerate over the wire and refuse unknown keys (WO-127)', { skip: !existsSync(SERVER) }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-enumerate-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'veri', 'requirements'), { recursive: true });
  mkdirSync(join(root, 'veri', 'work-orders'), { recursive: true });
  writeFileSync(
    join(root, 'veri', 'requirements', 'REQ-001-req.md'),
    '---\nid: REQ-001\ntype: requirement\ntitle: R\nstatus: accepted\ncreated: 2026-08-01\nupdated: 2026-08-01\napproved: 2026-08-01\n---\n## Acceptance criteria\n\n- [ ] x\n',
  );
  const workOrder = (id: string, title: string, status: string, extra: string): string =>
    `---\nid: ${id}\ntype: work-order\ntitle: ${title}\nstatus: ${status}\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\n${extra}links:\n  - id: REQ-001\n    rel: implements\n---\n## Summary\n\nWork.\n`;
  writeFileSync(join(root, 'veri', 'work-orders', 'WO-002-head.md'), workOrder('WO-002', 'Head', 'ready', ''));
  writeFileSync(join(root, 'veri', 'work-orders', 'WO-010-next.md'), workOrder('WO-010', 'Next', 'ready', ''));
  writeFileSync(
    join(root, 'veri', 'work-orders', 'WO-003-held.md'),
    workOrder('WO-003', 'Held', 'in-progress', 'claimed_by: session-alpha\nclaimed_at: 2026-08-25\n'),
  );

  const call = (id: number, name: string, args: object): object => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });
  const init = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0.0.0' } },
  };
  const initialized = { jsonrpc: '2.0', method: 'notifications/initialized' };
  const responses = await rpcSession(
    [
      init,
      initialized,
      call(2, 'list_documents', { type: 'work-order', status: 'ready' }),
      call(3, 'get_queue', {}),
      // A near-miss key must refuse, never silently widen the answer (WO-118).
      call(4, 'list_documents', { doc_type: 'work-order' }),
      call(5, 'get_queue', { status: 'ready' }),
      call(6, 'list_documents', { status: 'nonsense' }),
      { jsonrpc: '2.0', id: 7, method: 'tools/list' },
    ],
    [1, 2, 3, 4, 5, 6, 7],
    root,
  );

  const listed = responses.get(2)?.result;
  assert.ok(listed && listed.isError !== true, JSON.stringify(listed));
  const listText = listed.content?.[0]?.text ?? '';
  assert.match(listText, /^2 documents:\nWO-002 {2}work-order {2}ready {2}updated 2026-08-01 {2}veri\/work-orders\/WO-002-head\.md {2}Head$/m);
  assert.ok(!listText.includes('WO-003'), 'the status filter must narrow, not annotate');

  const queue = responses.get(3)?.result;
  assert.ok(queue && queue.isError !== true, JSON.stringify(queue));
  const queueLines = (queue.content?.[0]?.text ?? '').split('\n');
  assert.equal(queueLines[0], 'Ready (2) — dispatch order, head first:');
  assert.match(queueLines[1] ?? '', /^WO-002 {2}veri\/work-orders\/WO-002-head\.md {2}Head$/);
  assert.match(queue.content?.[0]?.text ?? '', /WO-003 {2}claimed by session-alpha since 2026-08-25/);

  for (const [id, key] of [[4, 'doc_type'] as const, [5, 'status'] as const]) {
    const refused = responses.get(id)?.result;
    assert.equal(refused?.isError, true, `unknown key ${key} must be a validation error, got: ${JSON.stringify(refused)}`);
    assert.match(refused?.content?.[0]?.text ?? '', new RegExp(key));
  }
  // An unknown status is refused too — a filter matching nothing would read
  // as "the corpus has none of those", which is a lie (DEC-058's posture).
  assert.equal(responses.get(6)?.result?.isError, true);

  const tools = responses.get(7)?.result?.tools ?? [];
  for (const name of ['list_documents', 'get_queue']) {
    assert.equal(tools.find((entry) => entry.name === name)?.inputSchema?.additionalProperties, false, `${name} must advertise additionalProperties: false`);
  }
});

test('get_receipts answers over the wire, by id and corpus-wide, and refuses unknown keys (WO-128)', { skip: !existsSync(SERVER) }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-receipts-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'veri', 'requirements'), { recursive: true });
  mkdirSync(join(root, 'veri', 'work-orders'), { recursive: true });
  writeFileSync(
    join(root, 'veri', 'requirements', 'REQ-001-req.md'),
    '---\nid: REQ-001\ntype: requirement\ntitle: R\nstatus: accepted\ncreated: 2026-08-01\nupdated: 2026-08-01\napproved: 2026-08-01\n---\n## Acceptance criteria\n\n- [ ] x\n',
  );
  const workOrder = (id: string, title: string, status: string, receipts: string[]): string =>
    `---\nid: ${id}\ntype: work-order\ntitle: ${title}\nstatus: ${status}\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\nlinks:\n  - id: REQ-001\n    rel: implements\n---\n## Summary\n\nWork.\n\n## Receipts\n\n${receipts.map((entry) => `- ${entry}`).join('\n')}\n`;
  writeFileSync(
    join(root, 'veri', 'work-orders', 'WO-002-shipped.md'),
    workOrder('WO-002', 'Shipped', 'done', ['2026-08-20 — aaaa111 — packages/core/src/thing.ts — did the thing', '2026-08-21 — bbbb222 — README.md — wrote it down']),
  );
  writeFileSync(join(root, 'veri', 'work-orders', 'WO-003-also.md'), workOrder('WO-003', 'Also shipped', 'done', ['2026-08-22 — cccc333 — packages/cli/src/cli.ts — shipped the flag']));
  writeFileSync(join(root, 'veri', 'work-orders', 'WO-010-pending.md'), workOrder('WO-010', 'Nothing yet', 'ready', ['(none yet)']).replace('- (none yet)', '(none yet)'));

  const call = (id: number, name: string, args: object): object => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });
  const responses = await rpcSession(
    [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0.0.0' } },
      },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      call(2, 'get_receipts', { id: 'WO-002' }),
      call(3, 'get_receipts', {}),
      // An unknown id is a question with an answer, not a fault.
      call(4, 'get_receipts', { id: 'WO-999' }),
      // A near-miss key must refuse, never silently widen the answer (WO-118).
      call(5, 'get_receipts', { work_order: 'WO-002' }),
      { jsonrpc: '2.0', id: 6, method: 'tools/list' },
    ],
    [1, 2, 3, 4, 5, 6],
    root,
  );

  const one = responses.get(2)?.result;
  assert.ok(one && one.isError !== true, JSON.stringify(one));
  const oneText = one.content?.[0]?.text ?? '';
  assert.match(oneText, /^2 receipts across 1 work order \(SHAs as filed/m);
  assert.match(oneText, /^WO-002 {2}2026-08-20 {2}aaaa111 {2}packages\/core\/src\/thing\.ts — did the thing$/m);
  assert.ok(!oneText.includes('WO-003'), 'an id narrows to that work order');

  const all = responses.get(3)?.result;
  assert.ok(all && all.isError !== true, JSON.stringify(all));
  const allText = all.content?.[0]?.text ?? '';
  assert.match(allText, /^3 receipts across 2 work orders \(SHAs as filed/m);
  assert.match(allText, /^WO-003 {2}2026-08-22 {2}cccc333 {2}packages\/cli\/src\/cli\.ts — shipped the flag$/m);
  // A work order that has filed none is simply absent, never an empty row.
  assert.ok(!allText.includes('WO-010'));

  const unknown = responses.get(4)?.result;
  assert.equal(unknown?.isError, undefined);
  assert.match(unknown?.content?.[0]?.text ?? '', /^no receipts for WO-999 —/);

  const refused = responses.get(5)?.result;
  assert.equal(refused?.isError, true, `unknown key must be a validation error, got: ${JSON.stringify(refused)}`);
  assert.match(refused?.content?.[0]?.text ?? '', /work_order/);

  const tools = responses.get(6)?.result?.tools ?? [];
  assert.equal(tools.find((entry) => entry.name === 'get_receipts')?.inputSchema?.additionalProperties, false, 'get_receipts must advertise additionalProperties: false');
});

test('init_project opens on a bare repo, refuses a second time, and refuses unknown keys (WO-129)', { skip: !existsSync(SERVER) }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-init-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'package.json'), '{}\n'); // a repo with code but no veri/

  const init = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0.0.0' } },
  };
  const initialized = { jsonrpc: '2.0', method: 'notifications/initialized' };
  const call = (id: number, name: string, args: object): object => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });

  // Before: the server boots on a bare repo and lists its tools, but every
  // loadProject-backed tool can only say there is nothing here.
  const before = await rpcSession(
    [init, initialized, { jsonrpc: '2.0', id: 2, method: 'tools/list' }, call(3, 'get_receipts', {}), call(4, 'init_project', { dir: '.' })],
    [1, 2, 3, 4],
    root,
  );
  const tools = before.get(2)?.result?.tools ?? [];
  assert.equal(tools.find((entry) => entry.name === 'init_project')?.inputSchema?.additionalProperties, false, 'init_project must advertise additionalProperties: false');
  const bare = before.get(3)?.result;
  assert.equal(bare?.isError, true);
  assert.match(bare?.content?.[0]?.text ?? '', /no veri\/ directory/);
  // A near-miss key must refuse, never be dropped into a default that
  // scaffolds somewhere the caller did not name (WO-118).
  const misspelled = before.get(4)?.result;
  assert.equal(misspelled?.isError, true, `unknown key must be a validation error, got: ${JSON.stringify(misspelled)}`);
  assert.match(misspelled?.content?.[0]?.text ?? '', /dir/);
  assert.ok(!existsSync(join(root, 'veri')), 'a refused call must create nothing');

  // The door: one call, and the knowledge base exists. A second call refuses.
  const after = await rpcSession([init, initialized, call(2, 'init_project', {}), call(3, 'init_project', {})], [1, 2, 3], root);
  const created = after.get(2)?.result;
  assert.ok(created && created.isError !== true, JSON.stringify(created));
  const text = created.content?.[0]?.text ?? '';
  assert.match(text, /^Initialized veri — 1 document/);
  assert.match(text, /^Wrote AGENTS\.md/m);
  assert.ok(existsSync(join(root, 'veri', 'workflow.md')) && existsSync(join(root, 'AGENTS.md')));
  assert.equal(readFileSync(join(root, 'package.json'), 'utf8'), '{}\n');

  const refused = after.get(3)?.result;
  assert.equal(refused?.isError, true);
  assert.match(refused?.content?.[0]?.text ?? '', /veri\/ already exists in .* — nothing was created/);

  // And now the tools that needed a knowledge base answer, same server root.
  const usable = await rpcSession([init, initialized, call(2, 'get_receipts', {})], [1, 2], root);
  assert.equal(usable.get(2)?.result?.isError, undefined);
  assert.match(usable.get(2)?.result?.content?.[0]?.text ?? '', /^no receipts —/);
});

test('file_requirement files a hypothesis over the wire and still refuses unknown keys (REQ-032, WO-137)', { skip: !existsSync(SERVER) }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-hypothesis-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'veri', 'requirements'), { recursive: true });

  const call = (id: number, args: object): object => ({
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name: 'file_requirement', arguments: args },
  });
  const init = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0.0.0' } },
  };
  const responses = await rpcSession(
    [
      init,
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      call(2, {
        title: 'The project map speeds activation',
        body: 'Showing the map during onboarding gets people to their first success sooner.',
        kind: 'hypothesis',
        outcome: { metric: 'time-to-first-success', target: '< 5 minutes' },
      }),
      call(3, { title: 'A bet with no terms', body: 'We think this helps.', kind: 'hypothesis' }),
      call(4, { title: 'Smuggled', body: 'x', status: 'accepted' }),
    ],
    [1, 2, 3, 4],
    root,
  );

  const filed = responses.get(2)?.result;
  assert.ok(filed?.isError !== true, filed?.content?.[0]?.text);
  const written = readdirSync(join(root, 'veri', 'requirements')).map((name) =>
    readFileSync(join(root, 'veri', 'requirements', name), 'utf8'),
  );
  const bet = written.find((text) => /^title: "The project map speeds activation"$/m.test(text));
  assert.ok(bet, 'the hypothesis should have been written');
  assert.match(bet, /^kind: hypothesis$/m);
  assert.match(bet, /^outcome:\n {2}metric: "time-to-first-success"\n {2}target: "< 5 minutes"$/m);
  assert.match(bet, /^status: draft$/m);

  // A bet with no terms files — and is told, in the same breath, that it is
  // a check violation. Visible, never silently a constraint (REQ-032).
  const bare = responses.get(3)?.result;
  assert.ok(bare?.isError !== true, bare?.content?.[0]?.text);
  assert.match(bare?.content?.[0]?.text ?? '', /hypothesis with no declared outcome/);

  // The schema is still strict: status is not a field an agent may send.
  const smuggled = responses.get(4)?.result;
  assert.equal(smuggled?.isError, true);
});

test('supersede_decision retires an active decision and refuses an unapproved successor (WO-138)', { skip: !existsSync(SERVER) }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-supersede-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'veri', 'decisions'), { recursive: true });
  const decision = (id: string, status: string): string =>
    `---\nid: ${id}\ntype: decision\ntitle: ${id}\nstatus: ${status}\n${status === 'proposed' ? '' : 'approved: 2026-08-02\n'}created: 2026-08-01\nupdated: 2026-08-02\n---\n\n## Choice\n\nThe choice, kept verbatim.\n`;
  writeFileSync(join(root, 'veri', 'decisions', 'DEC-001-old.md'), decision('DEC-001', 'active'));
  writeFileSync(join(root, 'veri', 'decisions', 'DEC-002-new.md'), decision('DEC-002', 'active'));
  writeFileSync(join(root, 'veri', 'decisions', 'DEC-003-pending.md'), decision('DEC-003', 'proposed'));

  const call = (id: number, args: object): object => ({
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name: 'supersede_decision', arguments: args },
  });
  const responses = await rpcSession(
    [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0.0.0' } },
      },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      call(2, { id: 'DEC-001', superseded_by: 'DEC-003' }),
      call(3, { id: 'DEC-001', superseded_by: 'DEC-002' }),
      call(4, { id: 'DEC-002', superseded_by: 'DEC-001', status: 'superseded' }),
    ],
    [1, 2, 3, 4],
    root,
  );

  // An unapproved successor has no downstream power (REQ-008), so the flip is
  // refused. (That it leaves the file untouched is asserted in the core suite,
  // where the calls are not batched into one session.)
  const refused = responses.get(2)?.result;
  assert.equal(refused?.isError, true);
  assert.match(refused?.content?.[0]?.text ?? '', /DEC-003 is proposed, not active — approve it first/);

  const done = responses.get(3)?.result;
  assert.ok(done?.isError !== true, done?.content?.[0]?.text);
  const flipped = readFileSync(join(root, 'veri', 'decisions', 'DEC-001-old.md'), 'utf8');
  assert.match(flipped, /^status: superseded\nsuperseded_by: DEC-002$/m);
  assert.match(flipped, /## Choice\n\nThe choice, kept verbatim\./); // the body is history, kept

  // The schema is strict: no status field rides in on this tool either.
  assert.equal(responses.get(4)?.result?.isError, true);
});
