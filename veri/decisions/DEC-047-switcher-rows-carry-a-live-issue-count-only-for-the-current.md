---
id: DEC-047
type: decision
title: "Switcher rows carry a live issue count only for the current project"
status: proposed
created: 2026-08-19
updated: 2026-08-19
links:
  - id: WO-051
    rel: constrains
---

## Choice

`veri:list-recent-projects` (WO-051) computes each MRU row's docCount with a light readdir count (no parse, no git). An issue count requires parsing, so only the current project's row gets one — read off the SnapshotBuilder's already-built snapshot for free. Every other row reports issueCount 0, which the popover renders as no issue dot. The ProjectInfo IPC shape and the renderer are unchanged.

## Rejected alternatives

- **Keep the per-project full buildSnapshot for MRU rows** — the leak WO-051 removes: up to 20 corpus loads and ~120 git processes to open a popover.
- **Persist last-known issue counts in the MRU JSON** — stale counts presented as live state, and bookkeeping a derived value against DEC-002's derive-don't-store posture.
- **Parse (without git) each MRU project on popover open** — cheaper than today but still O(total docs across 20 projects) per open; the count would remain wrong about git-independent staleness anyway.
- **Drop issueCount from ProjectInfo entirely** — an IPC-shape and renderer change; WO-051 holds the Snapshot/IPC shapes fixed.

## Rationale

The whole point of the WO-051 switcher change is that opening the popover spawns no full snapshot builds and no git processes; an issue count for a non-current project is exactly that cost (a full parse of its corpus). The current project's count is already paid for by the builder, so it stays live where it matters most — the project the user is looking at. Issue state for other projects reappears the moment one is opened.
