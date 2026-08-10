import { existsSync } from 'node:fs';
import { chmod, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { recognizedEntry } from './mcpconfig.ts';

/**
 * Agent adapter registry (REQ-007 / WO-011). Each adapter describes one local
 * coding agent: how to detect it (binary on PATH), where its MCP config lives
 * for this project, and how to launch a session with an initial prompt.
 * Everything derives from disk on every call (DEC-002); the DEC-011 rule
 * applies to every format written: only a veri entry with exactly the shape
 * Veri writes is ever replaced — anything else is surfaced, never touched.
 */

export type AgentId = 'claude' | 'cursor' | 'codex' | 'gemini';

export type AgentStatus =
  /** binary not found on PATH */
  | 'not-installed'
  /** binary found, recognized veri entry present in its MCP config */
  | 'connected'
  /** binary found, no veri entry (Set up & launch can write one) */
  | 'not-connected'
  /** binary found, veri entry exists but Veri didn't write it — never touched */
  | 'conflict';

export interface AgentInfo {
  id: AgentId;
  name: string;
  binPath: string | null;
  configPath: string;
  status: AgentStatus;
}

/** Injectable environment so detection is testable without the real machine. */
export interface AgentEnv {
  path: string;
  home: string;
}

interface Adapter {
  id: AgentId;
  name: string;
  bin: string;
  format: 'json' | 'toml';
  configPath(projectRoot: string, home: string): string;
  /** argv after the binary; the prompt becomes the session's initial prompt */
  launchArgs(prompt: string): string[];
}

const ADAPTERS: Adapter[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    bin: 'claude',
    format: 'json',
    configPath: (root) => join(root, '.mcp.json'),
    launchArgs: (prompt) => [prompt],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    bin: 'cursor-agent',
    format: 'json',
    configPath: (root) => join(root, '.cursor', 'mcp.json'),
    launchArgs: (prompt) => [prompt],
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    bin: 'codex',
    format: 'toml',
    configPath: (_root, home) => join(home, '.codex', 'config.toml'),
    launchArgs: (prompt) => [prompt],
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    bin: 'gemini',
    format: 'json',
    configPath: (root) => join(root, '.gemini', 'settings.json'),
    launchArgs: (prompt) => ['-i', prompt],
  },
];

function defaultEnv(): AgentEnv {
  return { path: process.env['PATH'] ?? '', home: homedir() };
}

