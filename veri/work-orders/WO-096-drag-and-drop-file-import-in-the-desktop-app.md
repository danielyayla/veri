---
id: WO-096
type: work-order
title: "Drag-and-drop file import in the desktop app"
status: done
created: 2026-08-25
updated: 2026-08-25
links:
  - id: REQ-031
    rel: implements
  - id: SRC-045
    rel: designed-by
  - id: WO-094
    rel: depends-on
  - id: DEC-063
    rel: constrained-by
  - id: DEC-060
    rel: constrained-by
---

## Summary

The app surface of REQ-031 per the SRC-045 design: a window-wide drop target and a Sources-panel "Import files…" button, a per-file review sheet, and filed sources with preserved originals — composing WO-094's core import seam, never reimplementing it.

Recreate the [[SRC-045]] design (`design/file-import/`) in `packages/ui`:
evidence files enter the knowledge base by dragging them onto the window
or clicking "Import files…" in the Sources type panel, pass one review
step, and land as first-class source documents with originals preserved.
All import logic comes from the core seam [[WO-094]] delivers — the app
adds only the surface, per the architecture constraints ([[DEC-060]]).

## In scope

- Window-wide drop target: an OS file drag over the window dims the
  editor area behind the dashed ember frame, names the incoming files,
  and shows the accepted-formats line; dropping opens the review sheet.
- "Import files…" button in the Sources type panel header opening the
  same review sheet via the native file picker — one flow, two entries.
- Review sheet per SRC-045: one card per file with detected format,
  the target SRC id, and an editable title; the originals-preserved
  note; Cancel abandons cleanly with nothing filed.
- Unsupported files appear in the sheet as refused rows naming the
  supported set (SRC-045 implementer note) — never silently dropped.
- Filed state: the first new source opens as a preview tab
  (document-tabs semantics); new rows carry the transient highlight in
  the Sources panel; the quiet toast with a jump link to the other new
  documents; the `original` frontmatter row renders when the field is
  present and is omitted otherwise.
- Sheet body scrolls beyond ~4 file cards (SRC-045 open question).
- File access and dialogs ride the Tauri shell's host adapters
  ([[DEC-063]]); the renderer stays free of direct fs work.
- Tests colocated per repo convention; snapshot coverage consistent
  with how the app tests comparable surfaces.

## Out of scope

- Any change to core import semantics, supported formats, or original
  preservation — that is [[WO-094]]; this work order consumes its seam.
- Audio/video transcription (out of scope of WO-094 as well).
- Importing directories or repositories — brownfield import
  ([[SRC-039]], WO-075) remains its own flow.
- Distillation aids (turning a source into requirements/decisions from
  the import flow).

## Acceptance tests

- [x] Dragging supported files over the window shows the drop state;
      dropping opens the review sheet listing each file with detected
      format, target id, and editable title.
- [x] The Sources panel "Import files…" button reaches the same sheet
      via the file picker.
- [x] Confirming files the sources through the WO-094 core seam; the
      documents pass `veri check` and their frontmatter links the
      preserved originals.
- [x] An unsupported file shows as a refused row naming the supported
      set; it is never filed and never silently dropped.
- [x] Cancel closes the sheet with no documents filed and no originals
      copied.
- [x] After import: first new source opens as a preview tab, new rows
      highlight transiently, the toast appears with a working jump link.
- [x] Non-trivial choices made during implementation are filed as
      proposed decisions ([[DEC-095]]).

## Requirements

- [[REQ-031]] — implements
- [[SRC-045]] — designed-by
- [[WO-094]] — depends-on
- [[DEC-063]] — constrained-by
- [[DEC-060]] — constrained-by

## Receipts

- 2026-08-25 · commits 5ca74ad, 906d4ce · packages/ui: src/lib/intakehost.ts
  (new, +test), src/lib/snapshot.ts (+test), src/sidecar/app.ts,
  src/renderer/{api.ts, importlogic.ts (new, +test), app.ts,
  views/reader.ts}, renderer/{shim.js, styles.css},
  src-tauri/src/{dialogs.rs, main.rs} — shell forwards native DragDrop
  events and gains pick_files; sidecar serves two-phase
  import-inspect/import-commit; renderer adds drop overlay, review sheet
  (refused rows, editable titles), Sources-panel Import button, transient
  highlights, jump-link toast, and the `original` frontmatter row.
  Verified live via the DEC-066 shot harness: drop overlay, review sheet
  with an accepted md + refused pdf, and the filed state (preview tab,
  `original` row, toast) against a scratch project — which also caught
  and fixed the snapshot listing missing the originals/ exclusion. The
  native picker dialog itself is not drivable headless; its path shares
  openImportSheet with the verified drag path and pick_files compiles
  under cargo. DEC-095 filed proposed. Full suite green.
