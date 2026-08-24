---
id: SRC-043
type: source
title: "Vellum spec — external product spec compared against Veri, delta analysis"
status: imported
created: 2026-08-24
updated: 2026-08-24
---

Provenance: a product specification titled "Vellum — Product Specification & Focus Plan" pasted by Daniel in a Claude Code session on 2026-08-24, with the question "how similar is the current implementation of Veri to this?" The spec describes an independently conceived product with the same thesis as Veri: requirements, decisions, and work orders as markdown files in-repo, drift as a CI check, agents fed over MCP.

## Where the spec and Veri already agree (no action)

Files as source of truth with no database ([[DEC-002]]); git as the collaboration layer with no accounts or sync; one core library under a CLI and an MCP server; context packages as the central agent operation ([[REQ-003]]); agent writes always landing as proposals gated by human approval ([[REQ-008]]); deterministic checking with CI exit codes and a published GitHub Action ([[REQ-025]]); ingestion shipped as agent instructions, not engine code ([[REQ-024]]); never calling a model in the core loop; self-hosting as the dogfood loop.

## The load-bearing delta: declared code bindings

The spec's central mechanism, absent from Veri. Key excerpts:

Work orders carry a binding block:

```yaml
binds:
  paths: ["src/billing/meter/**", "src/billing/limits.ts"]
  tests: ["tests/billing/test_metering.py::TestCaps"]
```

"`binds` is the load-bearing field of the whole system: it's what makes drift computable without semantics."

Drift rules built on it (spec §4, "v1 = declared bindings, deterministic"):
1. Diff range → changed files.
2. Changed file matches an active WO's `binds.paths` → claimed. Matches nothing → `unclaimed-code-change`.
3. WO building with no commits touching its bindings within N days → stale.
4. Bound test names that no longer exist → error.
5. Explicit warning against starting with semantic/LLM drift scoring: "the feature most likely to eat three months and produce a check people mute."

Veri's current drift detectors (`packages/core/src/drift.ts`) watch document lifecycle only — approved-then-edited, edited-after-done, in-progress on superseded authority ([[REQ-021]]). A source-code change no work order claims is invisible to `veri check`. Veri's existing plumbing is well positioned to close this: `CommitFact` in `packages/core/src/provenance.ts` already carries per-commit file lists, hosts already collect git facts and pass them to pure core ([[DEC-040]]), and findings already flow through the advisory tier ([[DEC-025]]).

## Second delta: agents cannot self-check over MCP

The spec exposes `run_check(scope?)` as an MCP tool — "drift report as structured JSON — lets agents self-check before proposing a commit." Veri's MCP surface has no check tool; agents in this repo shell out to `veri check`, but MCP-only agents in other harnesses cannot check at all.

## Deltas examined and judged not worth adopting

- Dotted-slug IDs (`req.billing.usage-caps`) vs Veri's sequential IDs with the high-water file ([[DEC-037]]) — pure churn.
- Git commit trailers (`Vellum: wo.x`) vs Veri's commit-subject convention — same information; subjects are visible in `git log --oneline`.
- Six node types (adds `feat.` and `ver.`) vs Veri's four — verification is better served by receipts ([[DEC-003]]) plus bound tests; the feature layer is unneeded at current graph depth.
- A separate `policy.yml` vs policy riding the workflow document ([[DEC-018]], [[DEC-039]], [[DEC-059]]) — Veri's shape is more self-consistent (policy is itself versioned and approvable).
- A stored derived index (`.vellum/index.json`) vs Veri's derive-on-demand posture — Veri's stance is strictly stronger.
- Closed six-relation edge vocabulary vs Veri's free-text `rel` — deferred, not rejected: a recognized-rel warn list riding workflow frontmatter may be worth a future work order.

The full spec text lives in the session transcript; this document captures the excerpts the derived work orders and decision stand on.
