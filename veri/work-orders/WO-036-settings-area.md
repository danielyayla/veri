---
id: WO-036
type: work-order
title: Settings area
status: backlog
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

- [ ] Gear popover matches the bundle's grouping and anatomy; the
      agent status dot and meta reflect live connection state
- [ ] Each popover item opens the Settings view at its section;
      the view is a single closeable tab with preview semantics
- [ ] Templates and Agent connection sections are functionally
      equivalent to their previous views, and the old entry points
      are gone
- [ ] Project settings and Updates sections render the specified
      content
- [ ] `veri check` and `npm test` are clean

## Receipts

(none yet)
