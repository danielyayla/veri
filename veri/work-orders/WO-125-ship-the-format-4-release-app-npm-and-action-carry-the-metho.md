---
id: WO-125
type: work-order
title: "Ship the format-4 release: app, npm, and action carry the method type"
status: in-progress
claimed_by: opus-wo125
claimed_at: 2026-08-29
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-29
links:
  - id: REQ-015
    rel: implements
  - id: REQ-011
    rel: implements
  - id: REQ-040
    rel: derived-from
  - id: DEC-139
    rel: constrained-by
---

## Summary

This work order ships the readers that understand the project's current
on-disk format. It has had to do that twice: it was filed for format 3,
shipped `v0.4.0` on 2026-08-27 (receipted below), and was overtaken the
same day when [[WO-131]] bumped the marker to 4 for the method type.

The standing position is therefore unchanged and unmet. The released
0.4.0 app understands format 3 and refuses this project outright; the
`@verikb/*` packages on npm are still 0.1.0, two unpublished versions
behind; and the action's bundled `dist` predates the method type. The
whole skill library ([[REQ-040]]) — nine `MET-` documents, the shell
emitter, the widened MCP surface — exists only in git.

Re-scoped 2026-08-29 after the `fable-wo125` claim went stale with no
receipt; the claim was taken over rather than the work order withdrawn,
because its identity is unchanged.

## In scope

- CHANGELOG.md: move `## [Unreleased]` under a `0.5.0` heading
  covering the method type and format 4, the skill library and its
  shell emitter, the widened MCP surface (`list_documents`,
  `get_queue`, `get_receipts`, `init_project`, `supersede_decision`,
  `kind`/`outcome` on `file_requirement`), and DEC-139's restart
  obligation
- Bump the app version to 0.5.0 in its single source manifest
  (per RELEASING.md; a format bump is not a patch) and follow the
  RELEASING.md app checklist. No UI code changes: version bumps ship
  under the `vX.Y.Z` commit convention
- Lockstep `@verikb/*` publish at 0.1.2 — the version the manifests
  already carry and npm has never seen (2FA blocks CI token publish;
  either the OIDC trusted-publishing conversion lands first or the
  publish runs locally with an OTP)
- Rebuild and commit the action's bundled dist so `veri-check` on CI
  understands format 4
- Per [[DEC-139]], this work order bumps no marker itself but ships
  one: name the restart obligation in the release notes, so operators
  of a live MCP session know to reconnect

## Out of scope

- Any new core behavior — this ships what WO-127..138 already landed
- Pushing the tag, publishing the GitHub release, and running the npm
  publish: outward-facing acts that stay with the maintainer
- The OIDC trusted-publishing conversion itself (tracked separately;
  a local OTP publish is the fallback)

## Requirements

Delivers [[REQ-015]] (a newer-format project states "update Veri"
until the updated reader ships — this is the ship) and [[REQ-011]]
(the installed app self-updates to a build that opens the project).
Derived from [[REQ-040]]'s format bump, and constrained by
[[DEC-139]].

## Acceptance tests

- [ ] `CHANGELOG.md` has a `0.5.0` section covering the method type,
      format 4, the skill library, and the widened MCP surface, and
      `## [Unreleased]` is empty above it
- [ ] The app version reads 0.5.0 in its single source manifest, and
      no other manifest claims it
- [ ] The action's committed `dist` is rebuilt from a core that
      reports `CURRENT_FORMAT` 4
- [ ] `veri check` reports zero issues and the repo builds clean
      (`npm run build`, `npm test`)
- [ ] Handoff is complete: the maintainer has the exact tag, release,
      and npm publish commands, with the 2FA constraint named

## Receipts

- 2026-08-27 — 7d09987 — CHANGELOG.md, the app version manifest — the format-3 half shipped: v0.4.0 tagged and pushed, GitHub release published, updater feed serving 0.4.0, bridge assets copied forward, Veri Check action green on main with the rebuilt bundle. The npm half did not — 2FA blocked the token publish and the OTP publish was never run, leaving @verikb/* at 0.1.0. Overtaken within the day when WO-131 bumped the marker to 4, so the standing obligation moved to this work order's re-scoped criteria rather than closing here
