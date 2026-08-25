import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    tools?: Array<{ name: string; description?: string }>;
    content?: Array<{ type: string; text: string }>;
    isError?: boolean;
  };
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
  // appends receipts, and amend_document revises still-pending ones (DEC-103)
  // — no tool approves or promotes (REQ-017).
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
    'run_check',
    'search',
    'start_work_order',
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
