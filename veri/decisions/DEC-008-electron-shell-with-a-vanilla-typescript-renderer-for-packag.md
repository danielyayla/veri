---
id: DEC-008
type: decision
title: "Electron shell with a vanilla TypeScript renderer for packages/ui"
status: active
created: 2026-08-07
updated: 2026-08-07
links:
  - id: WO-005
    rel: constrains
  - id: REQ-004
    rel: constrains
---

## Choice

The desktop UI ships as `packages/ui`, an Electron app: the Electron main process runs Node and imports `@veri/core` directly for all parsing, graph traversal, and context assembly; the renderer is vanilla TypeScript + DOM/CSS ported from the design reference (`design/design-mockup.html`), with data crossing the IPC boundary as plain JSON. Fonts (Source Sans 3, JetBrains Mono) are bundled locally; the app makes no network calls at runtime.

## Rejected alternatives

- **Tauri** — smallest binaries and the path DEC-001 sketched for a future rewrite, but its host process is Rust: consuming `@veri/core` (mandated by WO-005) would require a Node sidecar process or a WASM build of core, adding a Rust toolchain to a TypeScript-only repo for no v1 gain. Remains the likely target if core is ever rewritten per DEC-001.
- **Local HTTP server + system browser** — no new shell dependency, but not a desktop app: no native folder picker, no window/dock identity, lifetime tied to a terminal, and the whole UI would sit behind a localhost port, muddying the no-network posture that REQ-004 makes an acceptance criterion.
- **React (or Svelte/Vue) + Vite renderer** — conventional, but the design reference is already plain DOM/CSS, so porting its markup and stylesheet directly is the highest-fidelity and lowest-dependency path (house style per DEC-005). View-diffing frameworks earn their keep on complex shared mutable state; here core owns all state and screens are re-rendered from files.

## Rationale

WO-005 requires every piece of logic to live in `packages/core`; Electron is the only shell where that TypeScript library runs unmodified in-process. Bundle size and memory — Electron's real costs — are not constraints for a local single-window tool, while toolchain simplicity and shipping speed are (the same trade DEC-001 made). Vanilla DOM keeps `packages/ui` at one heavyweight dev dependency (electron) and makes pixel-perfect recreation of the HTML mockup a direct port rather than a translation.
