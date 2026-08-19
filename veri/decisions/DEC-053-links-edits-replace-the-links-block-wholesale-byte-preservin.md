---
id: DEC-053
type: decision
title: "Links edits replace the links: block wholesale, byte-preserving all else"
status: proposed
created: 2026-08-19
updated: 2026-08-19
links:
  - id: WO-056
    rel: constrains
---

## Choice

The WO-056 write path (core links.ts, setDocumentLinks/replaceLinksBlock) rewrites a document's frontmatter by regex-replacing only the `links:` line plus its indented continuation lines with a canonical re-serialization of the full new array (two-space `- id:`, four-space `rel:`, plain scalars quoted only when they leave `[A-Za-z0-9][A-Za-z0-9_.-]*`), then bumps `updated:` via save.ts's existing bumpUpdated. Every byte outside those two regions — body, unknown frontmatter keys, formatting quirks — is carried through verbatim. A file without a `links:` key gains one at the end of the frontmatter; an emptied set writes `links: []`. After the splice, the `id:`/`approved:`/`status:` lines are asserted byte-identical between old and new frontmatter (they sit outside the links block by construction — top-level YAML keys are unindented, so the indented-continuation grammar can never swallow them) and the write refuses if the assertion fails.

## Rejected alternatives

- **Parse and re-emit the whole frontmatter with the yaml library** — normalizes quoting, key order, and unknown keys across the entire block, so the diff would claim edits the user never made; exactly the drift DEC-002 forbids.
- **Line-splice only the touched entry (delete/insert one item)** — preserves hand-authored quirks inside the links block itself, but needs entry-boundary parsing to survive flow style, extra per-entry keys, and malformed blocks; more code for a case (quirky hand-written links YAML) that first contact with the editor canonicalizes anyway.
- **Route through saveDocumentFile with a renderer-built buffer** — the renderer would have to rewrite frontmatter text itself, duplicating core's parsing in the browser bundle and moving the byte-preservation burden to the UI; core stays the one place files are rewritten (same posture as appendNote/setStatus).

## Rationale

The file is the document (DEC-002), so the write must be the smallest true diff: on any Veri-written file a removal leaves the surviving entries byte-for-byte and the diff shows exactly the links block and the updated: line. Wholesale replacement of one block is a single predictable grammar that handles every input shape the same way — block lists, flow-style `links: []`, passthrough extra keys on entries, or a missing key — without a second frontmatter parser, and the guard assertion turns "the approval boundary is untouched by construction" into a checked invariant rather than a comment.
