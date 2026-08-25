---
id: SRC-045
type: source
title: "Design — File import: drag-and-drop intake into source documents"
status: imported
created: 2026-08-25
updated: 2026-08-25
links:
  - id: REQ-031
    rel: designs
  - id: WO-094
    rel: relates-to
  - id: SRC-014
    rel: builds-on
  - id: SRC-039
    rel: builds-on
  - id: SRC-044
    rel: derived-from
---

Design bundle for the desktop app's file-import surface — the UI
counterpart of [[REQ-031]] (evidence enters as files), building on the
core + CLI seam of [[WO-094]]. Filed as the design artifact for the
future app-UI work order (the drag-and-drop follow-up WO-094's out-of-scope
section reserves); the [[DEC-012]] gate for that work order is satisfied
by linking this document `designed-by` once it is filed. Pending Daniel's
review — nothing here is approved yet.

Files live in `design/file-import/`:

- `README.md` — self-sufficient written spec: entry points (window-wide
  drag target + a persistent "Import files…" button in the Sources type
  panel), the review sheet (per-file detected format, target SRC id,
  editable title, originals-preserved note), the filed state (`original`
  frontmatter row, transient panel highlight, quiet toast), interaction
  notes, and open questions.
- `Main.dc.html`, `ImportSheet.dc.html`, `Imported.dc.html`,
  `canvas.json` — the three high-fidelity artboards and canvas layout.
  Live review canvas:
  https://claude.ai/code/artifact/1aa032b4-a558-4347-a400-1c4ef41108ce

Design intent, in one line per screen: drag anywhere and the editor
area becomes an ember-framed drop target; one review step before
anything files (the [[REQ-031]] posture — no loose blobs); the result
is an ordinary source document whose frontmatter links the preserved
original.

Fidelity is high: all values come from the shipped app's tokens
(`packages/ui/renderer/styles.css`) and the [[SRC-014]] shell spec. The
only new primitives are the dashed ember drop frame and stroke-SVG
file-type icons. Builds on the review-grouping language of [[SRC-039]]
(brownfield import) — that flow mines a repo; this one ingests
individual evidence files.

## Amendment (2026-08-25, per DEC-109)

Daniel's design-critique question — should the Sources panel's `+` and
"Import files…" collapse into one `+` menu? — was ruled on in
[[DEC-109]]: both entries stay, the flows cross-link instead of
merging. The bundle's `README.md` interaction notes carry the amended
spec: the header button label shortens to "Import…" (accessible name
unchanged), the New Document popover's Source type gains an
"or import files…" link into the picker path, and the empty Sources
panel offers an import ghost row beside "New Source…". Implemented by
[[WO-108]].
