---
id: WO-125
type: work-order
title: "Ship the format-3 release: app and npm carry the product-layer core"
status: backlog
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-015
    rel: implements
  - id: REQ-011
    rel: implements
  - id: REQ-037
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

WO-121 bumped the on-disk format to 3, so every installed reader — the
0.3.x app, any `@verikb/*` 0.1.1 install, the Veri Check action — now
refuses this project with "update Veri to open it" (REQ-015 working as
designed). This work order ships the readers that understand format 3:
an app release per RELEASING.md, a lockstep `@verikb/*` publish, and
the rebuilt action bundle.

## In scope

- CHANGELOG.md: move `## [Unreleased]` under a new version heading
  covering the product layer (product singletons, source kinds,
  intuition-only and stale-focus advisories, worth-making trace,
  intent-led context packages, format 3)
- Bump `packages/ui/package.json` to 0.4.0 (a format bump is not a
  patch), tag `v0.4.0`, and follow the RELEASING.md app checklist —
  including the Electron-bridge asset copy-forward
- Lockstep `@verikb/*` bump to 0.1.2 and publish (2FA blocks CI token
  publish — either the OIDC trusted-publishing conversion lands first
  or the publish is run locally with an OTP)
- Rebuild and commit the action's bundled dist so `veri-check` on CI
  understands format 3
- Verify: the installed app opens this project; a fresh MCP server
  session runs `run_check` without the format refusal

## Out of scope

- Any new core behavior — this ships what WO-121..124 already landed
- UI surfacing of the product layer (design-gated; separate design
  SRC + work order)
- The OIDC trusted-publishing conversion itself, if it is not already
  done (tracked separately; a local OTP publish is the fallback)

## Requirements

Delivers [[REQ-015]] (a newer-format project states "update Veri"
until the updated reader ships — this is the ship) and [[REQ-011]]
(the installed app self-updates to a build that opens the project).
Derived from [[REQ-037]]'s format bump.

## Acceptance tests

- [ ] `git tag v0.4.0` release completes the RELEASING.md checklist:
      draft reviewed and published, updater feed serves 0.4.0,
      bridge assets copied forward
- [ ] A machine on the installed app updates and opens this project
      (no format refusal)
- [ ] `@verikb/core@0.1.2`, `@verikb/cli@0.1.2`, `@verikb/mcp@0.1.2`
      are live on npm and `npx @verikb/cli check` passes on this repo
- [ ] The Veri Check action run on main is green with the new bundle
- [ ] A freshly started MCP server answers `run_check` with the same
      result as terminal `veri check`

## Receipts

(none yet)
