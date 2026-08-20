---
id: SRC-037
type: source
title: "Spike report — Tauri 2 feasibility for the desktop shell"
status: imported
created: 2026-08-21
updated: 2026-08-21
links:
  - id: WO-071
    rel: reports
  - id: DEC-008
    rel: informs
  - id: DEC-001
    rel: informs
---

> Produced 2026-08-21 by an agent session (Claude Code) at Daniel's
> request, executing the [[WO-071]] spike proposal. All spike code
> lives outside the repo (session scratchpad, `veri-tauri-spike/`);
> nothing in `packages/` changed. Measurements are from real runs on
> this machine (macOS 15.7.3, M-series, Rust 1.96.1, Node 22.18),
> not estimates.

# Spike report: replacing Electron with Tauri 2

## What was built

The existing `packages/ui` renderer — `app.bundle.js`, stylesheets,
fonts, byte-for-byte as built for Electron — booted inside a Tauri 2
shell against this repo's real knowledge base, with the architecture
[[DEC-008]] predicted Tauri would force: a **Node sidecar** hosting
`@veri/core`, `@veri/mcp`, and all of `packages/ui/dist/lib`
unmodified behind line-delimited JSON-RPC on stdio, proxied by a thin
Rust shell exposing one `veri_call` command. A 180-line `shim.js`
replaces `preload.mts`, presenting the identical `window.veri`
surface, so the renderer cannot tell which shell it is in.

All four representative capabilities worked, verified by an automated
in-app acceptance run (against scratch copies of the project, never
the repo):

1. **Open project directory** — native NSOpenPanel via
   `tauri-plugin-dialog`; re-point validated in core, MRU updated,
   watchers re-armed; switched to a scaffolded demo project (17 docs)
   and back.
2. **Read/write a Veri document** — `readDoc`/`saveDoc` through
   core's `saveDocumentFile` guards; edit persisted, `updated:`
   bumped, and the fs-watcher `veri:changed` event arrived in the
   renderer through the sidecar → Rust → WebView event pipeline.
3. **Native menu/window behavior** — real macOS menu bar (App, File,
   Edit, View, Window, Help → "Report an Issue…") from Tauri's menu
   API with predefined role items; window size/min-size/background
   color as in `main.ts`. Screenshot-verified.
4. **Agent/MCP workflow** — `mcp-status`, agent detection (found
   Claude Code connected), and the [[WO-030]] live check:
   `verify-connection` spawned the real `@veri/mcp` server and spoke
   MCP to it — handshake ok, 7 tools, `searchProved=true`.

## Numbers (measured)

| Metric | Electron 0.1.x (shipped) | Tauri 2 spike |
|---|---|---|
| .app on disk | 276 MB (arm64), 474 MB (universal) | **6.8 MB** (arm64, renderer embedded) |
| Installer | 194 MB DMG / 196 MB zip (universal) | **3.0 MB** DMG |
| Cold start → loaded | 4.3 s first run, 1.34 s warm | 1.1 s first run, **0.69 s** warm |
| Idle RSS, project open | 270 MB across 4 processes | **≈269 MB** across 5 processes (shell 77 + WebContent 64 + GPU 29 + Net 13 + **Node sidecar 87**) |
| New code written | — | 795 lines total: 291 sidecar JS, 180 shim JS, 247 Rust, 77 config |
| Code it replaces | 700 lines (`main.ts` 589, `preload.mts` 57, builder config, html) | — |
| Logic reused unmodified | — | all of core/mcp/cli, 2,617 lines of `ui/src/lib`, entire renderer bundle |

Caveats on the numbers:

- **The 6.8 MB excludes a Node runtime.** The sidecar ran on the dev
  machine's Node. Shipping self-contained means bundling Node
  (~106 MB uncompressed, roughly 30–40 MB in the DMG) as a Tauri
  sidecar binary → realistic self-contained app ≈ 115 MB on disk,
  ≈ 40 MB download; still ~2.5× / ~5× smaller than today's universal
  artifacts. The alternative is using the **system Node the app
  already probes for** ([[DEC-031]]: agent connections require the
  user's Node ≥ 20 anyway, and `.mcp.json` entries run `node`
  directly) — that keeps the bundle at 7 MB but makes the whole app,
  not just agent features, dead without Node. A middle path: ship
  without Node, degrade to a "install Node / point me at it" screen —
  acceptable for Veri's agent-centric audience, a real decision to
  make.
