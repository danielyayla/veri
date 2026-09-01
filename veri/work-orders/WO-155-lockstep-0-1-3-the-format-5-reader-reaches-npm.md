---
id: WO-155
type: work-order
title: "Lockstep 0.1.3: the format-5 reader reaches npm"
status: in-progress
approved: 2026-09-02
claimed_by: fable-wo155
claimed_at: 2026-09-02
created: 2026-09-02
updated: 2026-09-02
links:
  - id: REQ-015
    rel: implements
  - id: REQ-012
    rel: extends
  - id: DEC-077
    rel: constrained-by
  - id: WO-140
    rel: follows-from
binds:
  paths:
    - packages/core/package.json
    - packages/cli/package.json
    - packages/mcp/package.json
    - package-lock.json
---

## Summary

The registry's newest reader is `@verikb/*@0.1.2` — a format-4 reader
published by [[WO-140]] the day before this repository moved to
format 5. A stranger running `npx @verikb/cli init` today scaffolds a
project the current Veri no longer writes, and `npx @verikb/cli check`
against any current project refuses. One lockstep bump — 0.1.3 —
carries the format-5 core (dispatch lifecycle, receipts as pointers,
`verify:` on work orders, the slimmed method layer) to npm through the
trusted-publishing path WO-140 just proved. No code changes: the
format-5 behavior already lives on main; this ships it.

## In scope

- Bump `@verikb/{core,cli,mcp}` to 0.1.3 together (manifests and
  `package-lock.json`; the `^0.1.0` inter-package ranges already
  admit it and stay as they are)
- Land on main green, then the `npm-publish` workflow: dry run first,
  reviewed, then the real run — the RELEASING.md ritual as written
- Verify the published reader: a clean install of `@verikb/cli@0.1.3`
  initializes a project carrying format marker 5 and checks this
  repository clean (0 violations)

## Out of scope

- Any package code, scope, or version-scheme change — DEC-077's
  lockstep 0.x line stands; this is a version bump and a publish
- The app (0.5.0) and action release flows
- Publishing `@verikb/ui` or `@verikb/action` (private, stay private)

## Acceptance tests

- [ ] The three manifests and the lockfile read 0.1.3, and the
      lockstep guard passes
- [ ] Dry run green with three 0.1.3 tarball file lists; real run
      publishes with no OTP and no token
- [ ] `npm view @verikb/{core,cli,mcp} version` each report 0.1.3
- [ ] A clean install of `@verikb/cli@0.1.3`: `veri init` writes
      format marker 5, and `veri check` run at this repository's root
      reports zero violations
- [ ] `veri check` reports zero issues

## Receipts

(one line per work session: date — commit or PR ref — one sentence)

(none yet)
