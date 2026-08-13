---
id: WO-022
type: work-order
title: First-class markdown editing — edit mode, guards, and creation flow
status: done
created: 2026-08-12
updated: 2026-08-13
links:
  - id: REQ-009
    rel: implements
  - id: SRC-008
    rel: designed-by
  - id: DEC-020
    rel: constrained-by
  - id: DEC-008
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: DEC-002
    rel: constrained-by
  - id: WO-012
    rel: depends-on
---

## Summary

Make the desktop UI a first-class markdown editor per [[REQ-009]] and
the [[SRC-008]] handoff: every document tab gains an edit mode (⌘E)
showing the raw file — frontmatter included — in a CodeMirror 6 source
editor ([[DEC-020]]), with explicit ⌘S save, dirty-tab semantics, a
conflict banner for external changes, caret-anchored `[[` autocomplete,
guarded frontmatter ranges enforcing the approval boundary of REQ-008,
and a type-plus-title creation flow (⌘N / sidebar `+`) that scaffolds a
check-passing document straight into edit mode.

Files remain the source of truth ([[DEC-002]]): save writes the buffer
verbatim (bumping only `updated:`), and schema/link validity stays a
`veri check` concern surfaced as indicators — never a gate on saving.
Per [[DEC-012]] this work order links its design (`rel: designed-by`,
[[SRC-008]]) and may not move to in-progress until [[REQ-009]] and
[[DEC-020]] are approved.

## In scope

- **Write path (main process / core)**: a save IPC that writes buffer
  text verbatim with the `updated:` bump, rejecting edits that change
  `id:`, add/alter `approved:`, or promote `status:` past the approval
  gate; unit-tested guard logic shared with nothing UI-specific so the
  CLI/MCP and UI use one write path. Document scaffolding for the
  creation flow (next free ID, initial status, kebab-case filename)
  reusing the existing core scaffold machinery where it fits.
- **Editor (renderer)**: CodeMirror 6 embedded as a self-contained
  island in the vanilla renderer — markdown source presentation,
  syntax palette, frontmatter zone, and `[[ID]]` link decorations with
  ⌘-click navigation, all exactly per SRC-008 tokens.
- Read/edit mode toggle per document tab (⌘E + breadcrumb control),
  per-mode scroll, dirty buffer kept across tab switches, and the
  read-mode "viewing saved version" strip when a dirty buffer exists.
- Save/dirty UX: ⌘S, status row, dirty dot replacing the tab ×,
  Save/Discard/Cancel prompt on closing a dirty tab.
- External-change handling: silent reload when clean, the
  Reload/Keep-mine conflict banner when dirty, and the deleted-file
  banner (Restore / Close tab).
- Guarded-range UX: transaction-filter rejection with amber flash,
  status-row notice, ghost-text rendering, and the parse-degraded
  fallback from the spec's edge cases.
- `[[` autocomplete inside the editor, reusing the reader input's
  matching logic.
- Creation flow: sidebar `+` per type group and ⌘N popover (type
  segments + title), new doc opens pinned in edit mode; the scaffolded
  file passes `veri check` untouched.
- Colocated `node --test` coverage: guard logic, scaffolding,
  dirty/conflict state transitions, autocomplete insertion.

## Out of scope

- Autosave (spec defers it; revisit as a settings flag).
- Editor buffers surviving app restart; tab persistence generally.
- WYSIWYG / live-preview rendering, split panes, vim/emacs keymaps,
  themes beyond existing light/dark ([[REQ-009]] exclusions).
- Editing files outside the project's `veri/` directory.
- Any change to the MCP server or CLI beyond core sharing the write
  path; no new `packages/core` runtime dependencies (`yaml` + `zod`
  only — CodeMirror lands in `packages/ui`).

## Requirements

Implements [[REQ-009]] — first-class markdown editing.

## Acceptance tests

- [x] Every document type opens in edit mode via ⌘E and the toggle;
      ⌘S writes the exact edited text plus the `updated:` bump, and
      the change appears in reader, sidebar, board, graph, and
      decision log without restart.
- [x] Creating each document type via ⌘N and the sidebar `+` yields a
      file that passes `veri check` before any typing, opened pinned
      in edit mode.
- [x] Editing `id:` or `approved:`, or promoting a status past the
      approval gate, is rejected in-editor (amber flash + notice) and
      cannot reach disk through the save IPC either; `veri approve`
      remains the only promotion path.
- [x] A document deliberately saved with schema violations saves
      successfully and shows `veri check` indicators; a clean buffer
      reloads silently on external change; a dirty buffer shows the
      conflict banner and no edit is lost without an explicit choice.
- [x] `[[` autocomplete works in the editor, inserts resolving links,
      and hides on zero matches without blocking novel IDs.
- [x] Closing a dirty tab prompts Save/Discard/Cancel; the dirty dot
      and status row behave per SRC-008.
- [x] New unit tests pass; `npm test` green; `veri check` zero issues;
      no network calls.

## Receipts

- 2026-08-12 — 826bbd1 — packages/core/src/{save.ts,save.test.ts,create.ts,create.test.ts,check.ts,index.ts}, packages/cli/src/{commands.ts,templates.ts}, packages/cli/demo+fixtures, packages/ui/src/{main.ts,preload.mts}, packages/ui/src/renderer/{editor.ts,editlogic.ts,editlogic.test.ts,app.ts,api.ts,widgets.ts,views/editor.ts,views/reader.ts,views/workorder.ts}, packages/ui/renderer/{index.html,styles.css}, packages/ui/package.json — CM6 edit mode with guarded frontmatter, ⌘S save via core's shared write path, external-change reconciliation, [[ autocomplete, and the ⌘N/sidebar-+ creation flow; all acceptance tests exercised live via the screenshot harness, 188 tests green, veri check clean (agent session, Claude Code)
