---
id: WO-087
type: work-order
title: "Site chrome polish: nav IA, docs copy buttons, open-source texture"
status: done
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-012
    rel: implements
  - id: SRC-042
    rel: designed-by
  - id: SRC-041
    rel: informed-by
  - id: DEC-033
    rel: constrained-by
---

Approved by Daniel 2026-08-24.

## Summary

The small-surface items from SRC-041 that SRC-042's design resolves but no existing work order owns. Nav IA simplifies to Docs · GitHub · Download — the "Product" mid-page anchor and the top-level "Workflow" duplicate are dropped on the homepage and every docs page, fixing the double-active nav state on site/docs/workflow.html (both "Workflow" and "Docs" carry class="nav here"). Docs code blocks get a copy button (small inline script, DEC-033-compatible). The final CTA band gains the missing open-source texture: Apache-2.0 license, a Star on GitHub action, a link to browse the sample knowledge base on GitHub, and a changelog/releases link — per the SRC-042 fin-band treatment.

## In scope

- Header nav markup on `site/index.html` and all files in `site/docs/`, including the `class="nav here"` fix
- Copy-to-clipboard buttons on `pre` blocks across docs pages, one shared inline script, keyboard-operable
- The fin-band open-source row on the homepage with real links (license file, repo, sample `veri/` folder, releases)
- While in the file: the stale "16 documents, 7 tools" string on `site/docs/connect-claude-code.html` (~line 71) corrected to ten tools, and docs tables re-wrapped in a scrolling div instead of `display: block` (SRC-041 minor findings)

## Out of scope

- Band restructuring (WO-083), comparison copy (WO-082), install messaging (WO-084)
- Typography (WO-086) and the micro-demos (WO-085)
- A dark/light manual toggle, analytics, or any build tooling (DEC-033)

## Requirements

- [[REQ-012]] — implements
- [[SRC-042]] — designed-by
- [[SRC-041]] — informed-by
- [[DEC-033]] — constrained-by

## Acceptance tests

- [x] No page carries a "Product" or top-level "Workflow" nav item; exactly one nav item is marked active per page
      — Verified 2026-08-24: grep across `site/index.html` + all 13 `site/docs/*.html` finds only
      Docs · GitHub · Download in the top nav — zero `#product` anchors, zero top-level Workflow items
      (the docs-strip's Workflow entry is the in-scope sub-nav, untouched). Each docs page carries
      exactly one `class="nav here"` (Docs), fixing workflow.html's double-active state; the homepage
      marks none current, matching SRC-042's Main.dc.html header where no top-nav item points at the
      homepage itself. 404.html has no top nav by design (self-contained page).
- [x] Every docs code block has a working, keyboard-operable copy button; no external dependency added
      — One shared inline vanilla-JS script (md5-identical across the 10 pre-bearing docs pages;
      quickstart/workflow/troubleshooting have no code blocks) wraps each `.doc pre` in a `.pre-wrap`
      and appends a real `<button type="button" class="copy-btn">` — injected, so with scripts disabled
      no dead control renders, and the button sits outside the pre's own horizontal scroll. Verified
      2026-08-24 in Chromium: both buttons on connect-claude-code copy the decoded code text
      (`navigator.clipboard.writeText` captured 228 B / 74 B with entities decoded) and cycle
      Copy → Copied → Copy (1.5 s); focusable native button (activeElement check). `node --check`
      passes and a DOM-stub smoke run asserts wrapper structure, copied text, and the label cycle.
      No dependency: script is inline, zero external fetches (DEC-033).
- [x] The homepage fin band shows license, star, sample-KB, and changelog links that resolve
      — Fin band per SRC-042's treatment: "Star on GitHub" as a secondary button beside the download
      CTA, plus the mono open-source row "Apache-2.0 · browse the sample knowledge base on GitHub ·
      changelog". All targets curl 200 live on 2026-08-24: the repo, blob/main/LICENSE (committed),
      tree/main/packages/cli/demo/veri (the committed invoicing sample knowledge base), and /releases.
- [x] The connect-claude-code success string says ten tools; docs tables scroll horizontally without losing table semantics for screen readers
      — The success string now reads "(16 documents, 10 tools)". All 9 docs tables (workflow, ci,
      connect-claude-code, connect-mcp, reference ×5 including the binding-drift table) are wrapped in
      `<div class="table-scroll">` with `overflow-x` on the wrapper; `.doc table`'s `display: block`
      is gone and computed style confirms `display: table` in the browser. At 375px the widest
      reference table scrolls inside its wrapper while every page's document scrollWidth stays ≤
      viewport (automated sweep of all 14 pages: zero horizontal overflow).
- [x] Both palettes still pass the WO-065 AA baseline on every touched page
      — No token values changed; every new element uses existing token pairs. Computed ratios for the
      new surfaces: copy button `--muted`/`--card` 5.24:1 dark / 5.09:1 light (hover 14.35 / 14.85),
      fin open-source row `--muted`/`--bg` 5.51:1 dark / 4.82:1 light, Star button `--text`/`--bg`
      15.09:1 dark / 14.08:1 light — all ≥ 4.5:1. Rendered and inspected in both schemes in Chromium;
      stylesheet cache-bust bumped to `?v=7` on all 14 pages so the CSS change ships.

## Receipts

- 2026-08-24 · commits 71b687a (in-progress), 194d3b0 (implementation) · site/index.html, site/site.css,
  site/docs/*.html (all 13 pages), veri/work-orders/WO-087-….md — Site chrome polish per SRC-042:
  top nav reduced to Docs · GitHub · Download everywhere (Product anchor and top-level Workflow dropped,
  workflow.html's double-active `nav here` fixed); copy-to-clipboard buttons on every docs code block via
  one shared inline script with matching `.pre-wrap`/`.copy-btn` styles in site.css; homepage fin band
  gained the open-source row (Apache-2.0 → LICENSE, Star on GitHub, browse the sample knowledge base →
  packages/cli/demo/veri, changelog → releases); connect-claude-code success string corrected 7 → 10
  tools; all docs tables re-wrapped in `.table-scroll` divs restoring `display: table` semantics;
  site.css cache-bust unified at ?v=7. Verified: local server 200s on all 15 pages, Chromium checks in
  both palettes and at 375px, node --check + DOM-stub smoke for the script, live-resolving GitHub links,
  `veri check` green (WO-034 advisory only).
