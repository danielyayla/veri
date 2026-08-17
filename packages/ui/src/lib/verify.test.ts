import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RuntimeProbe } from './noderuntime.ts';
import { preflight, runHandshake, verifyConnection } from './verify.ts';

const USABLE: RuntimeProbe = { found: true, path: process.execPath, version: 'v22.0.0', usable: true };

test('preflight names A/B/C without spawning', () => {
  const missing: RuntimeProbe = { found: false, path: null, version: null, usable: false };
  assert.deepEqual(preflight(missing, '/x/server.js', true), { kind: 'missing-runtime' });

  const old: RuntimeProbe = { found: true, path: '/usr/local/bin/node', version: 'v18.19.0', usable: false };
  assert.deepEqual(preflight(old, '/x/server.js', true), {
    kind: 'runtime-too-old',
    version: 'v18.19.0',
    path: '/usr/local/bin/node',
  });

  assert.deepEqual(preflight(USABLE, '/x/server.js', false), { kind: 'server-missing', path: '/x/server.js' });
  assert.equal(preflight(USABLE, '/x/server.js', true), null);
});

/** A stand-in MCP server: answers initialize, tools/list, and search over
    newline-delimited JSON-RPC — enough to exercise the handshake. */
const FAKE_SERVER = `
process.stdin.setEncoding('utf8');
let buf = '';
process.stdin.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    if (line.trim() === '') continue;
    const msg = JSON.parse(line);
    if (msg.id === undefined) continue;
    let result;
    if (msg.method === 'initialize') result = { serverInfo: { name: 'fake' } };
    else if (msg.method === 'tools/list') result = { tools: [{ name: 'get_context' }, { name: 'search' }, { name: 'file_decision' }, { name: 'file_receipt' }] };
    else result = { content: [{ type: 'text', text: 'REQ-001 — some requirement' }] };
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\\n');
  }
});
`;

async function fixture(script: string): Promise<{ dir: string; server: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'veri-verify-'));
  const server = join(dir, 'server.js');
  await writeFile(server, script);
  return { dir, server };
}

test('handshake succeeds and the search answer proves the doc id', async () => {
  const { dir, server } = await fixture(FAKE_SERVER);
  const result = await runHandshake(process.execPath, server, dir, 'REQ-001');
  assert.deepEqual(result, { ok: true, toolCount: 4, searchProved: true });
});

test('a search miss and a skipped search both come back unproved', async () => {
  const { dir, server } = await fixture(FAKE_SERVER);
  const miss = await runHandshake(process.execPath, server, dir, 'ZZZ-999');
  assert.deepEqual(miss, { ok: true, toolCount: 4, searchProved: false });
  const skipped = await runHandshake(process.execPath, server, dir, null);
  assert.deepEqual(skipped, { ok: true, toolCount: 4, searchProved: false });
});

test('a server that never answers times out with its stderr', async () => {
  const { dir, server } = await fixture('process.stderr.write("booting…"); setTimeout(() => {}, 30000);');
  const result = await runHandshake(process.execPath, server, dir, null, 500);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.stderr, 'booting…');
});

test('a server that exits immediately is a no-answer, not a hang', async () => {
  const { dir, server } = await fixture('process.stderr.write("bad arg"); process.exit(1);');
  const result = await runHandshake(process.execPath, server, dir, null, 5000);
  assert.equal(result.ok, false);
});

test('verifyConnection classifies wrong root only after the server answers', async () => {
  const { dir, server } = await fixture(FAKE_SERVER);
  const other = await mkdtemp(join(tmpdir(), 'veri-other-'));
  const wrong = await verifyConnection({ probe: USABLE, serverPath: server, rootPath: other, projectRoot: dir, searchId: null });
  assert.deepEqual(wrong, { kind: 'wrong-root', otherRoot: other });

  const ok = await verifyConnection({ probe: USABLE, serverPath: server, rootPath: dir, projectRoot: dir, searchId: 'REQ-001' });
  assert.deepEqual(ok, { kind: 'ok', nodeVersion: 'v22.0.0', toolCount: 4, searchProved: true });
});
