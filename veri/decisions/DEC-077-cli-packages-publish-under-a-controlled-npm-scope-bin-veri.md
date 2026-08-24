---
id: DEC-077
type: decision
title: "CLI packages publish under a controlled npm scope, bin stays veri, lockstep 0.x versioning"
status: active
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-081
    rel: constrains
  - id: SRC-040
    rel: informed-by
---

## Choice

Publish the three runnable packages — `@veri/core`, `@veri/cli`,
`@veri/mcp` — to the public npm registry under a scope Daniel
controls, keeping the bin name `veri`. First preference is the
`@veri` scope the manifests already use: the registry holds zero
packages under it (verified 2026-08-24 via the registry search API),
but whether the org name is claimable is the one open question only
Daniel can answer, by attempting to create the org at
npmjs.com/org/create. If `@veri` is taken, fall back to `@verikb`
(also zero packages, same verification) and rename the three
manifests in one commit before first publish.

The documented install path becomes `npm install -g @veri/cli` →
`veri check`, with `npx @veri/cli check` as the one-shot form (npx
runs the package's single bin, so the scoped name still lands on the
`veri` command). The unrelated `veri` package on npm (a VR-video
library, latest 1.1.4, untouched since long before this project) is
left alone — no defensive registrations, per WO-081's out-of-scope.

Versioning: the three packages move in lockstep on their own 0.x
line (currently 0.1.0), independent of the app's version (0.2.1) —
a publish bumps all three together. Publishing is a manual
`workflow_dispatch` GitHub Actions workflow, dry-run by default,
authenticated by an `NPM_TOKEN` repository secret; it is never
tag-triggered, because the `v*` tag namespace is already shared and
guarded ([[DEC-075]]). `@veri/ui` and `@veri/action` stay
`private: true` and never publish.

Homebrew is deferred, not chosen: no tap or cask ships under this
decision.

## Rejected alternatives

- **Unscoped distinct name (`verikb`, `veri-kb`, `veri-check` — all
  free as of 2026-08-24)** — buys one-word `npx verikb` ergonomics,
  but three packages need three coordinated unscoped names (or an
  inconsistent mix with scoped dependencies), the manifests all
  rename, and nothing brands the trio as one project. A scope gives
  all three a common, squat-resistant identity that matches the
  names already in every manifest and import.
- **App + action only — state plainly that the CLI is not on npm** —
  zero new surface, but leaves SRC-040's finding standing: `npx veri`
  installs someone else's software, and a CLI-seeker's only
  sanctioned path is building from source. The audience is
  Node-native; the marginal cost of publishing three already-built
  packages is low. (Until this DEC is approved and executed, the
  docs do state the not-on-npm status plainly — see the README's
  install section.)
- **Homebrew tap/cask now** — fits the macOS-first audience, but a
  tap is a second repository to maintain (standing infrastructure
  against [[DEC-029]]'s posture), and a cask would distribute the
  app, which already has a first-class signed download and updater.
  Revisit on demand; nothing here forecloses it.
- **Adopt the app's version (0.2.1) for the packages** — false
  coherence: it implies package releases that never happened and
  couples the npm cadence to the app's, so every app patch would
  either force a no-op npm publish or immediately break the
  "coherent" story. The tag guard ([[DEC-075]]) already keeps the
  release namespaces apart; the versions may differ honestly.
- **Tag-triggered npm publish** — rides the shared `v*` namespace
  that just bit the release pipeline (SRC-040), and makes publishing
  a side effect of tagging. A manual dispatch keeps publishing a
  deliberate maintainer act, matching the approval posture
  everywhere else in this project.

## Rationale

SRC-040 established the problem: the npm name `veri` belongs to an
unrelated package, `@veri/cli` is unpublished, and the CLI is
obtainable only inside the app bundle or from source. Registry
checks this session confirmed the name is still taken (v1.1.4) and
that no packages exist under `@veri` or `@verikb`. Publishing under
a controlled scope keeps every existing manifest name, import, and
doc reference intact in the best case and costs one mechanical
rename in the worst; the bin name `veri` is what every doc, the
scaffolded workflow, and muscle memory already use, and bin names
only collide on global install of the other package — a non-issue
for this audience. Lockstep 0.x versioning is the simplest scheme
that keeps `@veri/cli`'s dependency range on `@veri/core` truthful,
and the manual dry-run-first workflow means the entire path can be
prepared and rehearsed before any credential exists in the repo.
