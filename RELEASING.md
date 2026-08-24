# Releasing

Two things ship from this repository on tags, and they share the `v*`
tag namespace (DEC-075): the macOS app and the Veri Check GitHub
Action. The release workflow's guard job tells them apart — a tag equal
to `v<packages/ui version>` is an app release; any other `v*` tag (the
action's `v1`, `v1.0.0`, …) passes through green with a notice and
builds nothing.

## App release

The app version has one source: `packages/ui/package.json`
(`src-tauri/tauri.conf.json` points at it). The tag is the only manual
trigger; CI builds, signs, notarizes, and publishes (see
`.github/workflows/release.yml` for the required secrets).

1. Move the `## [Unreleased]` entries in [CHANGELOG.md](CHANGELOG.md)
   under a new `## [X.Y.Z] - YYYY-MM-DD` heading. The guard refuses an
   app tag whose version has no changelog section.
2. Bump `version` in `packages/ui/package.json`.
3. Commit, push, and wait for CI and the Veri gate to go green on main.
4. Tag and push:

   ```bash
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```

5. CI creates a **draft** release with "What's new" (from the
   changelog) above the artifact sizes, uploads both architectures'
   DMGs, updater archives + signatures, and `latest.json`, then
   verifies the release is complete. Review the draft and publish it.
6. After publishing, copy the Electron-bridge assets forward from the
   previous release (`Veri-0.1.8-universal-mac.zip`, its `.blockmap`,
   and `latest-mac.yml`): 0.1.x installs read `releases/latest` for
   `latest-mac.yml` to reach the 0.1.8 bridge build, which then offers
   the current installer. Skip only when no 0.1.x installs remain in
   the wild.

Installed apps pick the release up through the tauri-updater feed
(`latest.json`); nothing else to do.

## Action release

The action's published surface is the root `action.yml` running the
bundled `action/dist/index.js`; CI enforces that the bundle is current
on every push, so a green main is a releasable action.

1. Land the action change on main; wait for green (the "action bundle
   is current" step is the freshness proof).
2. Tag the precise version and move the floating major tag consumers
   reference (`danielyayla/veri@v1`):

   ```bash
   git tag vA.B.C && git push origin vA.B.C
   git tag -fa v1 -m "Veri Check vA.B.C" && git push --force origin v1
   ```

   Both tags pass the release guard green; no app build runs.
3. Marketplace listing (manual, web-only): open the repo's Releases →
   draft a new release for tag `vA.B.C` → check "Publish this Action to
   the GitHub Marketplace" → publish. GitHub has no API for this step.
   As of 2026-08-24 the listing is not yet published.

## Rules of thumb

- Never reuse or move a version tag except the action's floating `v1`.
- The changelog is the release notes: write entries as users read them,
  not as work-order ids.
- A release that fails midway is safe to re-run by re-pushing the tag
  after deleting the draft; the workflow creates one draft and uploads
  serially (WO-033).
