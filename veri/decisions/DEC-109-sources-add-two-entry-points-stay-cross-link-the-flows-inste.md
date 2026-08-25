---
id: DEC-109
type: decision
title: "Sources add two entry points stay — cross-link the flows instead of merging them into a + menu"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: SRC-045
    rel: constrains
---

## Choice

The Sources type panel keeps both header entry points: the quiet `+` (author a new source) and the labeled import button (ingest external files via the review sheet). The label shortens from "Import files…" to "Import…" to relieve header crowding — the panel is already titled Sources, and the accessible name stays "Import files". Instead of merging the entries, the flows cross-link: the New Source popover gains a secondary "or import files…" link (source type only) that opens the same native-picker → review-sheet path, and the Sources empty state gains an import affordance beside the existing ghost "New Source…" row. SRC-045's "one flow, two entries" posture is preserved and extended: whichever entry a user reaches for first, the other path is discoverable in place.

## Rejected alternatives

- **`+` opens a menu with "Create Source" and "Import File" (Daniel's initial proposal)** — breaks cross-panel consistency: every other type panel's `+` creates directly, so the same control would behave differently in one panel, a worse violation than the redundancy it fixes. It also adds a click to the most common action for everyone, and buries the only persistent hint that file import exists (drag-and-drop has zero standing affordance until a drag is in flight).
- **Remove the import button entirely; rely on drag-and-drop plus palette/empty state** — trades away discoverability of import while the feature is still new; SRC-045 designates the button as the discoverable second entry for the invisible drag path. Revisitable once drag intake is well-established.
- **Keep both, change nothing** — leaves the Sources header carrying more chrome than any other panel and does nothing for users who reach the wrong entry first.

## Rationale

Daniel raised the redundancy of `+` plus "Import files…" side by side and proposed collapsing them into a `+` menu (Create Source / Import File). The critique found the redundancy smaller than it looks — the two actions are genuinely different (authoring vs. ingesting), and the existing styling already encodes the right priority: the unfamiliar action gets a label, the universal one stays a quiet icon. The crowding is real but is relieved by the shorter label; the confusion is relieved by cross-linking, which delivers the "one clear entry point" benefit (either entry finds both actions) without the menu's costs. Approved direction per Daniel's "Go with your recommendations" (2026-08-25).
