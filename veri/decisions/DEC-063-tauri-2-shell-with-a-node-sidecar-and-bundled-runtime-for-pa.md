---
id: DEC-063
type: decision
title: "Tauri 2 shell with a Node sidecar and bundled runtime for packages/ui"
status: proposed
created: 2026-08-20
updated: 2026-08-20
links:
  - id: WO-073
    rel: constrains
  - id: REQ-023
    rel: constrained-by
  - id: DEC-008
    rel: supersedes
  - id: SRC-037
    rel: informed-by
---

## Choice

The desktop app ships as a Tauri 2 shell: a thin Rust host owning window, native menus, dialogs, and process lifecycle; all Veri logic stays in TypeScript, running in a Node sidecar process (bundled Node runtime, shipped and signed inside the app) that hosts @veri/core, @veri/mcp, and packages/ui's lib modules unmodified behind line-delimited JSON-RPC over stdio; the renderer is the existing vanilla-TypeScript bundle, unchanged, behind a window.veri shim that preserves the preload surface. On approval this supersedes DEC-008 (Electron shell), whose frontmatter then gains superseded_by pointing here; DEC-001 (TypeScript over Rust for all product logic) explicitly stands — the Rust shell is glue, not logic.

## Rejected alternatives

- **Stay on Electron with per-arch artifacts (WO-072 alone)** — halves the download in days and is worth doing as mitigation, but plateaus at ~110 MB: structurally unable to meet REQ-023.
- **Tauri with system Node (no bundled runtime, ~7 MB)** — smallest possible download and the audience (agent users) mostly has Node, but it makes merely opening a knowledge base depend on an external runtime; REQ-023's acceptance explicitly forbids that. Revisitable later as an additional slim artifact.
- **Rewrite core in Rust for a sidecar-free Tauri app** — smallest memory and process count, but contradicts DEC-001 and forfeits the single-codebase guarantee that CLI, MCP, and UI can never drift; cost measured in months, not lines.
- **Local HTTP server + system browser** — already rejected by DEC-008; nothing in REQ-023 changes its downsides (no dock identity, localhost posture).

## Rationale

REQ-023 (first-run download under 50 MB, drafted from the first user's size complaint) is unreachable on Electron, whose per-arch framework floor is ~100 MB. The WO-071 spike (SRC-037) demonstrated this exact architecture end to end with measured numbers: 6.8 MB app before the runtime, ~40 MB download with Node bundled, 0.69 s warm start, renderer byte-identical, all four representative native capabilities working including a live MCP handshake — for ~800 lines of glue replacing ~700. Bundling the runtime rather than assuming system Node keeps knowledge-base browsing independent of the user's environment; agent features already probe for the user's own Node (DEC-031) and continue to.
