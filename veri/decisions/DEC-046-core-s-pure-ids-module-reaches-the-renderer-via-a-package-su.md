---
id: DEC-046
type: decision
title: "Core's pure ids module reaches the renderer via a package subpath export"
status: proposed
created: 2026-08-19
updated: 2026-08-19
links:
  - id: WO-050
    rel: constrains
---

## Choice

Expose @veri/core's dependency-free ids module as a second package export ("./ids" → dist/ids.js) and have the browser-bundled renderer import compareIds from '@veri/core/ids'. esbuild resolves the subpath through the workspace and inlines the pure module into app.bundle.js; node-side consumers (CLI, MCP, core itself, the Electron main process) keep importing from the main '@veri/core' entry, which re-exports the same module.

## Rejected alternatives

- **Renderer-local mirror of compareIds** (the isPending pattern) — a fourth copy of core logic kept honest only by a sync test; the mirrors exist because no alternative existed, and this change is exactly the chance to create one
- **Bundling all of @veri/core into the renderer** — the main entry imports node built-ins (fs, path); a browser bundle fails to resolve them, and shipping core's loader into the renderer would be dead weight even if it worked
- **Fetching sorted lists over IPC from the main process** — turns a pure, hot comparator used inside render-path sorts into an async round-trip; wrong shape entirely

## Rationale

The renderer bundle cannot import '@veri/core' itself: the main entry pulls node:fs and friends, which a browser-platform esbuild bundle rejects — which is why the renderer historically kept hand-written mirrors of core logic (isPending, PACKAGE_RULES_TEXT) synced by tests. The ids module is pure string logic with zero imports, so exporting it as its own subpath lets the renderer share the one real implementation of compareIds (SRC-030: one concept, one implementation) instead of growing another mirror, with no change to how any node-side package resolves core.
