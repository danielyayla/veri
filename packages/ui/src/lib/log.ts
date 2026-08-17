/**
 * Main-process logging (WO-031, DEC-034): line-oriented appends to main.log
 * in Electron's canonical logs directory. Veri ships no telemetry (DEC-002),
 * so this file is the only record of what the app did — above all the
 * update-check failures REQ-011 keeps out of the UI. It stays on the user's
 * machine; support means the user attaches it to an issue themselves.
 *
 * Never log document bodies, titles, or any knowledge-base content — paths
 * and outcomes only.
 */
import { appendFileSync, renameSync, statSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const LOG_FILE = 'main.log';
export const LOG_FILE_OLD = 'main.old.log';

/** DEC-034 size cap: past this, main.log becomes main.old.log (replacing any
 *  previous one), so total disk use stays bounded at roughly twice the cap. */
export const MAX_LOG_BYTES = 512 * 1024;

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/**
 * A logger appending to `<dir>/main.log`. Synchronous on purpose: lines are
 * rare (lifecycle, updater outcomes, config writes) and ordering matters more
 * than latency. Any I/O failure is swallowed — logging must never take the
 * app down, and there is nowhere else to report a broken log.
 */
export function createLogger(dir: string): Logger {
  const file = join(dir, LOG_FILE);
  const write = (level: string, message: string): void => {
    try {
      mkdirSync(dir, { recursive: true });
      rotateIfNeeded(dir);
      appendFileSync(file, `${new Date().toISOString()} ${level} ${message}\n`);
    } catch {
      // A log that cannot be written is a log that is silently absent.
    }
  };
  return {
    info: (message) => write('info', message),
    warn: (message) => write('warn', message),
    error: (message) => write('error', message),
  };
}

function rotateIfNeeded(dir: string): void {
  const file = join(dir, LOG_FILE);
  let size: number;
  try {
    size = statSync(file).size;
  } catch {
    return; // no file yet — nothing to rotate
  }
  if (size < MAX_LOG_BYTES) return;
  renameSync(file, join(dir, LOG_FILE_OLD));
}

/**
 * electron-updater's `logger` slot (info/warn/error/debug taking anything).
 * debug is dropped and messages are truncated: the updater dumps full HTTP
 * headers on a failed check, and the log exists for outcomes, not transcripts.
 */
export const MAX_UPDATER_LINE = 400;

export function updaterLogger(log: Logger): {
  info(msg?: unknown): void;
  warn(msg?: unknown): void;
  error(msg?: unknown): void;
  debug(msg: string): void;
} {
  const clip = (msg: unknown): string => {
    const text = String(msg).replace(/\s*\n\s*/g, ' ⏎ ');
    return text.length > MAX_UPDATER_LINE ? `${text.slice(0, MAX_UPDATER_LINE)}…` : text;
  };
  return {
    info: (msg) => log.info(`updater: ${clip(msg)}`),
    warn: (msg) => log.warn(`updater: ${clip(msg)}`),
    error: (msg) => log.error(`updater: ${clip(msg)}`),
    debug: () => {},
  };
}
