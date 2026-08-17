import { spawn } from 'node:child_process';

/**
 * Node-runtime detection (DEC-031, WO-030): configs keep `command: "node"`,
 * so the question is whether the *agent's* shell will find a usable node —
 * never whether this app's environment has one. GUI launches inherit
 * launchd's bare PATH, so probing process.env.PATH would false-negative on
 * every Homebrew/nvm install; a login shell answers the question the agent
 * will actually ask.
 */

/** Veri's MCP server requires Node >= 20 (packages/mcp engines). */
export const MIN_NODE_MAJOR = 20;

export interface RuntimeProbe {
  /** `command -v node` resolved in a login shell. */
  found: boolean;
  path: string | null;
  /** e.g. "v22.5.1"; null when not found. */
  version: string | null;
  /** found and version >= MIN_NODE_MAJOR. */
  usable: boolean;
}

/** Parse `command -v node && node --version` output (path line, version line). */
export function parseProbeOutput(stdout: string): { path: string; version: string } | null {
  const lines = stdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');
  const path = lines.find((l) => l.startsWith('/'));
  const version = lines.find((l) => /^v\d+\.\d+\.\d+/.test(l));
  if (path === undefined || version === undefined) return null;
  return { path, version };
}

export function nodeMajor(version: string): number | null {
  const m = /^v(\d+)\./.exec(version);
  return m === null ? null : Number.parseInt(m[1]!, 10);
}

export function classifyProbe(stdout: string): RuntimeProbe {
  const parsed = parseProbeOutput(stdout);
  if (parsed === null) return { found: false, path: null, version: null, usable: false };
  const major = nodeMajor(parsed.version);
  return {
    found: true,
    path: parsed.path,
    version: parsed.version,
    usable: major !== null && major >= MIN_NODE_MAJOR,
  };
}

/**
 * Run the login-shell probe. Resolves (never rejects) — a shell that errors
 * or hangs reads as "no usable node", which is what the panel then says.
 */
export function probeNodeRuntime(shell: string = process.env['SHELL'] ?? '/bin/zsh'): Promise<RuntimeProbe> {
  return new Promise((resolve) => {
    const child = spawn(shell, ['-l', '-c', 'command -v node && node --version'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let out = '';
    let done = false;
    const finish = (probe: RuntimeProbe): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill();
      resolve(probe);
    };
    const timer = setTimeout(() => finish({ found: false, path: null, version: null, usable: false }), 8000);
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.on('error', () => finish({ found: false, path: null, version: null, usable: false }));
    child.on('close', () => finish(classifyProbe(out)));
  });
}
