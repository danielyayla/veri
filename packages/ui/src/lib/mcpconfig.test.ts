import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixRootArg, mcpStatus, tildify, writeVeriEntry } from './mcpconfig.ts';

const SERVER = '/opt/veri/packages/mcp/dist/server.js';

async function project(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'veri-mcp-'));
  await mkdir(join(root, 'veri'));
  return root;
}

async function readJson(root: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(root, '.mcp.json'), 'utf8')) as Record<string, unknown>;
}

test('missing file, then no-entry, then conflict, then ok', async () => {
  const root = await project();
  assert.equal((await mcpStatus(root, SERVER)).state, 'missing');

  await writeFile(join(root, '.mcp.json'), JSON.stringify({ mcpServers: { other: {} } }));
  assert.equal((await mcpStatus(root, SERVER)).state, 'no-entry');

  await writeFile(
    join(root, '.mcp.json'),
    JSON.stringify({ mcpServers: { veri: { command: 'npx', args: ['-y', 'veri-mcp@0.2.1'] } } }),
  );
  const conflict = await mcpStatus(root, SERVER);
  assert.equal(conflict.state, 'conflict');
  assert.match(conflict.conflictJson ?? '', /npx/);

  await writeVeriEntry(root, SERVER);
  const ok = await mcpStatus(root, SERVER);
  assert.equal(ok.state, 'ok');
  assert.equal(ok.rootMatches, true);
});

test('unparseable file is surfaced and writes refuse to touch it', async () => {
  const root = await project();
  await writeFile(join(root, '.mcp.json'), '{ not json');
  const status = await mcpStatus(root, SERVER);
  assert.equal(status.state, 'unparseable');
  assert.equal(status.conflictJson, '{ not json');
  await assert.rejects(() => writeVeriEntry(root, SERVER), /not valid JSON/);
  assert.equal(await readFile(join(root, '.mcp.json'), 'utf8'), '{ not json');
});

test('setup writes the exact entry and preserves everything else in the file', async () => {
  const root = await project();
  const existing = {
    mcpServers: { linear: { command: 'npx', args: ['-y', 'linear-mcp'] } },
    customTopLevelKey: { keep: true },
  };
  await writeFile(join(root, '.mcp.json'), JSON.stringify(existing));
  await writeVeriEntry(root, SERVER);
  const config = await readJson(root);
  assert.deepEqual((config['mcpServers'] as Record<string, unknown>)['veri'], {
    command: 'node',
    args: [SERVER, root],
  });
  assert.deepEqual((config['mcpServers'] as Record<string, unknown>)['linear'], existing.mcpServers.linear);
  assert.deepEqual(config['customTopLevelKey'], existing.customTopLevelKey);
});

test('executable and root checks read the real disk, expanding ~', async () => {
  const root = await project();
  // A server path that exists (the veri/ dir itself) vs one that doesn't.
  await writeFile(
    join(root, '.mcp.json'),
    JSON.stringify({ mcpServers: { veri: { command: 'node', args: [join(root, 'veri'), '/Users/tom/dev/skiff'] } } }),
  );
  const status = await mcpStatus(root, SERVER);
  assert.equal(status.state, 'ok');
  assert.equal(status.executableFound, true);
  assert.equal(status.rootMatches, false);

  await writeFile(
    join(root, '.mcp.json'),
    JSON.stringify({ mcpServers: { veri: { command: 'node', args: ['~/no/such/server.js', root] } } }),
  );
  const tilde = await mcpStatus(root, SERVER);
  assert.equal(tilde.executableFound, false);
  assert.equal(tilde.rootMatches, true);
});

test('fixRootArg rewrites only the root argument of the veri entry', async () => {
  const root = await project();
  await writeFile(
    join(root, '.mcp.json'),
    JSON.stringify({
      mcpServers: {
        veri: { command: 'node', args: ['/somewhere/else/server.js', '/Users/tom/dev/skiff'] },
        linear: { command: 'npx', args: ['-y', 'linear-mcp'] },
      },
    }),
  );
  await fixRootArg(root);
  const config = await readJson(root);
  const veri = (config['mcpServers'] as Record<string, unknown>)['veri'];
  assert.deepEqual(veri, { command: 'node', args: ['/somewhere/else/server.js', root] });
  assert.notEqual((config['mcpServers'] as Record<string, unknown>)['linear'], undefined);
});

test('fixRootArg refuses when there is no recognized entry', async () => {
  const root = await project();
  await assert.rejects(() => fixRootArg(root), /no recognized veri entry/);
  await writeFile(join(root, '.mcp.json'), JSON.stringify({ mcpServers: { veri: { command: 'npx', args: [] } } }));
  await assert.rejects(() => fixRootArg(root), /no recognized veri entry/);
});

test('foreign shapes are conflicts, including extra keys on a node entry', async () => {
  const root = await project();
  await writeFile(
    join(root, '.mcp.json'),
    JSON.stringify({ mcpServers: { veri: { command: 'node', args: ['a', 'b'], env: { X: '1' } } } }),
  );
  assert.equal((await mcpStatus(root, SERVER)).state, 'conflict');
});

test('tildify abbreviates only paths under home', () => {
  assert.equal(tildify('/Users/dan/dev/skiff', '/Users/dan'), '~/dev/skiff');
  assert.equal(tildify('/Users/dan', '/Users/dan'), '~');
  assert.equal(tildify('/opt/veri', '/Users/dan'), '/opt/veri');
  assert.equal(tildify('/Users/danielle/x', '/Users/dan'), '/Users/danielle/x');
});
