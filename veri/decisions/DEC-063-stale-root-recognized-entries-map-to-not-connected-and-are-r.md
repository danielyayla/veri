---
id: DEC-063
type: decision
title: "Stale-root recognized entries map to not-connected and are re-pointed in place"
status: proposed
created: 2026-08-20
updated: 2026-08-20
links:
  - id: WO-071
    rel: constrains
  - id: DEC-011
    rel: extends
  - id: DEC-013
    rel: extends
---

## Choice

A recognized veri entry (DEC-011 shape) whose project-root argument does not resolve to the open project is reported as the existing `not-connected` status in the agent picker, and Set up & launch re-points it: for Codex's user-global TOML, only the `args` line inside the existing `[mcp_servers.veri]` section is rewritten in place — every other line of the file, including the block's position, comments, and surrounding blank lines, is preserved verbatim. JSON status checks apply the same comparison, resolving relative roots against the project root so this repo's own `"."`-style entry stays connected. Detection remains read-only: nothing is rewritten until the user clicks Set up & launch.

## Rejected alternatives

- **A new `stale` AgentStatus with its own picker row** — a fifth row state SRC-003 never designed, for a case the `not-connected` row's action (write a correct entry) already handles; more UI for zero extra capability.
- **Treating a wrong-root recognized block as `conflict`** — punts Veri's own writes back to the user as manual edits; conflict is reserved for entries Veri did *not* write (DEC-011).
- **Auto-repairing the root during detection** — detection runs on every picker open (DEC-002 re-derives from disk); silent writes on a read path would ping-pong the global file between two open projects and violate least surprise. The write stays behind the explicit Set up & launch click.
- **Rewriting the whole veri section on re-point** — replacing header-to-next-header text also consumes the blank lines and comments between blocks; the args-line-only edit keeps the never-lose-other-content guarantee absolute at the text level.

## Rationale

The recognized shape is the ownership marker (DEC-011), so a recognized block pointing at another project is Veri's own stale entry — replacing it is squarely inside the "recognized shape or hands off" rule, and refusing to would strand users of the user-global Codex config on manual edits. Mapping the stale case to `not-connected` reuses SRC-003's existing four row states (`connected` honestly means "connected to this project"), and the args-line-only rewrite is the narrowest write that fixes the root, mirroring the JSON panel's "Fix path" repair semantics.
