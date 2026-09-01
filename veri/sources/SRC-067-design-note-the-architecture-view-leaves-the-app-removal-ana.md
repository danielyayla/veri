---
id: SRC-067
type: source
title: "Design note — the Architecture view leaves the app: removal anatomy and the surfaces that remain"
status: imported
kind: design
created: 2026-09-01
updated: 2026-09-01
links:
  - id: WO-150
    rel: designs
  - id: REQ-004
    rel: designs
  - id: DEC-144
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: SRC-036
    rel: revisits
  - id: SRC-049
    rel: revisits
---

> Drafted 2026-09-01 by an agent session (Claude Code) at Daniel's direction, as the design-gate artifact for [[WO-150]] ([[DEC-012]]). No mockup bundle: the change is subtractive, and every surviving surface renders exactly as it does today. Revisits [[SRC-036]] (Architecture in the app: the map, the rules view, observed violations) and [[SRC-049]] (the sidebar view row) — both reversed by [[DEC-144]].

## What leaves, by surface

- **Sidebar**: the `viewItem('architecture', 'Architecture', '⌗')` view row (app.ts ~2812). After removal the HOW header groups the Work Orders collection; no other row moves.
- **View machinery**: `'architecture'` leaves the `View` union (app.ts:75); `architectureView` and both its tabs (Map and Rules, [[SRC-036]]) are deleted with `views/architecture.ts`, its test, and `archderive.ts` (+test) — the renderer-side derivation has no other consumer.
- **Home**: the architecture card and the provisional `architecture ↗` affordances (app.ts ~2810 names all three entry points: Home card, ⌘K entry, inline affordances). The Home grid closes up; no replacement card.
- **Palette**: the ⌘K "Architecture" view entry.

## Behavior at the edges

- **Stale session state**: a persisted tab or last-view naming the removed `'architecture'` key restores to Home silently — no error surface, matching the tolerance the tab-restore path already has for unknown keys (verify; if restore throws on an unknown view key, guard it in this change).
- **Keyboard/focus**: the removed row's fkey and any `navigateFocused(..., 'architecture', ...)` call sites (app.ts ~1346) go with it; tab order through the sidebar must stay continuous.

## What deliberately stays

- The **modules registry** on WF-001 and everything `get_intent` / `veri intent` reads — retrieval, not enforcement ([[DEC-144]]).
- The Work Orders panel, detail, reader, review surface — untouched; this note claims only the architecture surfaces.
- Sequencing: independent of [[WO-152]]'s fold. Whichever lands first, the other's surfaces are untouched by this change.

## Done looks like

The app builds and runs with no Architecture view, row, card, palette entry, or dead import; a session whose saved state referenced the view opens on Home; the sidebar reads WHY / WHAT / HOW with HOW grouping Work Orders ([[REQ-036]] as amended 2026-09-01).
