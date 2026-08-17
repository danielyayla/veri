import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RuntimeProbe } from './noderuntime.ts';

/**
 * Live connection check (WO-030, SRC-013 surface 3): launch the configured
 * server once, the way an agent would — the probe-resolved node, the entry's
 * args exactly as the static checks resolved them — and speak real MCP to it.
 * The four static checks only read disk; this is the one place Veri proves
 * the config actually launches and serves this project. Results are transient
 * renderer state, never persisted (DEC-002).
 */

export type VerifyResult =
  | { kind: 'ok'; nodeVersion: string; toolCount: number; searchProved: boolean }
  | { kind: 'missing-runtime' }
  | { kind: 'runtime-too-old'; version: string; path: string }
  | { kind: 'server-missing'; path: string }
  | { kind: 'wrong-root'; otherRoot: string }
  | { kind: 'no-answer'; stderr: string };

/**
 * Failures detectable without spawning (states A–C; the copy is identical
 * either way, per the design). Null means proceed to the handshake.
 */
export function preflight(probe: RuntimeProbe, serverPath: string, serverExists: boolean): VerifyResult | null {
  if (!probe.found) return { kind: 'missing-runtime' };
  if (!probe.usable) return { kind: 'runtime-too-old', version: probe.version ?? '', path: probe.path ?? '' };
  if (!serverExists) return { kind: 'server-missing', path: serverPath };
  return null;
}

interface HandshakeOk {
  ok: true;
  toolCount: number;
  searchProved: boolean;
}

interface HandshakeFail {
  ok: false;
  stderr: string;
}

/**
 * One MCP session over newline-delimited JSON-RPC: initialize, initialized,
 * tools/list, and — when the open project has a document to ask for — one
 * `search` call whose answer must name that id (proves the server serves
 * *this* project's files, not just that it starts). The child is killed on
 * every path.
 */
export function runHandshake(
  nodePath: string,
  serverPath: string,
  rootPath: string,
  searchId: string | null,
  timeoutMs = 10_000,
): Promise<HandshakeOk | HandshakeFail> {
  return new Promise((resolvePromise) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(nodePath, [serverPath, rootPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      resolvePromise({ ok: false, stderr: err instanceof Error ? err.message : String(err) });
      return;
    }
    let stderr = '';
    let buffer = '';
    let done = false;
    const got = new Map<number, { result?: unknown; error?: unknown }>();
    const wanted = searchId === null ? [1, 2] : [1, 2, 3];
    const finish = (result: HandshakeOk | HandshakeFail): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill();
      resolvePromise(result);
    };
    const timer = setTimeout(() => finish({ ok: false, stderr }), timeoutMs);
    child.on('error', (err) => finish({ ok: false, stderr: stderr === '' ? err.message : stderr }));
    child.on('close', () => finish({ ok: false, stderr }));
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.trim() === '') continue;
        try {
          const msg = JSON.parse(line) as { id?: unknown; result?: unknown; error?: unknown };
          if (typeof msg.id === 'number') got.set(msg.id, msg);
        } catch {
          continue; // non-JSON stdout noise is not an answer
        }
        if (wanted.every((id) => got.has(id))) {
          const toolsMsg = got.get(2);
          const tools = (toolsMsg?.result as { tools?: unknown[] } | undefined)?.tools;
          if (!Array.isArray(tools)) {
            finish({ ok: false, stderr });
            return;
          }
          const search = got.get(3);
          const text = JSON.stringify((search?.result as unknown) ?? '');
          finish({
            ok: true,
            toolCount: tools.length,
            searchProved: searchId !== null && search?.error === undefined && text.includes(searchId),
          });
          return;
        }
      }
    });
    const requests: unknown[] = [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'veri-ui-verify', version: '0' } },
      },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    ];
    if (searchId !== null) {
      requests.push({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'search', arguments: { query: searchId } } });
    }
    for (const request of requests) child.stdin?.write(`${JSON.stringify(request)}\n`);
  });
}

export interface VerifyInput {
  probe: RuntimeProbe;
  /** The entry's args as the static checks resolved them — never rewritten. */
  serverPath: string;
  rootPath: string;
  /** The project the app has open, for the wrong-root comparison. */
  projectRoot: string;
  /** A doc id from the open project's snapshot; null skips the search step. */
  searchId: string | null;
}

export async function verifyConnection(input: VerifyInput): Promise<VerifyResult> {
  const early = preflight(input.probe, input.serverPath, existsSync(input.serverPath));
  if (early !== null) return early;
  const handshake = await runHandshake(input.probe.path!, input.serverPath, input.rootPath, input.searchId);
  if (!handshake.ok) return { kind: 'no-answer', stderr: handshake.stderr.trim() };
  // The server answered — but with the config exactly as written, a stale
  // root means it is serving some other project's files (state D).
  if (resolve(input.rootPath) !== resolve(input.projectRoot)) {
    return { kind: 'wrong-root', otherRoot: input.rootPath };
  }
  return { kind: 'ok', nodeVersion: input.probe.version ?? '', toolCount: handshake.toolCount, searchProved: handshake.searchProved };
}
