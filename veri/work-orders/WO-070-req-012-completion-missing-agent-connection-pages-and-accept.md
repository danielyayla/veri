---
id: WO-070
type: work-order
title: "REQ-012 completion — missing agent connection pages and acceptance verification"
status: backlog
created: 2026-08-20
updated: 2026-08-20
links:
  - id: REQ-012
    rel: implements
  - id: WO-029
    rel: extends
  - id: WO-063
    rel: extends
  - id: WO-065
    rel: extends
---

## Summary

The website shipped ([[WO-029]]), was freshened ([[WO-063]]), and was redesigned ([[WO-065]]), but [[REQ-012]]'s acceptance criteria were never verified and one is unmet: the app supports four agents (Claude Code, Cursor, Codex CLI, Gemini CLI per packages/ui/src/lib/agents.ts) while the site has only connect-claude-code.html. Write the three missing connection pages and run the full REQ-012 acceptance verification, checking off every criterion that proves out.

## In scope

- Connection pages for Cursor, Codex CLI, and Gemini CLI in site/docs/, each covering what Veri writes, where the config lands, and how to verify the connection works — content mirroring the adapters in packages/ui/src/lib/agents.ts, style matching the existing connect-claude-code.html and site.css.
- Review site/docs/workflow.html against REQ-012's bar: teaches all five document types and the path of work to a reader with no prior context; fix gaps found.
- Acceptance verification pass: the stranger path (site alone → understand → download current release → quickstart to a working agent connection), download action resolving to the latest release with no per-release site edit, README leading with download.
- Check off the [[REQ-012]] acceptance criteria this run proves.

## Out of scope

- Visual redesign of any existing page (done in [[WO-065]]).
- New documentation beyond the three connection pages and workflow-guide fixes.
- Hosting/domain changes; GitHub Pages per [[DEC-033]] stands.
- Windows/Linux install paths.

## Requirements

- [[REQ-012]] — implements
- [[WO-029]] — extends
- [[WO-063]] — extends
- [[WO-065]] — extends

## Acceptance tests

- [ ] Every agent the app's connection panel offers has a site connection page stating what is written, where, and a verification step.
- [ ] Following the quickstart from the live site on a machine without a dev checkout ends with a verified agent connection.
- [ ] The site download action resolves to the newest published release immediately after a release, with no site commit.
- [ ] All [[REQ-012]] acceptance criteria proven by this run are checked.

## Receipts

(none yet)
