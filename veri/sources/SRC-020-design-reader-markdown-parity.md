---
id: SRC-020
type: source
title: Design — Reader markdown parity
status: imported
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-009
    rel: designs
  - id: SRC-008
    rel: builds-on
  - id: SRC-016
    rel: derived-from
  - id: DEC-012
    rel: constrained-by
---

> Drafted 2026-08-18 by an agent session (Claude Code) for the reader
> markdown parity work order, per the DEC-012 design gate, under
> Daniel's P1 implementation directive of 2026-08-18. Pending Daniel's
> review. Written spec only — the surface is the existing reader
> column; the substance is which constructs render.

Closes the gap [[SRC-016]] names: "the rendered markdown subset (no
tables/fences/images) degrades exactly the SRC design docs this repo
is richest in", and the reader's `[[ID]]` regex omitting `WF` so
[[WF-001]] chips only work in edit mode. Delivers [[REQ-009]]'s
"visible in reader" clause for the constructs the corpus actually
uses.

## The parity rule

The reader renders **the subset this repo's own corpus uses** — not
CommonMark. Parity is defined by evidence: every construct that
appears in `veri/` documents today must render as itself, not as a
degraded paragraph. Constructs the corpus does not use stay out of the
parser (manifesto 8: views are cheap, concepts are expensive).

Audit of the 100-document corpus, in order of damage:

1. **Ordered lists** (`1.` …) — used by WF-001's rules, SRC-016's
   findings; currently render as paragraphs, losing the numbering.
2. **Fenced code blocks** (``` with optional language) — AGENTS.md
   yaml examples, WO bodies quoting commands; currently render as
   paragraphs with stray backticks.
3. **Pipe tables** — SRC-016's scorecard; currently a paragraph of
   pipes.
4. **Blockquotes** (`>`) — the design docs' attribution notes;
   currently paragraphs with literal `>`.
5. **`[[WF-001]]`** — the inline ref regex says `REQ|DEC|WO|SRC`;
   extend to `WF`. One id space, one regex ([[REQ-001]]).
6. **Images** (`![alt](path)`) — design bundles keep PNGs next to
   specs; render as an image resolved relative to the document's file,
   with the alt text as caption; a missing file renders the broken-link
   amber treatment ([[SRC-019]] rule 5: never a silent gap).
7. **Italic** (`*text*`) — inline, same tier as bold.

## Rendering

- Ordered list items render like `rd-li` with the number in the dash
  slot, preserving the author's numbers.
- Fences render as a `pre` block in the existing `inline-code` mono
  treatment, block-level; no syntax highlighting (a token cost with no
  reader benefit at this corpus size; revisit on evidence).
- Tables render as a plain grid: header row bold, mono-friendly,
  horizontal scroll inside the reader column when wide — the reader
  column never widens.
- Blockquotes render as the muted paragraph treatment with a left
  rule, matching the advisory strip's grey register.
- All new blocks participate in `sections()` unchanged — heading
  splitting keys on `##` lines only, and fence interiors are opaque:
  a `## ` line inside a fence is code, not a heading.

## Everything unchanged

The parser stays the hand-rolled single-pass line parser in
`markdown.ts` — no markdown dependency ([[SRC-008]]'s guarded-editor
model; core stays dependency-free and the renderer stays inspectable).
Edit mode, guards, autocomplete, the frontmatter card, and link
*resolution* (still `@veri/core`'s job) are untouched. `plainText`
keeps round-tripping refs. No new colors or tokens.