function findOnPath(bin: string, path: string): string | null {
  for (const dir of path.split(delimiter)) {
    if (dir === '') continue;
    const candidate = join(dir, bin);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

// ---- per-format config state ----

async function jsonEntryStatus(file: string): Promise<AgentStatus> {
  if (!existsSync(file)) return 'not-connected';
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return 'conflict'; // unreadable config: surfaced as untouchable, never written
  }
  const servers = (parsed as { mcpServers?: Record<string, unknown> }).mcpServers;
  const veri = servers?.['veri'];
  if (veri === undefined) return 'not-connected';
  return recognizedEntry(veri) === null ? 'conflict' : 'connected';
}

/**
 * Codex keeps MCP servers in TOML. Veri neither ships nor writes a TOML
 * parser; it only recognizes the exact block it writes itself (DEC-011
 * applied to a second format): a `[mcp_servers.veri]` section whose body is
 * `command = "node"` and a two-string `args` array. Any other body — or a
 * file we can't scan — is a conflict and is never modified.
 */
const TOML_HEADER = /^\s*\[mcp_servers\.veri\]\s*$/m;

function tomlVeriSection(text: string): string | null {
  const match = TOML_HEADER.exec(text);
  if (match === null) return null;
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const next = rest.search(/^\s*\[/m);
  return next === -1 ? rest : rest.slice(0, next);
}

function tomlSectionRecognized(section: string): boolean {
  const lines = section
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'));
  if (lines.length !== 2) return false;
  return (
    lines[0] === 'command = "node"' &&
    /^args = \["[^"]*", "[^"]*"\]$/.test(lines[1] ?? '')
  );
}

async function tomlEntryStatus(file: string): Promise<AgentStatus> {
  if (!existsSync(file)) return 'not-connected';
  const text = await readFile(file, 'utf8');
  const section = tomlVeriSection(text);
  if (section === null) return 'not-connected';
  return tomlSectionRecognized(section) ? 'connected' : 'conflict';
}

// ---- public API ----

export async function detectAgents(projectRoot: string, env: AgentEnv = defaultEnv()): Promise<AgentInfo[]> {
  return Promise.all(
    ADAPTERS.map(async (a) => {
      const binPath = findOnPath(a.bin, env.path);
      const configPath = a.configPath(projectRoot, env.home);
      let status: AgentStatus = 'not-installed';
      if (binPath !== null) {
        status =
          a.format === 'json' ? await jsonEntryStatus(configPath) : await tomlEntryStatus(configPath);
      }
      return { id: a.id, name: a.name, binPath, configPath, status };
    }),
  );
}

function adapter(id: AgentId): Adapter {
  const found = ADAPTERS.find((a) => a.id === id);
  if (found === undefined) throw new Error(`unknown agent: ${id}`);
  return found;
}

/**
 * Write the veri entry into the agent's MCP config ("Set up & launch").
 * Refuses to touch a conflicting or unreadable config — same gate as the
 * connection panel, applied per adapter.
 */
export async function connectAgent(
  projectRoot: string,
  serverJs: string,
  id: AgentId,
  env: AgentEnv = defaultEnv(),
): Promise<void> {
  const a = adapter(id);
  const file = a.configPath(projectRoot, env.home);
  const root = resolve(projectRoot);

  if (a.format === 'toml') {
    const status = await tomlEntryStatus(file);
    if (status === 'conflict') {
      throw new Error(`${file} has a veri entry Veri didn't write — left untouched`);
    }
    if (status === 'connected') return;
    const existing = existsSync(file) ? await readFile(file, 'utf8') : '';
    const sep = existing === '' || existing.endsWith('\n') ? '' : '\n';
    const block = `${sep}\n[mcp_servers.veri]\ncommand = "node"\nargs = ["${serverJs}", "${root}"]\n`;
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, existing + block);
    return;
  }

  let config: Record<string, unknown> = {};
  if (existsSync(file)) {
    const raw = await readFile(file, 'utf8');
    try {
      config = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new Error(`${file} is not valid JSON — fix it by hand first`);
    }
  }
  const servers = (config['mcpServers'] ?? {}) as Record<string, unknown>;
  const current = servers['veri'];
  if (current !== undefined && recognizedEntry(current) === null) {
    throw new Error(`${file} has a veri entry Veri didn't write — left untouched`);
  }
  servers['veri'] = { command: 'node', args: [serverJs, root] };
  config['mcpServers'] = servers;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(config, null, 2)}\n`);
}

const LAUNCH_SCRIPT = /^veri-launch-.*\.command$/;
const LAUNCH_SCRIPT_TTL_MS = 60 * 60 * 1000;

/**
 * Sweep stale one-shot launch scripts from the temp dir (called at app
 * startup). Scripts must outlive the spawn long enough for Terminal to read
 * them, so they're deleted by age on the next launch of Veri, not after use.
 */
export async function cleanupLaunchScripts(dir: string = tmpdir(), now: number = Date.now()): Promise<void> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  await Promise.all(
    names
      .filter((n) => LAUNCH_SCRIPT.test(n))
      .map(async (n) => {
        const file = join(dir, n);
        try {
          if (now - (await stat(file)).mtimeMs > LAUNCH_SCRIPT_TTL_MS) await rm(file);
        } catch {
          // already gone or unreadable — nothing to clean
        }
      }),
  );
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

/**
 * Launch a session: a throwaway .command script (cd to the project root,
 * exec the agent with the kickoff prompt) opened in Terminal.app. Veri never
 * runs the agent headless and never captures its output. macOS only for now —
 * elsewhere the caller falls back to Copy kickoff prompt (DEC-013).
 */
export async function launchAgent(
  projectRoot: string,
  id: AgentId,
  binPath: string,
  prompt: string,
): Promise<void> {
  if (process.platform !== 'darwin') {
    throw new Error('launching a terminal is only supported on macOS for now');
  }
  const a = adapter(id);
  const argv = [binPath, ...a.launchArgs(prompt)].map(shellQuote).join(' ');
  const script = `#!/bin/zsh\ncd ${shellQuote(resolve(projectRoot))} && exec ${argv}\n`;
  const file = join(tmpdir(), `veri-launch-${id}-${Date.now()}.command`);
  await writeFile(file, script);
  await chmod(file, 0o755);
  spawn('open', ['-a', 'Terminal', file], { detached: true, stdio: 'ignore' }).unref();
}
