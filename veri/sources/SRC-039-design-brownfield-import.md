---
id: SRC-039
type: source
title: "Design handoff — Brownfield import (entry points, import view, review grouping)"
status: imported
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-075
    rel: designs
  - id: REQ-024
    rel: designs
  - id: SRC-006
    rel: builds-on
  - id: SRC-007
    rel: builds-on
  - id: SRC-013
    rel: builds-on
---

Design approved by Daniel on 2026-08-24 (in-session review of the
prototype), satisfying the [[DEC-012]] gate for [[WO-075]].

Design handoff for [[WO-075]]'s UI surfaces, filed as the [[DEC-012]]
gate artifact.

Files live in `design/brownfield-import/`:

- `README.md` — self-sufficient written spec: the brownfield entry
  points (Home START HERE variant with import as the primary action,
  new-project sheet success line, palette command, CLI hint contract),
  the Import view's four states (ready with preflight reusing the
  [[SRC-013]] LIVE CHECK; no-agent failure with one action; live
  filing feed derived from the file watcher; done summary keyed on the
  manifest receipt), the import group in the [[SRC-006]] NEEDS REVIEW
  card (evidence rows as uncounted context, requirements/decisions as
  normal pending rows with derived progress), and the provenance line
  in the review banner with clickable evidence SRC chips. Copy is
  final.
- `brownfield-import.html` — self-running prototype, open in a
  browser; the scenario bar switches all six states.

Mechanisms deliberately left as decisions to file when implementation
starts: how the instruction package is served over MCP, the filing
surface for draft requirements and evidence sources, the import
manifest's link relation names, and the `veri import` CLI command.

Constraints honored: no new design tokens; no import registry or
persisted import state — every state derives from files and links
([[DEC-002]]); imported documents reuse the approval-gate machinery
unchanged, no bulk approve ([[REQ-008]]); one failure, one action;
import is an offer, never a gate.
