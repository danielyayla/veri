---
id: WO-036
type: work-order
title: Settings area
status: done
created: 2026-08-18
updated: 2026-08-18
links:
  - id: SRC-014
    rel: designed-by
  - id: REQ-004
    rel: extends
  - id: REQ-005
    rel: extends
  - id: REQ-010
    rel: extends
  - id: DEC-012
    rel: constrained-by
---

> **Reviewed and approved by Daniel 2026-08-18.** Implementation
> accepted as shipped (bc8550e + 2908b3f), including the two bundle
> deltas recorded in the receipt (config-state dot without a port
> per [[REQ-005]]; no failure states in the Updates status per
> [[REQ-011]]).

## Summary

Delivers the [[SRC-014]] Settings area: the gear popover (PROJECT /
APPLICATION groups) and the Settings view tab with sub-nav,
re-homing the two configuration surfaces that held primary-nav
slots — the [[WO-024]] template settings view ([[REQ-010]]) and the
[[WO-007]] agent connection panel ([[REQ-005]]) — and adding
Project settings and Updates sections. The high-fidelity bundle
lives in `design/sidebar-navigation/`.

## In scope

- The gear popover per the bundle: PROJECT (Templates, Agent
  connection with live status dot and port meta, Project settings)
  and APPLICATION (Updates with version meta, Appearance as a
  "soon" placeholder). Replaces the interim popover from
  [[WO-035]].
- The Settings view as a view tab like Board — one instance,
  closeable, preview semantics — 190px sub-nav beside a 620px
  max-width body, opening at the invoked section.
- Templates section: re-home the [[WO-024]] template settings view
  unchanged in content; retire its old entry point.
- Agent connection section: re-home the [[WO-007]] connection
  panel (status card, client and config rows, snippet, LIVE CHECK)
  unchanged in content; retire the rail-era entry point.
- Project settings section: name, path, format marker, workflow
  doc.
- Updates section: version, channel, update status ([[WO-028]]
  surfaces).

## Out of scope

- Appearance settings beyond the placeholder row.
- Any new template or connection functionality — this re-homes
  existing surfaces.
- Sidebar and type panel work ([[WO-035]]).

## Requirements

Extends [[REQ-004]] (desktop UI), [[REQ-005]] (agent connection),
and [[REQ-010]] (templates). Designed by [[SRC-014]]; the design
bundle in `design/sidebar-navigation/` is the visual spec
([[DEC-012]] gate satisfied on its approval, 2026-08-18).

## Acceptance tests

- [x] Gear popover matches the bundle's grouping and anatomy; the
      agent status dot and meta reflect live connection state
- [x] Each popover item opens the Settings view at its section;
      the view is a single closeable tab with preview semantics
- [x] Templates and Agent connection sections are functionally
      equivalent to their previous views, and the old entry points
      are gone
- [x] Project settings and Updates sections render the specified
      content
- [x] `veri check` and `npm test` are clean

## Receipts

- 2026-08-18 — bc8550e — packages/ui/src/renderer/app.ts, packages/ui/src/renderer/views/settings.ts, packages/ui/src/renderer/views/settings.test.ts, packages/ui/src/renderer/views/mcp.ts, packages/ui/src/renderer/views/home.ts, packages/ui/src/renderer/views/reader.ts, packages/ui/src/renderer/views/workorder.ts, packages/ui/src/renderer/tabs.ts, packages/ui/src/renderer/palette.ts, packages/ui/src/renderer/api.ts, packages/ui/src/preload.mts, packages/ui/src/main.ts, packages/ui/src/lib/updater.ts, packages/ui/renderer/styles.css (+ tests) — claude-code session: full implementation. Grouped gear popover (PROJECT / APPLICATION) replacing the WO-035 interim; Settings view as one closeable preview tab (190px sub-nav, sections opening as invoked); WO-024 Templates and WO-007 Agent connection re-homed unchanged with their view tabs, palette rows, and in-app links retired into Settings sections; Project settings (name, path, REQ-015 format label, workflow doc) and Updates (version, channel, status via new app-info/update-status IPC) as read-only cards. Two deliberate deltas from the bundle, both for consistency with accepted requirements: the popover's agent meta is the static config-state dot with no `:port` — the server is stdio-launched by the agent, so a port or "live" state would be fiction and REQ-005 forbids implying client status (same resolution as WO-035's dot); the Updates status line never surfaces failed checks (REQ-011/DEC-034 — the log is where failures go). Re-homed sections keep their native widths; the 620px cap applies to the two new sections. Verified live via the screenshot harness (popover, all four sections). 256 tests pass across the workspace, veri check clean (101 docs, 0 issues).
