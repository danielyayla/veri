---
id: DEC-021
type: decision
title: "esbuild bundles the renderer so CodeMirror ships under the app CSP"
status: proposed
created: 2026-08-12
updated: 2026-08-12
links:
  - id: WO-022
    rel: constrains
  - id: DEC-020
    rel: extends
  - id: DEC-008
    rel: refines
---

## Choice

packages/ui gains esbuild as a devDependency. The build keeps tsc as the type-checker and emitter, then esbuild bundles the compiled renderer entry (dist/renderer/app.js) into a single ESM file (dist/renderer/app.bundle.js) that index.html loads. This is the only way the @codemirror/* packages (DEC-020) reach the browser context: the renderer runs under script-src 'self' with no bundler and no node integration, so bare npm specifiers cannot resolve at runtime. Main process and preload stay plain tsc output; only the renderer entry is bundled. No code is fetched at runtime — the bundle is built from local node_modules, preserving the no-network posture.

## Rejected alternatives

- **Import maps over node_modules files** — no new dependency, but every transitive @codemirror/@lezer package (style-mod, w3c-keyname, crelt, …) needs a hand-maintained map entry, inline import maps violate the existing script-src 'self' CSP, and external import-map support is a moving Chromium target. Fragile in exchange for nothing.
- **Vendoring prebuilt CodeMirror bundles into the repo** — freezes the editor at a hand-rolled artifact nobody can audit or upgrade via npm; loses tree-shaking and sourcemaps.
- **Switching the whole package to a bundler-first build (Vite)** — rebuilds the working tsc pipeline and drags in a dev server the no-network posture doesn't want; DEC-008 chose vanilla deliberately.
- **Relaxing the CSP to allow node integration in the renderer** — a security regression to avoid a build step.

## Rationale

DEC-020 committed to CodeMirror 6 and said "all packages are bundled locally" — this decision picks the bundler. esbuild is a single, zero-config devDependency whose output is a plain ESM file the existing CSP already allows; tsc remains the source of truth for types, so the DEC-004 posture (native type stripping for dev, tsc for publishing) is untouched.
