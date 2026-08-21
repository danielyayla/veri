/**
 * Watcher logic for the sidecar, split from the fs.watch wiring so the
 * debounce and the self-write classification are testable without a
 * filesystem. Semantics are the Electron main process's (watchProject in the
 * retired main.ts): veri/ events collapse into one `changed` per 150ms burst;
 * a project-root event for .mcp.json becomes `mcp-changed` with an
 * `external` flag — false when the agent-connection panel's own write was
 * within the last second, so the panel can tell its writes from a user's.
 */

export const WATCH_DEBOUNCE_MS = 150;
export const MCP_SELF_WRITE_WINDOW_MS = 1000;

export type RootWatchEvent = { kind: 'changed' } | { kind: 'mcp-changed'; external: boolean };

/** Classify one project-root (non-recursive) watcher event. */
export function classifyRootEvent(filename: string | null, mcpSelfWriteAt: number, now: number): RootWatchEvent {
  if (filename === '.mcp.json') {
    return { kind: 'mcp-changed', external: now - mcpSelfWriteAt > MCP_SELF_WRITE_WINDOW_MS };
  }
  return { kind: 'changed' };
}

export interface Debouncer {
  /** Note one event; (re)start the window. */
  bump(): void;
  /** Drop any pending fire — watchers being torn down must not emit late. */
  cancel(): void;
}

/** Trailing-edge debounce: fire once, `delayMs` after the last bump. */
export function createDebouncer(fire: () => void, delayMs = WATCH_DEBOUNCE_MS): Debouncer {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    bump(): void {
      clearTimeout(timer);
      timer = setTimeout(fire, delayMs);
    },
    cancel(): void {
      clearTimeout(timer);
    },
  };
}
