---
id: DEC-041
type: decision
title: "Drift is ordered by history position; lifecycle edits are recognized by commit subject"
status: proposed
created: 2026-08-18
updated: 2026-08-18
links:
  - id: WO-045
    rel: constrains
  - id: REQ-021
    rel: satisfies
  - id: DEC-040
    rel: follows-from
  - id: DEC-025
    rel: follows-from
  - id: DEC-038
    rel: follows-from
---

## Choice

Drift detection (WO-045, REQ-021) derives "after" from position in the collected commit list — `git log` order, newest first — not from timestamps: commit A postdates commit B when it sits earlier in the facts. The one detector that can lack an anchor (an `approved:` stamp whose commit predates the convention) falls back to comparing committer dates (day granularity, git %cs) against the stamp date. The approve/supersede flow's own guarded-line writes are recognized by the commit-subject convention — a subject naming the document id together with approved/superseded/retired (e.g. "DEC-040: approved") — and are never drift. Context packages carry only the pure advisory tier (structure findings and superseded-authority drift for the subject work order): git-backed advisories stay out of packages because the MCP server is subprocess-free (DEC-037) and CLI/MCP packages must stay byte-identical (DEC-038); they surface in `veri check` and the desktop app instead, each host collecting its own facts (DEC-040).

## Rationale

Position-first with a dated fallback matches how the corpus actually looks: recent history follows the lifecycle-subject convention and anchors precisely, while pre-convention stamps still verify as far as a date can carry them — degrading confidence gracefully instead of failing or lying. Excluding lifecycle commits by subject keeps the approve flow from flagging its own writes without new state, honoring derive-don't-book-keep. Keeping packages pure preserves the two invariants agents already rely on (subprocess-free MCP, byte-identical packages) while every human-facing surface — check and the app — still shows the full tier.
