import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER = fileURLToPath(new URL('../dist/server.js', import.meta.url));
const FIXTURE = fileURLToPath(new URL('../fixtures/superseded-chain', import.meta.url));

interface RpcResponse {
  id?: number;
  result?: { tools?: Array<{ name: string }>; content?: Array<{ type: string; text: string }>; isError?: boolean };
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
  assert.deepEqual(toolNames, ['file_decision', 'file_receipt', 'get_context', 'search']);

  const context = responses.get(3)?.result;
  assert.ok(context && !context.isError, JSON.stringify(context));
  const text = context.content?.[0]?.text ?? '';
  assert.match(text, /# Context package · WO-001/);
  assert.ok(text.includes('REQ-BODY-MARKER'));
  assert.ok(text.includes('Already rejected'));

  const search = responses.get(4)?.result;
  assert.match(search?.content?.[0]?.text ?? '', /DEC-001\s+decision\s+active/);
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