- **Memory is a wash, and that is the honest headline.** Tauri's
  savings evaporate here because Veri's main-process work is real:
  the 87 MB Node sidecar is Electron's main process by another name.
  Only the browser chrome got cheaper (Electron's 270 MB included a
  116 MB main process doing the same jobs).
- Startup was measured to equivalent milestones (Electron:
  screenshot-mode exit after load complete; Tauri: first snapshot
  rendered + rAF), both with the full repo as the open project.
- Electron sizes are universal where noted; an arm64-only Electron
  DMG would be roughly half the 194 MB.

## Complexity and platform behavior

- **Toolchain**: adds Rust (cargo, ~470 crates, ~3 min cold release
  build with LTO; 5 s incremental) and `@tauri-apps/cli` to a
  TypeScript-only repo — exactly the cost [[DEC-001]]/[[DEC-008]]
  declined to pay in v1. Day-to-day UI work stays TypeScript; the
  Rust shell is ~250 lines that would rarely change.
- **IPC becomes three-hop**: renderer → Rust → sidecar and back.
  Works, adds one serialization and one process boundary; request
  correlation, timeouts, and sidecar lifecycle (spawn, kill on
  window close, crash restart) are now app code (~80 lines of Rust)
  where Electron gave `ipcMain.handle` for free.
- **Event pipeline** (fs watcher → renderer) worked identically;
  `nativeTheme` has no direct analog — the spike approximated the
  [[WO-060]] first-paint theme with the WebView media query; an
  explicit-pref-vs-system divergence corrects one frame late. Fixable
  (Rust `window.theme()` + `set_theme`), but it is one of several
  small Electron conveniences that each need a hand-rolled
  replacement: `capturePage` (the screenshot harness — WKWebView has
  no equivalent; the VERI_UI_SHOT verification workflow would need
  rethinking), `dialog.showMessageBox` loops, `app.getPath`,
  `clipboard`, dock icon.
- **WKWebView vs bundled Chromium**: one less engine version to
  carry, but rendering is now OS-version-dependent, and Windows/Linux
  would render on different engines (WebView2/WebKitGTK) —
  cross-platform testing surface grows if Veri ever leaves macOS.
- The renderer needed **zero changes**. The CSP meta moved to Tauri
  config; `?theme=light` first-paint is reproduced by the shim via
  `history.replaceState`.

## Signing and updating

- **Signing**: same Apple requirements either way (Developer ID +
  hardened runtime + notarization). Tauri's bundler signs and
  notarizes with env-var config (`APPLE_SIGNING_IDENTITY`,
  notarytool credentials), equivalent to today's electron-builder
  setup; a bundled Node sidecar is signed automatically as part of
  the bundle. No gap, no advantage.
- **Updating**: this is the real regression risk.
  `electron-updater` today gives GitHub-Releases feed
  (`latest-mac.yml`) + differential blockmap downloads, wired in 78
  lines ([[WO-031]]). `tauri-plugin-updater` supports static-JSON
  feeds on GitHub Releases fine, but downloads are **full archives**
  (no differential updates), the artifact naming/manifest is
  different, and updates must be re-signed with a Tauri-specific
  minisign key on top of Apple signing. Migrating existing installs
  across updater systems needs a bridge release. Workable, strictly
  more moving parts.

## Conclusion

**Feasible — demonstrated, not just argued.** The renderer and every
line of core logic move unchanged; 795 lines of glue replace 700;
all four native capabilities work, including the live MCP handshake.
[[DEC-008]]'s architectural prediction (Node sidecar required) was
correct, but its cost estimate was high: the sidecar is ~300 lines,
not a rewrite, and `packages/ui`'s existing `lib/` split means the
Electron main process ports almost mechanically.

What Tauri buys today: ~5× smaller download (~40 MB self-contained,
7 MB if system Node is acceptable), ~2× faster startup, no bundled
Chromium to track. What it does not buy: memory (a wash — the Node
sidecar is the old main process), and it costs a Rust toolchain, a
three-hop IPC, hand-rolled replacements for a dozen Electron
conveniences, a weaker updater story, and a second webview matrix if
Veri goes cross-platform.

Recommendation for [[DEC-008]]: no urgency to migrate — bundle size
and startup are Electron's only real losses here and neither blocks
a local single-window tool. If download size ever matters (public
distribution, marketing site), Tauri 2 is a proven, bounded move:
~800 lines of glue, keep everything else. The spike's decision point
worth recording either way: whether a shipped Veri may assume the
user's Node (as its agent features already do) — that choice alone
is the difference between a 7 MB and a 40 MB download.
