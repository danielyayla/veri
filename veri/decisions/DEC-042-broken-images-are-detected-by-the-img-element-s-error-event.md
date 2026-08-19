---
id: DEC-042
type: decision
title: "Broken images are detected by the img element's error event, not an fs check"
status: active
approved: 2026-08-19
created: 2026-08-18
updated: 2026-08-19
links:
  - id: WO-046
    rel: constrains
---

## Choice

The reader resolves an image path against the document's directory as a file:// URL and renders a real img element; the amber broken treatment (SRC-019 rule 5) is swapped in by the element's native error event when the load fails. No filesystem existence check, no new IPC surface.

## Rejected alternatives

- **Existence check over the preload bridge (new readImage/exists IPC)** — adds API surface and an async round-trip per image for a weaker signal (a file can exist yet fail to decode); rejected as concept cost with no reader benefit
- **Inlining images as data: URIs via IPC** — copies bytes through the bridge on every render and bloats snapshots; the renderer can already read file:// directly
- **Rendering nothing on failure** — a silent gap, exactly what SRC-019 rule 5 forbids

## Rationale

The renderer already runs on file:// with direct access to local images, so the browser's own load failure is the ground truth for "missing": it covers nonexistent files, unreadable files, and undecodable images with one mechanism, keeps the preload bridge unchanged, and needs no async existence round-trip before first paint. The fallback is rendered per-figure, so a broken image can never be a silent gap — the figure either shows the image or the amber notice with the path.
