---
id: DEC-041
type: decision
title: "Drift is ordered by history position; lifecycle edits are recognized by commit subject"
status: active
approved: 2026-08-18
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

## Rejected alternatives

- **Timestamp-only ordering for all detectors** — commit dates are day-granular (%cs) and vulnerable to clock skew and rebases; history position is what the repository actually asserts about sequence, so dates serve only as the anchorless fallback.
- **Detecting lifecycle edits by diffing file content at each commit** — exact, but requires a git subprocess per commit or content collection far beyond GitFacts, breaking the one-cheap-invocation collector shape of DEC-040.
- **A dedicated marker (trailer or note) written by veri approve to identify stamp commits** — new bookkeeping that existing history lacks; the subject convention is already in the corpus and costs nothing.
- **Git-backed advisories in context packages via a facts parameter on assembleContext** — the CLI could pass facts but the MCP server could not, so identical projects would yield different packages depending on the door you asked at, breaking DEC-038.

## Rationale

Position-first with a dated fallback matches how the corpus actually looks: recent history follows the lifecycle-subject convention and anchors precisely, while pre-convention stamps still verify as far as a date can carry them — degrading confidence gracefully instead of failing or lying. Excluding lifecycle commits by subject keeps the approve flow from flagging its own writes without new state, honoring derive-don't-book-keep. Keeping packages pure preserves the two invariants agents already rely on (subprocess-free MCP, byte-identical packages) while every human-facing surface — check and the app — still shows the full tier.
