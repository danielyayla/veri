---
id: WO-087
type: work-order
title: "Site chrome polish: nav IA, docs copy buttons, open-source texture"
status: in-progress
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

- [ ] No page carries a "Product" or top-level "Workflow" nav item; exactly one nav item is marked active per page
- [ ] Every docs code block has a working, keyboard-operable copy button; no external dependency added
- [ ] The homepage fin band shows license, star, sample-KB, and changelog links that resolve
- [ ] The connect-claude-code success string says ten tools; docs tables scroll horizontally without losing table semantics for screen readers
- [ ] Both palettes still pass the WO-065 AA baseline on every touched page

## Receipts

(none yet)
