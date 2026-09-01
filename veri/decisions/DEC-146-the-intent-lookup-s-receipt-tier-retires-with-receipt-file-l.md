---
id: DEC-146
type: decision
title: "The intent lookup's receipt tier retires with receipt file lists — bindings and the module registry remain"
status: active
approved: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: WO-141
    rel: constrains
  - id: DEC-099
    rel: amends
---

## Choice

lookupIntent — the derivation behind `veri intent` and `get_intent` — reads work-order code bindings and the module registry alone. The receipt tier of DEC-099's binding > receipt > module ranking retires: its evidence base was parseReceipts' path tokens, which left the format with DEC-142, and WO-141's scope names every consumer of those tokens. A done work order now matches nothing at document level in the pure lookup; the shipped-work answer belongs to git — `veri implemented` derives it on demand from WO-nnn: commit subjects, which never depended on receipt file lists. IntentVia narrows to 'binding'; the render says so ("bindings and the module registry").

## Rejected alternatives

- **Keep a local path harvester inside intent.ts** — preserves the receipt tier by re-implementing the retired parsing one file away from where it was deleted; WO-141's boundary is "parseReceipts and everything that consumed it", and the dual bookkeeping DEC-142 removed would return under a new name.
- **Let done work orders keep matching via their lingering bindings** — a binding is a live claim by in-flight work (DEC-099); promoting stale globs to evidence for shipped code would rank a broad leftover pattern above git's actual record of what shipped.
- **Match receipts on their raw text** — substring matching over prose is path harvesting with fewer rules: false positives from summaries that merely mention a path, which is exactly the leak the files-segment-only rule existed to prevent.

## Rationale

DEC-142 removed the files-touched list from receipts on purpose — the tier's evidence base is gone by decision, not by accident, and every option that preserves the tier re-creates the retired bookkeeping somewhere else. The sacrifice is named: over MCP, where the git tier is deliberately unreachable (DEC-081), get_intent no longer surfaces the done work orders that shipped a file; the terminal's `veri implemented` still answers from history. This narrows DEC-099's ranking for the document-pure lookup; revising or superseding DEC-099 itself is the user's act — this proposal records the change and its why. Revisit when agents working over MCP demonstrably miss governing intent for shipped code and no terminal is in reach.
