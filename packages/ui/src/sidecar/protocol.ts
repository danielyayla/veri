/**
 * The sidecar's wire protocol (DEC-063): line-delimited JSON-RPC over stdio.
 * The Rust shell writes one request per line on stdin and reads responses and
 * events from stdout; nothing else ever crosses that boundary. Kept pure —
 * no process, no streams — so routing and error mapping are testable as
 * plain functions.
 *
 *   -> {"id": 1, "method": "snapshot", "params": []}
 *   <- {"id": 1, "ok": true, "result": {...}}
 *   <- {"id": 1, "ok": false, "error": "message"}
 *   <- {"event": "changed"}                        (fs watcher, debounced)
 *   <- {"event": "mcp-changed", "data": {"external": true}}
 */

export interface RpcRequest {
  id: number;
  method: string;
  params: unknown[];
}

export type RpcResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

export interface RpcEvent {
  event: string;
  data?: unknown;
}

/** A served method. `never[]` parameters make any concrete handler
    assignable under strictFunctionTypes; dispatch widens at the call. */
export type Method = (...params: never[]) => unknown;

/** One request line, or null for anything malformed — a bad line is logged
    and dropped, never answered (there is no id to answer to). */
export function parseRequest(line: string): RpcRequest | null {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const { id, method, params } = raw as Record<string, unknown>;
  if (typeof id !== 'number' || typeof method !== 'string') return null;
  if (params !== undefined && !Array.isArray(params)) return null;
  return { id, method, params: params ?? [] };
}

/**
 * Route one request to its handler. Every outcome becomes a response: an
 * unknown method and a thrown error map to `ok: false` with a message the
 * renderer's ipcErrorMessage can show verbatim (the same words Electron's
 * ipcMain.handle rejections carried inside their wrapper). An undefined
 * result becomes null so JSON round-trips it.
 */
export async function dispatch(methods: Record<string, Method>, req: RpcRequest): Promise<RpcResponse> {
  const fn = methods[req.method];
  if (fn === undefined) return { id: req.id, ok: false, error: `unknown method: ${req.method}` };
  try {
    const result = await (fn as (...params: unknown[]) => unknown)(...req.params);
    return { id: req.id, ok: true, result: result ?? null };
  } catch (err) {
    return { id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function encode(message: RpcResponse | RpcEvent): string {
  return `${JSON.stringify(message)}\n`;
}
