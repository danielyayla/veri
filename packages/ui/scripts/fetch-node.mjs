// Fetch the bundled Node runtime (WO-073, DEC-063, REQ-023; WO-092 adds the
// Linux and Windows targets): the official Node LTS binary, one per bundle
// target, verified against the published SHASUMS256 and dropped into
// src-tauri/binaries/ under the target-triple name Tauri's externalBin
// contract expects. Nothing large is committed to git — this runs at build
// time (locally and in CI).
//
//   node scripts/fetch-node.mjs [--target=arm64|x64|all|linux-x64|win-x64] [--force]
//
// `all` means both macOS architectures (the mac release job cross-builds
// x64 from the arm64 runner); Linux and Windows are fetched only on their
// own runners, so each is its own explicit target. With no --target the
// host platform/architecture is fetched.
//
// The version is pinned: the sidecar is built and tested against one
// runtime, and the installer size budget (REQ-023: < 50 MB) is measured
// against it. Bump deliberately, with a fresh size measurement.
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export const NODE_VERSION = '22.18.0';

// dist: nodejs.org archive name segment; archive: its format; inner: the
// node binary's path inside the extracted tree; triple + exe: the output
// name externalBin resolves (`binaries/node` → node-<triple><exe>).
// The .zip is extracted with bsdtar, which ships as `tar` on the Windows
// runners (and macOS); the win-x64 target is never fetched on Linux, whose
// GNU tar cannot read zip.
const TARGETS = {
  arm64: { dist: 'darwin-arm64', archive: 'tar.gz', inner: 'bin/node', triple: 'aarch64-apple-darwin', exe: '' },
  x64: { dist: 'darwin-x64', archive: 'tar.gz', inner: 'bin/node', triple: 'x86_64-apple-darwin', exe: '' },
  'linux-x64': { dist: 'linux-x64', archive: 'tar.gz', inner: 'bin/node', triple: 'x86_64-unknown-linux-gnu', exe: '' },
  'win-x64': { dist: 'win-x64', archive: 'zip', inner: 'node.exe', triple: 'x86_64-pc-windows-msvc', exe: '.exe' },
};

function hostTarget() {
  if (process.platform === 'darwin') return process.arch === 'arm64' ? 'arm64' : 'x64';
  if (process.platform === 'linux') return 'linux-x64';
  return 'win-x64';
}

const here = dirname(fileURLToPath(import.meta.url));
const binDir = join(here, '..', 'src-tauri', 'binaries');

const args = process.argv.slice(2);
const force = args.includes('--force');
const targetArg = (args.find((a) => a.startsWith('--target=')) ?? '').replace('--target=', '') || undefined;
const wanted = targetArg === 'all' ? ['arm64', 'x64'] : [targetArg ?? hostTarget()];

const shasumsUrl = `https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt`;
const shasumsRes = await fetch(shasumsUrl);
if (!shasumsRes.ok) throw new Error(`fetch ${shasumsUrl}: HTTP ${shasumsRes.status}`);
const shasums = await shasumsRes.text();

for (const key of wanted) {
  const target = TARGETS[key];
  if (target === undefined) throw new Error(`unknown target ${key} (arm64|x64|all|linux-x64|win-x64)`);
  const out = join(binDir, `node-${target.triple}${target.exe}`);
  if (existsSync(out) && !force) {
    console.log(`fetch-node: ${out} exists, skipping (--force to refetch)`);
    continue;
  }
  const dist = `node-v${NODE_VERSION}-${target.dist}`;
  const archive = `${dist}.${target.archive}`;
  const expected = shasums.split('\n').find((l) => l.endsWith(`  ${archive}`))?.split(' ')[0];
  if (expected === undefined) throw new Error(`no SHASUMS256 entry for ${archive}`);

  console.log(`fetch-node: downloading ${archive}…`);
  const res = await fetch(`https://nodejs.org/dist/v${NODE_VERSION}/${archive}`);
  if (!res.ok) throw new Error(`fetch ${archive}: HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== expected) throw new Error(`${archive}: sha256 mismatch (${actual} != ${expected})`);

  const work = join(tmpdir(), `veri-fetch-node-${key}`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  writeFileSync(join(work, archive), bytes);
  // bsdtar (macOS, Windows runners) auto-detects tar.gz and zip alike; GNU
  // tar (Linux) auto-detects tar.gz, the only format fetched there.
  execFileSync('tar', ['-xf', archive, `${dist}/${target.inner}`], { cwd: work });

  mkdirSync(binDir, { recursive: true });
  rmSync(out, { force: true });
  copyFileSync(join(work, dist, ...target.inner.split('/')), out);
  chmodSync(out, 0o755);
  rmSync(work, { recursive: true, force: true });
  console.log(`fetch-node: ${out} ready (${(readFileSync(out).length / 1024 / 1024).toFixed(1)} MB, sha256 verified)`);
}
