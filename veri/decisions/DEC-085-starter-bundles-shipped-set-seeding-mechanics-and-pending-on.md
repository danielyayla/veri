---
id: DEC-085
type: decision
title: "Starter bundles: shipped set, seeding mechanics, and pending-only posture"
status: proposed
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-091
    rel: constrains
  - id: REQ-008
    rel: constrained-by
---

## Choice

Three starter bundles ship in v1 — `cli-tool`, `library`, `web-app` —
as plain fixture trees at `packages/cli/starters/<name>/veri/`, beside
the demo. Each bundle is 4 draft requirements naming the type's
canonical concerns, 2 proposed decisions demonstrating the form with
real rejected alternatives, and a type-tuned `workflow.md` — shipped
`draft`, unlike the plain scaffold's accepted default ([[DEC-019]]),
so nothing in a bundle carries an `approved:` stamp ([[REQ-008]]:
promotion is the owner's act; the seed is a conversation starter, not
canon). Content is architecture-pattern level and names no products,
vendors, or harnesses.

The seam mirrors the demo's ([[DEC-007]]): core's `scaffoldProject`
gains a `starterRoot` path option (mutually exclusive with `demo`) and
resolves no bundle names; the CLI owns the names, listing them by
reading the `starters/` directory so the list can never drift from the
shipped content. The flag is `veri init --starter <name>`; a missing
or unknown name fails with the available list.

Seeding does two things copying alone would not:

1. **Dates restamp to init day.** Fixture files carry the placeholder
   `0001-01-01`; scaffold rewrites `created:`/`updated:` (frontmatter
   only) to `localToday()` — the seeded documents are born at init,
   and their stamps read the local calendar ([[DEC-076]]). The demo
   path keeps its fictional history untouched.
2. **Seeded ids feed `veri/ids`.** The high-water record ([[DEC-037]])
   is written from the seeded ids at init, so the floor is correct
   from the first document filed afterwards and deleting a seeded
   document never causes id reuse.

## Rejected alternatives

- **Allocate seeded ids through `createDocument` at init** — would
  break the bundles' internal cross-links (`[[REQ-001]]` in a seeded
  decision must resolve), for no gain: a fresh project's first ids are
  the fixture's ids by construction, and recording them in `veri/ids`
  gives the same floor guarantee.
- **Ship the bundle workflow `accepted` like the plain scaffold's
  default ([[DEC-019]])** — the default workflow is Veri's own vetted
  text; a bundle workflow is opinionated seed content the owner should
  read before it binds. One posture for everything seeded (pending)
  is also the simpler rule to state and test.
- **A template-token rendering pass (`{{date}}`, `{{name}}`)** — a
  second template machinery next to [[DEC-023]]'s, which WO-091
  explicitly leaves untouched; the placeholder-date rewrite is the
  only substitution needed.
- **Four bundles (adding `api-service`)** — its canonical concerns
  (contract stability, error shapes, versioning) overlap `library` and
  `web-app` heavily; three well-crafted bundles beat four with
  padding, and the directory-derived list makes adding one later a
  content-only change.
- **Bundles resolved by name inside core** — core would need to know
  the CLI package's layout (the sideways reach [[DEC-007]] rejected
  for the demo); the path-in option keeps core dependency-free and the
  desktop app free to pass its own root later.

## Rationale

The starter path exists so a greenfield project's first `veri check`
runs against substance, not a blank page — but substance an agent or
owner has not reviewed must not bind ([[REQ-008]]). Everything above
serves that line: pending-only statuses make the seed safe to ship,
correct id floors and init-day dates make it indistinguishable from
documents the owner filed by hand, and the demo-shaped seam adds no
new machinery to maintain. The app's New-project flow is deliberately
not wired: passing a starter name through would require a picker in
the New-project sheet, which trips the design gate — CLI-only until a
follow-up work order designs that surface.
