import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS_MD } from '@veri/core';

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
  // appends receipts — no tool approves, promotes, or edits a body (REQ-017).
  assert.deepEqual(toolNames, [
    'file_decision',
    'file_receipt',
    'file_requirement',
    'file_source',
    'file_work_order',
    'get_context',
    'get_document',
    'get_import_instructions',
    'get_neighbors',
    'run_check',
    'search',
  ]);

  const context = responses.get(3)?.result;
  assert.ok(context && !context.isError, JSON.stringify(context));
  const text = context.content?.[0]?.text ?? '';
  assert.match(text, /# Context package · WO-001/);
  assert.ok(text.includes('REQ-BODY-MARKER'));
  assert.ok(text.includes('Already rejected'));

  const search = responses.get(4)?.result;
  assert.match(search?.content?.[0]?.text ?? '', /DEC-001\s+decision\s+active/);
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
