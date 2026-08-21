// Assemble the release assets and the tauri-updater manifest (WO-073).
// Collects both per-arch bundles (built with explicit --target), renames the
// updater archives so the two architectures can share one GitHub Release,
// writes latest.json (the feed tauri-plugin-updater polls), and states every
// artifact's size — failing loudly when a DMG crosses REQ-023's 50 MB
// ceiling, so a regression is visible at cut time, not from user complaints.
//
// Output: src-tauri/release-assets/ — DMGs, .app.tar.gz + .sig per arch,
// latest.json, SIZES.md (pasted into the release notes by CI).
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'danielyayla/veri';
const MAX_DMG_BYTES = 50 * 1024 * 1024; // REQ-023

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version;
const out = join(pkgDir, 'src-tauri', 'release-assets');

const ARCHES = [
  { triple: 'aarch64-apple-darwin', platform: 'darwin-aarch64', dmgArch: 'aarch64', archiveArch: 'aarch64' },
  { triple: 'x86_64-apple-darwin', platform: 'darwin-x86_64', dmgArch: 'x64', archiveArch: 'x64' },
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const platforms = {};
const sizes = [];
for (const arch of ARCHES) {
  const bundle = join(pkgDir, 'src-tauri', 'target', arch.triple, 'release', 'bundle');
  const dmg = join(bundle, 'dmg', `Veri_${version}_${arch.dmgArch}.dmg`);
  const archive = join(bundle, 'macos', 'Veri.app.tar.gz');
  const sig = `${archive}.sig`;

  const dmgOut = `Veri_${version}_${arch.dmgArch}.dmg`;
  const archiveOut = `Veri_${version}_${arch.archiveArch}.app.tar.gz`;
  copyFileSync(dmg, join(out, dmgOut));
  copyFileSync(archive, join(out, archiveOut));
  copyFileSync(sig, join(out, `${archiveOut}.sig`));

  platforms[arch.platform] = {
    signature: readFileSync(sig, 'utf8').trim(),
    url: `https://github.com/${REPO}/releases/download/v${version}/${archiveOut}`,
  };

  const dmgBytes = statSync(dmg).size;
  sizes.push({ name: dmgOut, bytes: dmgBytes, cap: true });
  sizes.push({ name: archiveOut, bytes: statSync(archive).size, cap: false });
}

writeFileSync(
  join(out, 'latest.json'),
  JSON.stringify({ version, pub_date: new Date().toISOString(), platforms }, null, 2),
);

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const lines = ['## Artifact sizes (REQ-023: installers stay under 50 MB)', ''];
let failed = false;
for (const { name, bytes, cap } of sizes) {
  const over = cap && bytes >= MAX_DMG_BYTES;
  lines.push(`- ${name}: ${mb(bytes)}${over ? ' — OVER THE 50 MB CEILING' : ''}`);
  if (over) failed = true;
}
writeFileSync(join(out, 'SIZES.md'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
if (failed) {
  console.error('make-updater-manifest: an installer crossed the REQ-023 ceiling');
  process.exit(1);
}
console.log(`make-updater-manifest: assets and latest.json ready in ${out}`);
