// Assemble the release assets and the tauri-updater manifest (WO-073;
// WO-092 adds the Linux and Windows platforms). The release pipeline builds
// each platform on its own runner, so this script runs in two phases:
//
//   node scripts/make-updater-manifest.mjs --platform=darwin|linux|windows
//     On a build runner: collect that platform's bundles into
//     src-tauri/release-assets/ (renaming where two files would collide),
//     record a manifest fragment (manifest-<platform>.json — updater
//     platform entries + artifact sizes + asset names), and fail loudly if
//     an installer crosses its per-platform ceiling (REQ-023 via DEC-090),
//     so a size regression stops the platform job in minutes, not the
//     publish step.
//
//   node scripts/make-updater-manifest.mjs --merge
//     On the publish runner, after every fragment is downloaded into
//     src-tauri/release-assets/: verify all three platforms are present and
//     agree on the version, write latest.json (the feed tauri-plugin-updater
//     polls), SIZES.md (pasted into the release notes, with per-platform
//     update-channel caveats), and ASSETS.txt (the exact upload/verify
//     list), re-checking the size gate across everything.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'danielyayla/veri';

// Per-platform ceilings (DEC-090, proposed, under REQ-023): 50 MB binds
// where the OS provides the WebView (macOS, Windows). Linux carries what
// those platforms get from the OS — the AppImage bundles the WebKitGTK
// stack and both formats the mandatory Node sidecar (REQ-023 forbids
// depending on system Node) — so its ceilings sit just above the measured
// v0.3.1 floor (119.4 / 50.7 MB), tight enough that regressions still fail.
const MB = 1024 * 1024;
const CEILING = { dmg: 50 * MB, nsis: 50 * MB, appimage: 150 * MB, deb: 60 * MB };

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version;
const out = join(pkgDir, 'src-tauri', 'release-assets');
const url = (asset) => `https://github.com/${REPO}/releases/download/v${version}/${asset}`;

/** The one file in `dir` matching `pattern` — bundle layouts are named by
    the Tauri bundler, so match by shape instead of hard-coding names. */
function bundled(dir, pattern) {
  const matches = readdirSync(dir).filter((f) => pattern.test(f));
  if (matches.length !== 1) {
    throw new Error(`expected exactly one ${pattern} in ${dir}, found: ${matches.join(', ') || '(none)'}`);
  }
  return join(dir, matches[0]);
}

