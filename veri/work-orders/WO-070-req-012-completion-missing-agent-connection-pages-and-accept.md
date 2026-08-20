---
id: WO-070
type: work-order
title: "REQ-012 completion — missing agent connection pages and acceptance verification"
status: done
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
  - id: SRC-035
    rel: designed-by
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

- [x] Every agent the app's connection panel offers has a site connection page stating what is written, where, and a verification step.
- [x] Following the quickstart from the live site on a machine without a dev checkout ends with a verified agent connection.
- [x] The site download action resolves to the newest published release immediately after a release, with no site commit.
- [x] All [[REQ-012]] acceptance criteria proven by this run are checked.

## Receipts

- 2026-08-20 · commits c31e798, 2241fba · files: site/docs/
  connect-cursor.html, connect-codex-cli.html, connect-gemini.html
  (new), connect-claude-code.html, quickstart.html, reference.html,
  troubleshooting.html, workflow.html, [[REQ-012]], this WO.
  Connection pages written for all four agents in the app's
  adapter registry, mirroring agents.ts: Cursor (.cursor/mcp.json),
  Codex CLI (~/.codex/config.toml TOML block, user-global caveat
  documented), Gemini CLI (.gemini/settings.json); docs-strip label
  renamed to "Connect your agent" with URLs unchanged; Claude Code
  page's tool table completed to all seven tools; pages verified
  in dark and light mode locally and live on Pages (200s).
  Acceptance verification: quickstart walked live against installed
  Veri 0.1.7 driving the real UI — sample project seeded in a fresh
  ~/Documents folder (17 docs, NEEDS REVIEW and both deliberate
  HEALTH issues as documented), one-click .mcp.json write, all four
  static checks green, LIVE CHECK handshake green ("serving this
  project, 17 documents, 7 tools, node v22.5.1"). The walkthrough
  caught stale wording (⌁ rail icon → Settings → Agent connection)
  and it was fixed on all five affected pages. Download criterion:
  four releases (v0.1.4–v0.1.7) published with zero site commits;
  the releases API the resolver uses returns the v0.1.7 DMG.
  Workflow guide reviewed against REQ-012's bar — all five types,
  path of work, approval gate — no changes needed. README verified
  download-first. All five REQ-012 boxes checked.
