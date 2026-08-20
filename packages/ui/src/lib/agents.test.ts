import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, readdir, utimes, writeFile } from 'node:fs/promises';
import { chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { cleanupLaunchScripts, connectAgent, detectAgents } from './agents.ts';
import type { AgentEnv } from './agents.ts';

const SERVER = '/opt/veri/packages/mcp/dist/server.js';

async function fixture(): Promise<{ root: string; env: AgentEnv; bin: string }> {
  const base = await mkdtemp(join(tmpdir(), 'veri-agents-'));
  const root = join(base, 'project');
  const bin = join(base, 'bin');
  const home = join(base, 'home');
  await mkdir(root, { recursive: true });
  await mkdir(bin, { recursive: true });
  await mkdir(home, { recursive: true });
  return { root, env: { path: bin, home }, bin };
}

async function installBin(dir: string, name: string): Promise<void> {
  const file = join(dir, name);
  await writeFile(file, '#!/bin/sh\n');
  await chmod(file, 0o755);
}

test('nothing installed: every adapter is not-installed and never launchable', async () => {
  const { root, env } = await fixture();
  const agents = await detectAgents(root, env);
  assert.equal(agents.length, 4);
  for (const a of agents) {
    assert.equal(a.status, 'not-installed');
    assert.equal(a.binPath, null);
  }
});

test('detected binary with no config is not-connected; connect writes it; redetect is connected', async () => {
  const { root, env, bin } = await fixture();
  await installBin(bin, 'claude');
  await installBin(bin, 'cursor-agent');

  let agents = await detectAgents(root, env);
  const claude = agents.find((a) => a.id === 'claude')!;
  assert.equal(claude.status, 'not-connected');
  assert.equal(claude.binPath, join(bin, 'claude'));
  assert.equal(agents.find((a) => a.id === 'codex')!.status, 'not-installed');

  await connectAgent(root, SERVER, 'claude', env);
  await connectAgent(root, SERVER, 'cursor', env);

  agents = await detectAgents(root, env);
  assert.equal(agents.find((a) => a.id === 'claude')!.status, 'connected');
  assert.equal(agents.find((a) => a.id === 'cursor')!.status, 'connected');

  const mcpJson = JSON.parse(await readFile(join(root, '.mcp.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
  };
  assert.deepEqual(mcpJson.mcpServers['veri'], { command: 'node', args: [SERVER, resolve(root)] });
  const cursorJson = JSON.parse(await readFile(join(root, '.cursor', 'mcp.json'), 'utf8')) as {
    mcpServers: Record<string, unknown>;
  };
  assert.deepEqual(cursorJson.mcpServers['veri'], { command: 'node', args: [SERVER, resolve(root)] });
});

test('foreign veri entry is a conflict and connect refuses to overwrite it (DEC-011)', async () => {
  const { root, env, bin } = await fixture();
  await installBin(bin, 'claude');
  const foreign = { mcpServers: { veri: { command: 'npx', args: ['-y', 'veri-mcp'] } } };
  await writeFile(join(root, '.mcp.json'), JSON.stringify(foreign));

  const agents = await detectAgents(root, env);
  assert.equal(agents.find((a) => a.id === 'claude')!.status, 'conflict');

  await assert.rejects(() => connectAgent(root, SERVER, 'claude', env), /left untouched/);
  assert.deepEqual(JSON.parse(await readFile(join(root, '.mcp.json'), 'utf8')), foreign);
});

test('connect preserves other servers and unrelated keys', async () => {
  const { root, env } = await fixture();
  const existing = {
    mcpServers: { linear: { command: 'npx', args: ['-y', 'linear-mcp'] } },
    theme: 'dark',
  };
  await mkdir(join(root, '.gemini'), { recursive: true });
  await writeFile(join(root, '.gemini', 'settings.json'), JSON.stringify(existing));
  await connectAgent(root, SERVER, 'gemini', env);
  const config = JSON.parse(await readFile(join(root, '.gemini', 'settings.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  assert.equal(config['theme'], 'dark');
  const servers = config['mcpServers'] as Record<string, unknown>;
  assert.deepEqual(servers['linear'], existing.mcpServers.linear);
  assert.deepEqual(servers['veri'], { command: 'node', args: [SERVER, resolve(root)] });
});

test('codex TOML: append when absent, recognize own block, refuse foreign block', async () => {
  const { root, env, bin } = await fixture();
  await installBin(bin, 'codex');
  const file = join(env.home, '.codex', 'config.toml');

  // absent config → not-connected → connect appends, keeping existing content
  await mkdir(join(env.home, '.codex'), { recursive: true });
  await writeFile(file, 'model = "o4"\n\n[mcp_servers.linear]\ncommand = "npx"\nargs = ["-y", "linear"]\n');
  assert.equal((await detectAgents(root, env)).find((a) => a.id === 'codex')!.status, 'not-connected');

  await connectAgent(root, SERVER, 'codex', env);
  const text = await readFile(file, 'utf8');
  assert.match(text, /^model = "o4"/);
  assert.match(text, /\[mcp_servers\.linear\]/);
  assert.match(text, /\[mcp_servers\.veri\]\ncommand = "node"\nargs = \[.*server\.js.*\]/);
  assert.equal((await detectAgents(root, env)).find((a) => a.id === 'codex')!.status, 'connected');

  // connect again is a no-op
  await connectAgent(root, SERVER, 'codex', env);
  assert.equal(await readFile(file, 'utf8'), text);

  // a veri section Veri didn't write → conflict, refused
  await writeFile(file, '[mcp_servers.veri]\ncommand = "docker"\nargs = ["run", "veri"]\n');
  assert.equal((await detectAgents(root, env)).find((a) => a.id === 'codex')!.status, 'conflict');
  await assert.rejects(() => connectAgent(root, SERVER, 'codex', env), /left untouched/);
});

test('codex TOML: a block set up from another project is stale — not-connected, and connect re-points it in place (WO-071)', async () => {
  const { root, env, bin } = await fixture();
  await installBin(bin, 'codex');
  const otherRoot = `${root}-other`;
  const file = join(env.home, '.codex', 'config.toml');
  await mkdir(join(env.home, '.codex'), { recursive: true });
  const before =
    `model = "o4"\n\n[mcp_servers.veri]\ncommand = "node"\nargs = ["/old/server.js", "${resolve(otherRoot)}"]\n\n` +
    '[mcp_servers.linear]\ncommand = "npx"\nargs = ["-y", "linear"]\n';
  await writeFile(file, before);

  // recognized shape, wrong root: Veri's own stale entry, not connected here
  assert.equal((await detectAgents(root, env)).find((a) => a.id === 'codex')!.status, 'not-connected');

  await connectAgent(root, SERVER, 'codex', env);
  const text = await readFile(file, 'utf8');
  assert.equal(text.match(/\[mcp_servers\.veri\]/g)!.length, 1);
  assert.equal(
    text,
    `model = "o4"\n\n[mcp_servers.veri]\ncommand = "node"\nargs = ["${SERVER}", "${resolve(root)}"]\n\n` +
      '[mcp_servers.linear]\ncommand = "npx"\nargs = ["-y", "linear"]\n',
  );
  assert.equal((await detectAgents(root, env)).find((a) => a.id === 'codex')!.status, 'connected');
  // and viewed from the project it used to point at, it now reads stale
  assert.equal((await detectAgents(otherRoot, env)).find((a) => a.id === 'codex')!.status, 'not-connected');
});

test('json config: recognized entry with a foreign root is not-connected; a relative root resolving here stays connected (WO-071)', async () => {
  const { root, env, bin } = await fixture();
  await installBin(bin, 'claude');
  const stale = { mcpServers: { veri: { command: 'node', args: [SERVER, `${resolve(root)}-elsewhere`] } } };
  await writeFile(join(root, '.mcp.json'), JSON.stringify(stale));
  assert.equal((await detectAgents(root, env)).find((a) => a.id === 'claude')!.status, 'not-connected');

  const relative = { mcpServers: { veri: { command: 'node', args: ['packages/mcp/dist/server.js', '.'] } } };
  await writeFile(join(root, '.mcp.json'), JSON.stringify(relative));
  assert.equal((await detectAgents(root, env)).find((a) => a.id === 'claude')!.status, 'connected');
});

test('unparseable JSON config is a conflict and never written', async () => {
  const { root, env, bin } = await fixture();
  await installBin(bin, 'claude');
  await writeFile(join(root, '.mcp.json'), '{ not json');
  assert.equal((await detectAgents(root, env)).find((a) => a.id === 'claude')!.status, 'conflict');
  await assert.rejects(() => connectAgent(root, SERVER, 'claude', env), /not valid JSON/);
  assert.equal(await readFile(join(root, '.mcp.json'), 'utf8'), '{ not json');
});

test('cleanupLaunchScripts removes only stale veri-launch scripts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-cleanup-'));
  const hour = 60 * 60 * 1000;
  const now = 1_700_000_000_000;
  await writeFile(join(dir, 'veri-launch-claude-1.command'), '#!/bin/zsh\n');
  await writeFile(join(dir, 'veri-launch-codex-2.command'), '#!/bin/zsh\n');
  await writeFile(join(dir, 'unrelated.command'), 'keep');
  // stale = older than one hour; utimes takes seconds
  await utimes(join(dir, 'veri-launch-claude-1.command'), (now - 2 * hour) / 1000, (now - 2 * hour) / 1000);
  await utimes(join(dir, 'veri-launch-codex-2.command'), (now - hour / 2) / 1000, (now - hour / 2) / 1000);
  await utimes(join(dir, 'unrelated.command'), (now - 9 * hour) / 1000, (now - 9 * hour) / 1000);

  await cleanupLaunchScripts(dir, now);
  const left = (await readdir(dir)).sort();
  assert.deepEqual(left, ['unrelated.command', 'veri-launch-codex-2.command']);

  // missing dir is a no-op, not a crash
  await cleanupLaunchScripts(join(dir, 'does-not-exist'), now);
});
