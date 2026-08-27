---
id: SRC-058
type: source
title: "Evidence backfill investigation: the 27 intuition-only requirements mapped to their candidate origins"
status: imported
kind: investigation
created: 2026-08-27
updated: 2026-08-27
---
## Why this exists

REQ-038's intuition-only advisory flagged 27 accepted requirements
with no `derived-from` link to any source and no inbound outcome
evidence. Each needs a maintainer verdict: link the evidence it
actually came from, or retire it. This investigation (agent-conducted,
2026-08-27: every requirement body read, source bodies read, git
history traced per file) maps each requirement to candidate evidence —
and says plainly when none exists. No link was stretched to silence an
advisory: a source that merely mentions a topic is not evidence the
requirement derived from it.

## Headline

**12 strong · 1 plausible · 14 none — and all 14 "none" verdicts are
keep-candidates.** Every evidence-less requirement is implemented,
most with done work orders and receipts; none looks like a retirement
candidate. The pattern: requirements born *from* evidence (the
SRC-012, SRC-016, SRC-037 batches) are cleanly traceable; requirements
born from founding intuition or in-session judgment have their only
provenance in git history, and the design SRCs that ride alongside
them (SRC-001/002/003/006/008/036/039) are *downstream* artifacts —
honest `designed-by` links, dishonest `derived-from` ones.

## Strong candidates — a `derived-from` backfill would be honest

| Requirement | Evidence | Why |
|---|---|---|
| [[REQ-004]] | [[SRC-001]] | The mockup pre-dates the requirement; REQ-004's own body says "the shape, per the design reference in SRC-001" |
| [[REQ-012]] | [[SRC-012]] | SRC-012 states verbatim it was "captured as the evidence base for the draft requirements REQ-012..REQ-015", same commit (37c700c) |
| [[REQ-013]] | [[SRC-012]] | Stages 4–5 (first launch, agent connection as make-or-break, the Node dependency) are the requirement's exact content |
| [[REQ-014]] | [[SRC-012]] | Stage 8 (GitHub Issues, in-app prefilled report, no-telemetry stance) point for point |
| [[REQ-015]] | [[SRC-012]] | Stage 2 names "the unowned risk: WO-028 explicitly punted versioning of the veri/ format → REQ-015" |
| [[REQ-016]] | [[SRC-016]] | Critique scored context preservation 2/5, listed navigation history as P0; REQ filed in commit 5d55663 "SRC-016 follow-up" |
| [[REQ-017]] | [[SRC-016]] | Finding 3: "the agent is handed a workflow bigger than its tools" — quoted directly |
| [[REQ-018]] | [[SRC-016]] | The scale simulation (~19.8k tokens for WO-028 at 100 docs) is this requirement's frame |
| [[REQ-019]] | [[SRC-016]] | The requirement's drift list is the critique's drift list |
| [[REQ-020]] | [[SRC-016]] | "Accessibility floor (real buttons, focus states, ARIA)" is a named P0 item |
| [[REQ-021]] | [[SRC-016]] | P1 items "receipt verification against git" and "first drift advisories"; quotes the finding that provenance is "social, not mechanical" |
| [[REQ-023]] | [[SRC-037]] | The spike measured the ~40 MB Tauri basis; "SRC-037 framed it" per the REQ body; filed one hour before the requirement |

Plausible: [[REQ-003]] ← [[SRC-001]] — the mockup says its package-
rules wording was "adopted into REQ-003", covering the wording but
not the requirement's existence.

## No evidence found — 14 keep-candidates

[[REQ-001]], [[REQ-002]], [[REQ-005]], [[REQ-006]], [[REQ-007]],
[[REQ-008]], [[REQ-009]], [[REQ-010]], [[REQ-011]], [[REQ-022]],
[[REQ-024]], [[REQ-025]], [[REQ-026]], [[REQ-030]].

Their provenance, in brief:

- **Founding pre-code commit 4099a2d** (2026-08-06, from
  veri-starter/): REQ-001, REQ-002, REQ-003's existence, REQ-008's
  gate ("AI-authored artifacts silently become project canon").
  These are the foundation everything else depends on; the corpus
  could not have asked for them because it did not exist yet.
- **In-session judgment, evidenced only by the introducing commit**:
  REQ-005 (fdcf713 — "users shouldn't hand-edit .mcp.json"),
  REQ-006 (25baf52 — rules drifting across templates.ts/check.ts),
  REQ-009 (39dcc51), REQ-010 (the REQ-006 deferral, af6e698, honest
  provenance already carried by its `extends` link), REQ-011
  (4ffa9b2), REQ-022 (7f8f724, `extends: REQ-021` is the internal
  provenance), REQ-024 (2e1950a), REQ-025/REQ-026 (f7464a2/bcc16f2,
  the go-public push), REQ-030 (dbb3014).
- **REQ-007** records genuine observed confusion ("users read [Serve
  via MCP] as an action that hands the work order to an agent") that
  was never captured as a source — a candidate for a retroactive
  user-feedback SRC if the maintainer remembers the incident.
- **REQ-023's trigger** — the first user's download-size complaint,
  reported 2026-08-25 — likewise lives only in the REQ body; a
  retroactive user-feedback SRC would be honest.
- **REQ-009** has after-the-fact validation: SRC-016 judged the
  editor "Veri's best surface; genuinely file-native" — honest as
  *inbound outcome* (`supports`) evidence even though nothing
  documents the origin.

**Verdict options per requirement**: backfill the strong links;
accept git-only provenance for the founding/in-session set (the
advisory then stands as a truthful statement about them); or file
retroactive user-feedback sources where the triggering incident is
remembered (REQ-007, REQ-023).

## Source kind reclassification candidates

- [[SRC-016]] → investigation — full-surface evaluation, scored findings
- [[SRC-037]] → investigation — measured feasibility spike, real numbers
- [[SRC-040]] → investigation — verified audit of the live repository
- [[SRC-043]] → external-eval — external spec, delta analysis
- [[SRC-044]] → external-eval — competitor transcript plus delta
- [[SRC-046]] → external-eval — Veri judged against the factory model
- (borderline) [[SRC-012]] → investigation — planning map and gap
  inventory; arguably stays reference

The design SRCs (SRC-001..011, 013..015, 017..036, 038..039, 041..042,
045, 047..055) are kind `design`; absent-means-reference keeps them
valid until reclassified.
