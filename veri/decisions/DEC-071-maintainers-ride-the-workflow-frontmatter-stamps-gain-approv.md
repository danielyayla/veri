---
id: DEC-071
type: decision
title: "Maintainers ride the workflow frontmatter; approval stamps gain approved_by"
status: proposed
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-077
    rel: constrains
  - id: REQ-026
    rel: satisfies
  - id: REQ-008
    rel: extends
  - id: DEC-015
    rel: builds-on
  - id: DEC-059
    rel: consistent-with
  - id: DEC-025
    rel: consistent-with
---

## Choice

Two additive fields, both optional, both invisible to solo projects:

- The workflow document's frontmatter — the established home for project
  configuration (`design_gate_paths`, the [[DEC-059]] `modules` registry)
  — gains an optional **`maintainers:`** list of free-form display names.
  Its presence is what activates team semantics.
- The approval stamp gains an optional **`approved_by: <name>`** line,
  written directly under `approved:` by the same [[DEC-015]]
  line-targeted edit (`approveDocument` grows one line; everything else
  stays byte-for-byte). The CLI takes `veri approve <ID> --as <name>`;
  when the project has a maintainers list and `--as` is omitted, the CLI
  defaults to the host-collected git `user.name` if — and only if — it
  exactly matches a listed maintainer, and errors asking for `--as`
  otherwise. Core stays pure: the name is always passed in.

Validation, tiered per [[DEC-025]]:

- Project **with** a maintainers list: `approved_by` naming someone not
  on the list is a check **issue**; a promoted document with no
  `approved_by` at all is an **advisory** — every stamp made before the
  team formed is grandfathered as a warning, never a failure.
- Project **without** a maintainers list: `approved_by` becomes a
  schema-known optional field (today it would ride passthrough
  unvalidated) and no check ever fires. Existing repos are byte-identical
  in behavior.

Gate parity is automatic: the REQ-008 gate tests stamp presence, not
identity, so a second maintainer's stamp binds exactly like the owner's —
`approved_by` is provenance, not a permission check.

## Rejected alternatives

- **A separate `veri/maintainers` file** (DEC-030-style root marker) —
  another root file for one list, and agents would need a new read to see
  it; the workflow document already carries project config and arrives as
  the first section of every context package, so the roster travels free.
- **Approver identity from the stamp commit's git author only** — leaves
  the files silent about who approved (DEC-002 makes files the record),
  is invisible to pure core, and evaporates under history rewrites,
  shallow clones, and squash merges.
- **Packing the name into the date field** (`approved: 2026-08-24
  daniel`) — breaks every existing date parse, the DEC-015 line edit, and
  the drift checker's stamp comparisons.
- **Signed commits or cryptographic approval** — real authentication,
  but infrastructure and ceremony far beyond the trust model; a team that
  shares push access already trusts its members, and git history is the
  audit trail.
- **Roles or per-type permissions** — explicitly out of REQ-026's scope;
  maintainers hold one right (stamping), uniformly.

## Rationale

The activation switch is the list itself: no list, no team semantics, so
the solo experience REQ-026 freezes is untouched by construction rather
than by care. Putting the roster in the workflow document follows the
established pattern for project-level facts and means every agent session
learns who may approve without a new tool or file. The issue/advisory
split makes adopting team semantics mid-project safe — historical stamps
warn, misattributed stamps fail — and keeping the gate identity-blind
keeps REQ-026's "the gate does not distinguish maintainers it trusts"
true mechanically.