// Each collector copies its artifacts into `out` and returns the fragment:
//   platforms — latest.json entries (updater url + minisign signature)
//   sizes     — [{name, bytes, cap}]; cap: the artifact's byte ceiling
//               (null for updater archives, which no user downloads whole)
//   assets    — release asset names, exactly as uploaded
const COLLECTORS = {
  // Two explicit --target builds: the arm64 runner cross-builds x64. The
  // updater archives share a name across arches, so they rename apart here.
  darwin() {
    const platforms = {};
    const sizes = [];
    const assets = [];
    for (const arch of [
      { triple: 'aarch64-apple-darwin', platform: 'darwin-aarch64', suffix: 'aarch64' },
      { triple: 'x86_64-apple-darwin', platform: 'darwin-x86_64', suffix: 'x64' },
    ]) {
      const bundle = join(pkgDir, 'src-tauri', 'target', arch.triple, 'release', 'bundle');
      const dmg = join(bundle, 'dmg', `Veri_${version}_${arch.suffix}.dmg`);
      const archive = join(bundle, 'macos', 'Veri.app.tar.gz');

      const dmgOut = `Veri_${version}_${arch.suffix}.dmg`;
      const archiveOut = `Veri_${version}_${arch.suffix}.app.tar.gz`;
      copyFileSync(dmg, join(out, dmgOut));
      copyFileSync(archive, join(out, archiveOut));
      copyFileSync(`${archive}.sig`, join(out, `${archiveOut}.sig`));

      platforms[arch.platform] = { signature: readFileSync(`${archive}.sig`, 'utf8').trim(), url: url(archiveOut) };
      sizes.push({ name: dmgOut, bytes: statSync(dmg).size, cap: CEILING.dmg });
      sizes.push({ name: archiveOut, bytes: statSync(archive).size, cap: null });
      assets.push(dmgOut, archiveOut, `${archiveOut}.sig`);
    }
    return { platforms, sizes, assets };
  },

  // One host-target build (`tauri build --bundles appimage,deb`). The
  // AppImage doubles as the updater artifact (Tauri v2 signs it in place);
  // the .deb has no updater path — its caveat is stated in SIZES.md below.
  linux() {
    const bundle = join(pkgDir, 'src-tauri', 'target', 'release', 'bundle');
    const appimage = bundled(join(bundle, 'appimage'), /\.AppImage$/);
    const sig = `${appimage}.sig`;
    const deb = bundled(join(bundle, 'deb'), /\.deb$/);

    const names = [appimage, sig, deb].map((f) => f.split('/').pop());
    for (const [src, name] of [appimage, sig, deb].map((f, i) => [f, names[i]])) {
      copyFileSync(src, join(out, name));
    }
    return {
      platforms: { 'linux-x86_64': { signature: readFileSync(sig, 'utf8').trim(), url: url(names[0]) } },
      sizes: [
        { name: names[0], bytes: statSync(appimage).size, cap: CEILING.appimage },
        { name: names[2], bytes: statSync(deb).size, cap: CEILING.deb },
      ],
      assets: names,
    };
  },

  // One host-target build (`tauri build --bundles nsis`). The NSIS
  // installer doubles as the updater artifact. It is not Authenticode-signed
  // (DEC-082 defers Windows signing): SmartScreen will warn on first run.
  windows() {
    const bundle = join(pkgDir, 'src-tauri', 'target', 'release', 'bundle');
    const setup = bundled(join(bundle, 'nsis'), /-setup\.exe$/);
    const sig = `${setup}.sig`;

    const names = [setup, sig].map((f) => f.split(/[\\/]/).pop());
    copyFileSync(setup, join(out, names[0]));
    copyFileSync(sig, join(out, names[1]));
    return {
      platforms: { 'windows-x86_64': { signature: readFileSync(sig, 'utf8').trim(), url: url(names[0]) } },
      sizes: [{ name: names[0], bytes: statSync(setup).size, cap: CEILING.nsis }],
      assets: names,
    };
  },
};

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Render sizes and enforce each artifact's ceiling; returns the markdown lines. */
function gate(sizes) {
  const lines = ['## Artifact sizes (per-platform ceilings: REQ-023 via DEC-090)', ''];
  let failed = false;
  for (const { name, bytes, cap } of sizes) {
    const over = cap != null && bytes >= cap;
    const ceiling = cap != null ? ` (ceiling ${mb(cap)})` : '';
    lines.push(`- ${name}: ${mb(bytes)}${ceiling}${over ? ' — OVER ITS CEILING' : ''}`);
    if (over) failed = true;
  }
  console.log(lines.join('\n'));
  if (failed) {
    console.error('make-updater-manifest: an installer crossed its size ceiling (REQ-023/DEC-090)');
    process.exit(1);
  }
  return lines;
}

const args = process.argv.slice(2);
const platformArg = (args.find((a) => a.startsWith('--platform=')) ?? '').replace('--platform=', '');

if (platformArg !== '') {
  const collect = COLLECTORS[platformArg];
  if (collect === undefined) throw new Error(`unknown platform ${platformArg} (darwin|linux|windows)`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const fragment = { version, ...collect() };
  gate(fragment.sizes);
  writeFileSync(join(out, `manifest-${platformArg}.json`), JSON.stringify(fragment, null, 2));
  console.log(`make-updater-manifest: ${platformArg} assets and manifest fragment ready in ${out}`);
} else if (args.includes('--merge')) {
  const platforms = {};
  const sizes = [];
  const assets = [];
  for (const name of Object.keys(COLLECTORS)) {
    // A missing fragment means a platform build silently vanished — fail
    // here rather than publish a feed that strands that platform's users.
    const fragment = JSON.parse(readFileSync(join(out, `manifest-${name}.json`), 'utf8'));
    if (fragment.version !== version) {
      throw new Error(`manifest-${name}.json is for ${fragment.version}, expected ${version}`);
    }
    Object.assign(platforms, fragment.platforms);
    sizes.push(...fragment.sizes);
    assets.push(...fragment.assets);
  }

  writeFileSync(
    join(out, 'latest.json'),
    JSON.stringify({ version, pub_date: new Date().toISOString(), platforms }, null, 2),
  );

  const lines = gate(sizes);
  lines.push(
    '',
    '## Update channels',
    '',
    '- macOS (DMG) and Linux (AppImage): the installed app auto-updates via its built-in updater.',
    '- Linux (.deb): no auto-update — install each release’s .deb manually (tracked under REQ-030).',
    '- Windows (NSIS): the installed app auto-updates; the installer is not Authenticode-signed, so SmartScreen warns on first install (DEC-082).',
  );
  writeFileSync(join(out, 'SIZES.md'), lines.join('\n') + '\n');
  writeFileSync(join(out, 'ASSETS.txt'), [...assets, 'latest.json'].join('\n') + '\n');
  console.log(`make-updater-manifest: latest.json covers [${Object.keys(platforms).join(', ')}]; assets and SIZES.md ready in ${out}`);
} else {
  throw new Error('usage: make-updater-manifest.mjs --platform=darwin|linux|windows | --merge');
}
