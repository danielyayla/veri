/**
 * Sidecar entry point: the process the Rust shell spawns on the bundled Node
 * runtime (DEC-063). Speaks the protocol on stdio; everything applicative
 * lives in app.ts. Exits when stdin closes (the shell quitting) once in-
 * flight requests drain, or with the shell's kill on window close.
 *
 * Environment contract with the shell:
 *   VERI_APP_VERSION  the app version (tauri.conf.json / package.json)
 *   VERI_PACKAGED     "1" inside an installed bundle
 *   VERI_UI_THEME     screenshot-harness theme override (not persisted)
 *   argv[2]           the user's positional launch argument, if any
 */
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createSidecar } from './app.ts';
import { dispatch, encode, parseRequest } from './protocol.ts';

const packaged = process.env['VERI_PACKAGED'] === '1';

// The Electron layout, kept verbatim so an updated install finds its own
// MRU, workspace and theme state: userData was Application Support/Veri
// packaged (productName) and Application Support/@verikb/ui in dev (package
// name), each with a config/ inside; logs were pinned to Logs/Veri (WO-031).
const configDir = join(homedir(), 'Library', 'Application Support', packaged ? 'Veri' : '@verikb/ui', 'config');
const logDir = join(homedir(), 'Library', 'Logs', 'Veri');

const sidecar = createSidecar({
  appVersion: process.env['VERI_APP_VERSION'] ?? '0.0.0-dev',
  packaged,
  configDir,
  logDir,
  explicitRoot: process.argv.slice(2).find((a) => !a.startsWith('-')),
  cwd: process.cwd(),
  emit: (event, data) => process.stdout.write(encode({ event, data })),
});

await sidecar.start();

const rl = createInterface({ input: process.stdin });
let pending = 0;
let stdinClosed = false;

const maybeExit = (): void => {
  if (stdinClosed && pending === 0) {
    sidecar.shutdown();
    process.exit(0);
  }
};

rl.on('line', (line) => {
  if (line.trim() === '') return;
  const req = parseRequest(line);
  if (req === null) {
    process.stderr.write(`[sidecar] bad request line: ${line.slice(0, 120)}\n`);
    return;
  }
  pending += 1;
  void dispatch(sidecar.methods, req)
    .then((res) => process.stdout.write(encode(res)))
    .finally(() => {
      pending -= 1;
      maybeExit();
    });
});

rl.on('close', () => {
  stdinClosed = true;
  maybeExit();
});

process.stdout.write(encode({ event: 'ready' }));
