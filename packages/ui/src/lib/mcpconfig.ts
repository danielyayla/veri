import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Server side of the agent connection (REQ-005 / WO-007): read, check, and
 * repair the project-scoped .mcp.json. Everything derives from disk on every
 * call — no cached state (DEC-002). Only the mcpServers.veri entry is ever
 * written; all other content of the file is preserved verbatim.
 */

/** What the panel needs to render any of its states, as plain JSON. */
export interface McpStatus {
  configPath: string;
  /**
   * missing      — no .mcp.json
   * unparseable  — file exists but is not valid JSON (writes refuse to touch it)
   * no-entry     — parses, but has no mcpServers.veri
   * conflict     — has a mcpServers.veri whose shape Veri doesn't write
   * ok           — has a recognized veri entry (health checks apply)
   */
  state: 'missing' | 'unparseable' | 'no-entry' | 'conflict' | 'ok';
  /** Pretty-printed foreign entry (conflict) or raw file text (unparseable). */
  conflictJson: string | null;
  /** From the recognized entry; null unless state is "ok". */
  command: string | null;
  serverPath: string | null;
  rootPath: string | null;
  /** The entry's paths resolved against the project root (effective config). */
  serverPathResolved: string | null;
  rootPathResolved: string | null;
  /** Health checks 3 and 4; only meaningful when state is "ok". */
  executableFound: boolean;
  rootMatches: boolean;
  /** What setup would write — used for the preview and the CLI command. */
  desiredServerPath: string;
  desiredRoot: string;
  /** Home directory, so the renderer can display paths with ~. */
  home: string;
}

interface VeriEntry {
  command: string;
  args: [string, string];
}

function configPath(projectRoot: string): string {
  return join(projectRoot, '.mcp.json');
}

function expandTilde(path: string): string {
  return path === '~' || path.startsWith('~/') ? join(homedir(), path.slice(1)) : path;
}

/**
 * The one shape Veri writes: {command: "node", args: [server.js, projectRoot]}
 * and nothing else. Anything different is a foreign entry the panel must show
 * and never silently overwrite.
 */
export function recognizedEntry(value: unknown): VeriEntry | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== 2 || !('command' in value) || !('args' in value)) return null;
  const { command, args } = value as { command: unknown; args: unknown };
  if (command !== 'node') return null;
  if (!Array.isArray(args) || args.length !== 2 || !args.every((a) => typeof a === 'string')) return null;
  return { command, args: args as [string, string] };
}

export async function mcpStatus(projectRoot: string, desiredServerPath: string): Promise<McpStatus> {
  const file = configPath(projectRoot);
  const base: McpStatus = {
    configPath: file,
    state: 'missing',
    conflictJson: null,
    command: null,
    serverPath: null,
    rootPath: null,
    serverPathResolved: null,
    rootPathResolved: null,
    executableFound: false,
    rootMatches: false,
    desiredServerPath,
    desiredRoot: resolve(projectRoot),
    home: homedir(),
  };
  if (!existsSync(file)) return base;

  const raw = await readFile(file, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...base, state: 'unparseable', conflictJson: raw.trim() };
  }

  const servers = (parsed as { mcpServers?: Record<string, unknown> }).mcpServers;
  const veri = servers?.['veri'];
  if (veri === undefined) return { ...base, state: 'no-entry' };

  const entry = recognizedEntry(veri);
  if (entry === null) {
    return { ...base, state: 'conflict', conflictJson: JSON.stringify(veri, null, 2) };
  }

  const [serverPath, rootPath] = entry.args;
  const serverPathResolved = resolve(projectRoot, expandTilde(serverPath));
  const rootPathResolved = resolve(projectRoot, expandTilde(rootPath));
  return {
    ...base,
    state: 'ok',
    command: entry.command,
    serverPath,
    rootPath,
    serverPathResolved,
    rootPathResolved,
    executableFound: existsSync(serverPathResolved),
    rootMatches: rootPathResolved === resolve(projectRoot),
  };
}

async function readConfig(file: string): Promise<Record<string, unknown>> {
  if (!existsSync(file)) return {};
  const raw = await readFile(file, 'utf8');
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`.mcp.json is not valid JSON — fix it by hand, then re-run checks`);
  }
}

async function writeConfig(file: string, config: Record<string, unknown>): Promise<void> {
  await writeFile(file, `${JSON.stringify(config, null, 2)}\n`);
}

/**
 * Set up or replace the veri entry (the panel's "Set up connection" and
 * "Replace with Veri's entry" actions — the same write). Every other key in
 * the file, including other servers, is preserved.
 */
export async function writeVeriEntry(projectRoot: string, desiredServerPath: string): Promise<void> {
  const file = configPath(projectRoot);
  const config = await readConfig(file);
  const servers = (config['mcpServers'] ?? {}) as Record<string, unknown>;
  servers['veri'] = { command: 'node', args: [desiredServerPath, resolve(projectRoot)] };
  config['mcpServers'] = servers;
  await writeConfig(file, config);
}

/**
 * The "Fix path" repair: rewrite only the project-root argument of an already
 * recognized veri entry. The server path — possibly a deliberate choice — and
 * everything else in the file stay as they are.
 */
export async function fixRootArg(projectRoot: string): Promise<void> {
  const file = configPath(projectRoot);
  const config = await readConfig(file);
  const servers = config['mcpServers'] as Record<string, unknown> | undefined;
  const entry = recognizedEntry(servers?.['veri']);
  if (servers === undefined || entry === null) {
    throw new Error('no recognized veri entry to repair — run setup instead');
  }
  servers['veri'] = { command: entry.command, args: [entry.args[0], resolve(projectRoot)] };
  await writeConfig(file, config);
}

/** Display helper: abbreviate the home directory to ~ for UI paths. */
export function tildify(path: string, home: string): string {
  return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}
