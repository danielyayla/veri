---
id: DEC-091
type: decision
title: "The check derivation is two core stages — typed findings for surfaces that render, presentation for surfaces that print"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-093
    rel: constrains
  - id: DEC-081
    rel: follows-from
  - id: DEC-040
    rel: follows-from
  - id: DEC-060
    rel: follows-from
  - id: REQ-021
    rel: satisfies
---

## Choice

Core's report module (packages/core/src/report.ts) exposes the derivation at two depths. deriveFindings(load, hostFacts) is the typed stage: the full detector orchestration — pure tier, git-backed tier, bound tests, observed architecture with severity routing — returning { issues: Issue[]; advisories: Advisory[]; skips: string[] } with the discriminated unions intact. buildCheckReport(load, hostFacts) keeps its exact shape and becomes a presentation view: it calls deriveFindings and flattens to the print records, so CLI, Action, and the MCP run_check tool change nothing. The app's snapshot pipeline (both buildSnapshot and SnapshotBuilder.build) calls deriveFindings with host facts it collects and caches itself — the doc-parse and git-facts caches stay host-side per DEC-040; only the orchestration (detector set, ordering, severity routing, skip-note wording) moves behind core's interface. Snapshot gains skips, carried unrendered until a design covers its surface. MCP's RunCheckResult — a field-by-field rename of CheckReport — is retired; the parity test keeps its CLI-subprocess mechanism, which is what keeps the mcp → cli edge out of the observed-import scan (DEC-060/DEC-061) while pinning the collector mirrors (DEC-081).

## Rejected alternatives

- Widen CheckReport to carry typed findings and let every surface flatten at its own edge — one export instead of two, but all three printing surfaces churn and each re-implements the print mapping, which is checking logic per DEC-081's own reasoning
- The app consumes the flattened CheckReport through an app-side adapter — no core change, but the renderer leans on the typed unions (about a hundred .kind accesses) and would re-derive them from strings; shallowest outcome, and the skip/advisory wording would be parsed back out of prose
- Core owns fact collection via a host callback so the derivation can cache — puts collection orchestration in the package whose contract is purity over inputs (DEC-040), and the SnapshotBuilder caches are precisely host concerns (mtime horizons, HEAD keying)
- Replace the parity test's CLI subprocess with a direct mcp → cli test import — cheaper test, but the observed-import scan reads test files too, so the sideways edge DEC-060 forbids would appear in the app's own architecture view; the subprocess is the point, not the cost

## Rationale

The mismatch that kept the app off buildCheckReport was never the derivation — it was the return shape: the app renders findings and needs the unions, the other surfaces print lines. Splitting at that exact seam gives every surface the depth it can consume while the orchestration — the thing REQ-025 forbids duplicating — has one home. The split is the smallest honest cut: report.ts already computes the typed arrays internally and flattens only at the return statement, so deriveFindings is a naming of what exists, not new machinery. Carrying skips unrendered keeps this change out of the design gate's visual territory while ending the app's status as the one surface that can omit checks silently (REQ-021's posture).
