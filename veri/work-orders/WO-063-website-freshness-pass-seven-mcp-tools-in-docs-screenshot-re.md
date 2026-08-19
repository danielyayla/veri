---
id: WO-063
type: work-order
title: "Website freshness pass — seven MCP tools in docs, screenshot refresh after WO-062"
status: backlog
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-012
    rel: implements
  - id: REQ-003
    rel: informed-by
  - id: REQ-005
    rel: informed-by
  - id: WO-062
    rel: informed-by
---

## Summary

Bring the public site back in line with the shipped app. The MCP server now registers seven tools (get_context, search, get_document, get_neighbors, file_decision, file_work_order, file_receipt) and the README already says seven, but site/docs/quickstart.html and site/docs/connect-claude-code.html still tell users to expect four — anyone following the verify steps sees a mismatch. REQ-003 and REQ-005 carry the same stale "four tools" wording. Separately, both landing-page screenshots (site/assets/home.png, work-order.png) were shot at WO-029 (2026-08-17) and predate the local graph (WO-052), Board folded into Work Orders (WO-053), split panes (WO-055), light mode (WO-060), and the document-view rework (WO-061/WO-062); reshoot them once WO-062 lands so the document view is stable.

## In scope

- Update site/docs/quickstart.html (the "four tools" list in the verify step) and site/docs/connect-claude-code.html (the "/mcp should list veri with four tools" line) to name all seven tools
- Correct the same "four tools" wording where it appears in REQ-003 and REQ-005
- Reshoot site/assets/home.png and site/assets/work-order.png from the current app after WO-062 is done, keeping the existing dimensions (1560×952) and updating alt text if the visible UI elements changed
- Sweep the remaining site pages (index, workflow, reference, troubleshooting) for any other claims invalidated by WO-051–WO-062

## Out of scope

- Any redesign of the site's layout, copy voice, or structure
- New documentation pages or new sections
- Changes to the deploy workflow (site.yml) or release process
- Changes to the MCP server's tool set itself

## Requirements

- [[REQ-012]] — implements
- [[REQ-003]] — informed-by
- [[REQ-005]] — informed-by
- [[WO-062]] — informed-by

## Acceptance tests

- [ ] quickstart.html and connect-claude-code.html name exactly the seven tools registered in packages/mcp/src/server.ts, and no site page says "four tools"
- [ ] REQ-003 and REQ-005 no longer claim four tools
- [ ] home.png and work-order.png show the post-WO-062 UI, and their alt text matches what is visible
- [ ] Site deploy for the change succeeds and the live pages reflect it

## Receipts

(none yet)
