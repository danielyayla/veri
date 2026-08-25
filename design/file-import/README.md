# Handoff: File Import (drag-and-drop)

## Overview
Design for adding evidence files to a Veri project from the desktop
app: drag files anywhere onto the window (or click "Import files…" in
the Sources type panel), review what each file will become, and land
first-class source documents with originals preserved. This is the
desktop-app surface of REQ-031 (evidence enters as files); the core +
CLI seam it builds on is WO-094. The app UI itself is a follow-up work
order — this bundle exists to satisfy the DEC-012 design gate for it.

## About the Design Files
Three artboards authored as Design Component HTML plus a canvas layout
manifest. The live, pannable canvas (with rationale notes) is published
at https://claude.ai/code/artifact/1aa032b4-a558-4347-a400-1c4ef41108ce —
these files are the source of truth; the artifact is the review surface.

- `Main.dc.html` — **1 · Drop target.** Mid-drag state: the editor
  area dims under a scrim and frames in a 1.5px dashed ember border
  (inset 14px, radius 12 — canvas-scale surface), with an upload
  glyph, "Drop to import" (20px/600), a one-line promise ("2 files
  become source documents — ready to link, pack, and distill.
  Originals are preserved."), the incoming files as mono chips with
  SRC-violet swatches, and the accepted-formats line in mono
  (`md · txt · pdf · eml · docx`).
- `ImportSheet.dc.html` — **2 · Review sheet.** Modal (520px, overlay
  `#17171B`, pop border, 9px radius, pop shadow) over the live Sources
  view. One card per file: stroke-SVG type icon, filename (mono),
  size + `<ext> → text` extraction label, the id it will take as an
  SRC-tinted chip (`SRC-045`/`SRC-046`), and an editable Title field
  (34px, focus border `#8A4A2C` shown on the second card). Info row:
  "Originals preserved in `veri/originals/` — the source document
  keeps a link to the unmodified file." Footer: outlined Cancel +
  primary ember "Import 2 files" (dark text).
- `Imported.dc.html` — **3 · Filed source.** SRC-045 open in the
  reader: breadcrumb, 24px title, frontmatter card with `type source` /
  `status imported` chips, created date, and an **`original` row
  linking the preserved file** — the new property this design
  introduces. The Sources panel count ticks 44 → 46; the two new rows
  carry an ember-tint highlight + 5px ember dot (transient); a quiet
  green-tinted toast bottom-right ("✓ 2 sources filed · originals
  preserved") with a mono `SRC-046 →` jump link.
- `canvas.json` — artboard layout (three 1180×740 frames in a row)
  and the per-artboard rationale notes.

## Fidelity
**High-fidelity.** All values are the shipped app's tokens
(`packages/ui/renderer/styles.css`) and the SRC-014 shell: 44px topbar,
216px sidebar, 280px type panel, 28px nav rows / 26px doc rows, mono
10px uppercase `.1em` section labels, Source Sans 3 / JetBrains Mono.
No new colors; the only new primitives are the dashed ember drop frame
and the stroke-SVG file-type and upload icons (16px grid, 1.4–1.5px
stroke).

## Interaction notes
- The drop target is the whole editor area, active during any OS file
  drag over the window; the Sources panel's persistent "Import files…"
  button opens the same review sheet via a file picker — one flow, two
  entries.
- The review sheet is the REQ-031 posture made visible: nothing files
  on drop. Each file shows its detected format and target id; titles
  are editable before filing; Cancel abandons cleanly.
- Unsupported formats (per WO-094's supported set) should appear in
  the sheet as refused rows naming the supported formats — not
  silently dropped (not drawn; implementer note).
- After import the first new source opens as a preview tab
  (document-tabs semantics); highlight + toast are transient, no
  banners, matching the app's "visually quiet" activity language.
- Import never bypasses the knowledge-base rules: the filed documents
  are ordinary SRCs — packable, linkable, checked by `veri check`.

## Open questions for implementation
- Multi-file drops beyond a handful: the sheet as drawn scales to ~4
  cards; beyond that it should scroll within the modal.
- Whether the `original` frontmatter row renders for hand-authored
  sources (absent field → row omitted, as drawn elsewhere).
