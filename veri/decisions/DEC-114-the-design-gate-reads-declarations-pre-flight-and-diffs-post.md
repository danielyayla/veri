---
id: DEC-114
type: decision
title: "The design gate reads declarations pre-flight and diffs post-hoc; mention matching demotes to an advisory"
status: active
approved: 2026-08-27
created: 2026-08-26
updated: 2026-08-27
links:
  - id: WO-113
    rel: derived-from
  - id: DEC-039
    rel: extends
  - id: DEC-040
    rel: follows-from
  - id: DEC-081
    rel: follows-from
---

## Choice

Implementing [[WO-113]], the design gate's evidence splits into three tiers,
each named in its own message so a maintainer knows what was read:

1. **Issue tier — declared binds, pure.** `checkDesignGate` fires when a
   started (in-progress/done, non-withdrawn) work order's `binds: paths:`
   declaration claims a `design_gate_paths` entry — a pattern that names the
   gated path or a glob that covers it — and the work order links no
   resolvable `designed-by` document. Pure over documents, so `veri check`,
   `run_check` over MCP, and the app reach the same verdict; the issue kind
   stays `ui-wo-without-design` and the message names the declaration as its
   evidence.
2. **Advisory tier — git diff, host-collected.** `checkDesignGateDiff` runs
   over the same `GitFacts` the other git-backed checks consume ([[DEC-040]]):
   an in-progress work order whose claimed commits (the `WO-nnn:` subject
   convention) touched a file under a gated path, without a covering binds
   declaration and without a `designed-by` link, earns a
   `design-undeclared-touch` advisory naming the commit, the file, and the
   diff as evidence. Advisory, not issue, because the git tier is unavailable
   over MCP ([[DEC-081]]) and an issue only some surfaces can compute would
   fork the verdict; hosts without git get a skip note when gate paths are
   declared, never a silent omission. Scope is in-progress only — auditing
   closed work orders retroactively is out of scope per WO-113.
3. **Advisory tier — mention matching, demoted, pure.** The v1 body-text
   heuristic survives only as a `design-mention` advisory for the honest gap
   the declaration misses: a started work order that declares no binds paths
   at all, links no design, and whose prose — minus `## Out of scope`
   (WO-112) and minus `## Receipts`, which record history the diff tier reads
   directly — names a gated path. The advisory tells the author to declare
   the path in `binds: paths:` or link the design. A work order that declares
   binds has spoken; its prose is no longer evidence.

A resolvable `designed-by` link satisfies all three tiers ([[DEC-026]]'s
note-style exemption included); with no `design_gate_paths` declared, all
three are inert. For diff evidence a gate path is read as a repo-root
directory prefix (`file === path` or `file.startsWith(path + '/')`);
declarations match when the pattern text contains the gate path or the glob
matches the gated directory.

## Rejected alternatives

- **Diff evidence at issue tier** — the strongest signal, but git facts are
  host-collected and unavailable over MCP ([[DEC-081]]); an issue-tier gate
  only some surfaces can see is a gate agents cannot self-check against,
  forking the verdict WO-113's acceptance explicitly forbids forking.
- **Retiring mention matching entirely** — leaves the pre-commit honest case
  invisible: a work order that says "rework the app panel" in scope, declares
  no binds, and has not yet committed would pass every tier silently until
  the diff catches it after the fact — too late for a gate whose point is
  design-first.
- **Keeping mention matching at issue tier alongside declarations** — repeats
  the v1 false positives WO-113 documents (receipts, rationale, comparisons
  tripping the gate); prose stays too weak an evidence class to block on.
- **Making `binds:` mandatory on gated work via a new issue** — circular:
  which work is gated is only knowable from a declaration, a diff, or prose,
  so the demand collapses into one of the tiers above; the `design-mention`
  advisory already delivers it in actionable form.
- **Reading receipt-cited SHAs instead of the subject convention for the diff
  tier** — receipts already carry their own verification (provenance,
  WO-044); `commitsByWorkOrder` reads the same claim the rest of the git tier
  trusts, and a commit cited by receipt but not prefixed is provenance's
  finding, not the gate's.

## Rationale

The split follows where each evidence class is trustworthy and when it is
available. Declarations exist before work starts — exactly when a
design-first gate must fire — and are affirmative claims, so they carry
issue weight everywhere, purely. Diffs are ground truth but arrive late and
only where a host collects git ([[DEC-040]]), which is the established
advisory posture for every other git-backed check. Prose is the weakest
class — it tripped on exclusions, receipts, and comparisons — so it keeps
only advisory weight, and only where no stronger evidence exists. Origin:
implementing [[WO-113]].
