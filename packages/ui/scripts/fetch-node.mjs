// Fetch the bundled Node runtime (WO-073, DEC-063, REQ-023): the official
// Node LTS binary, one per target architecture, verified against the
// published SHASUMS256 and dropped into src-tauri/binaries/ under the
// target-triple name Tauri's externalBin contract expects. Nothing large is
// committed to git — this runs at build time (locally and in CI).
//
//   node scripts/fetch-node.mjs [--target=arm64|x64|all] [--force]
//
// The version is pinned: the sidecar is built and tested against one
// runtime, and the DMG size budget (REQ-023: < 50 MB) is measured against
// it. Bump deliberately, with a fresh size measurement.
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export const NODE_VERSION = '22.18.0';

const TARGETS = {
  arm64: { dist: 'darwin-arm64', triple: 'aarch64-apple-darwin' },
  x64: { dist: 'darwin-x64', triple: 'x86_64-apple-darwin' },
};

const here = dirname(fileURLToPath(import.meta.url));
const binDir = join(here, '..', 'src-tauri', 'binaries');

const args = process.argv.slice(2);
const force = args.includes('--force');
const targetArg = (args.find((a) => a.startsWith('--target=')) ?? '').replace('--target=', '') || undefined;
const wanted =
  targetArg === 'all'
    ? Object.keys(TARGETS)
    : [targetArg ?? (process.arch === 'arm64' ? 'arm64' : 'x64')];

const shasumsUrl = `https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt`;
const shasumsRes = await fetch(shasumsUrl);
if (!shasumsRes.ok) throw new Error(`fetch ${shasumsUrl}: HTTP ${shasumsRes.status}`);
const shasums = await shasumsRes.text();

for (const key of wanted) {
  const target = TARGETS[key];
  if (target === undefined) throw new Error(`unknown target ${key} (arm64|x64|all)`);
  const out = join(binDir, `node-${target.triple}`);
  if (existsSync(out) && !force) {
    console.log(`fetch-node: ${out} exists, skipping (--force to refetch)`);
    continue;
  }
  const tarball = `node-v${NODE_VERSION}-${target.dist}.tar.gz`;
  const expected = shasums.split('\n').find((l) => l.endsWith(`  ${tarball}`))?.split(' ')[0];
  if (expected === undefined) throw new Error(`no SHASUMS256 entry for ${tarball}`);

  console.log(`fetch-node: downloading ${tarball}…`);
  const res = await fetch(`https://nodejs.org/dist/v${NODE_VERSION}/${tarball}`);
  if (!res.ok) throw new Error(`fetch ${tarball}: HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== expected) throw new Error(`${tarball}: sha256 mismatch (${actual} != ${expected})`);

  const work = join(tmpdir(), `veri-fetch-node-${key}`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  writeFileSync(join(work, tarball), bytes);
  execFileSync('tar', ['-xzf', tarball, `node-v${NODE_VERSION}-${target.dist}/bin/node`], { cwd: work });

  mkdirSync(binDir, { recursive: true });
  rmSync(out, { force: true });
  execFileSync('cp', [join(work, `node-v${NODE_VERSION}-${target.dist}`, 'bin', 'node'), out]);
  chmodSync(out, 0o755);
  rmSync(work, { recursive: true, force: true });
  console.log(`fetch-node: ${out} ready (${(readFileSync(out).length / 1024 / 1024).toFixed(1)} MB, sha256 verified)`);
}
