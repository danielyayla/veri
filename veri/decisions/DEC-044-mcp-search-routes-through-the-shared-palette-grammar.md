---
id: DEC-044
type: decision
title: "MCP search routes through the shared palette grammar"
status: active
approved: 2026-08-19
created: 2026-08-18
updated: 2026-08-19
links:
  - id: WO-048
    rel: constrains
  - id: DEC-009
    rel: follows-from
  - id: SRC-022
    rel: informed-by
---

## Choice

The MCP `search` tool now calls `paletteSearch` (parsePaletteQuery + rankDocs, no recency feed) instead of the plain-substring `searchDocs`. One query grammar — free text, req:/dec:/wo:/src:, is:, and the new related: — behaves identically in the palette, the Search view, and the MCP tool, and the tool's hits come back in the shared library's rank order. `searchDocs` remains exported for its WO-003 substring semantics.

## Rejected alternatives

- **Bolt related: onto searchDocs, keep substring text matching** — `related:WO-028` alone would agree across surfaces, but any composed query (`related:REQ-004 gate`, `related:WO-028 is:active`) would diverge: searchDocs has no type:/is: grammar and matches ids by substring, so `is:active` would be searched as literal text and return nothing. Two grammars drifting is exactly what DEC-009 exists to prevent.
- **Leave the MCP tool untouched and only document the filter** — the description would name a filter the tool cannot execute; the acceptance test fails and agents get silently wrong results.
- **A separate `related` parameter on the MCP tool** — same hits reachable, but the query string an agent copies from the UI would not paste into the tool; one grammar shared verbatim is the simpler contract.

## Rationale

WO-048's acceptance test requires the same related: query to return the same hits via the MCP search tool, and SRC-022 places the filter in the shared library precisely so all three surfaces gain it in one commit — one concept, one implementation (manifesto 7, the DEC-009 principle of importing the one true implementation). Two consequences are accepted: an empty query now lists every document (rankDocs base score) where searchDocs returned nothing, and id matching tightens from substring-anywhere to the palette's exact/prefix tiers.
