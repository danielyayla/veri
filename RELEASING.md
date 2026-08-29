# Releasing

Two things ship from this repository on tags, and they share the `v*`
tag namespace (DEC-075): the macOS app and the Veri Check GitHub
Action. The release workflow's guard job tells them apart — a tag equal
to `v<packages/ui version>` is an app release; any other `v*` tag (the
action's `v1`, `v1.0.0`, …) passes through green with a notice and
builds nothing.

## Before any format bump

A `CURRENT_FORMAT` bump is a breaking change for every reader already
*running*, not only every reader already installed (DEC-139). It
carries two obligations, and a work order that bumps the marker carries
both as acceptance criteria.

- [ ] **It ships with the schema change and its migration.** A
  document-schema addition an older reader would misparse — a new
  status value, a new member of a validated enum, or a new required
  field — ships with a `CURRENT_FORMAT` bump
  (`packages/core/src/format.ts`) and its migration step in the same
  change, and the readers that understand the new format are released
  (the checklists below). New *optional* keys are exempt: schemas are
  passthrough, so an old reader preserves unknown frontmatter
  untouched (REQ-001). The failure mode the bump prevents: an old
  reader does not error on frontmatter it can't validate — it silently
  drops the document from its set, then misreports every
  `[[reference]]` to it as a broken link (this is how the installed
  0.2.1 app reported "no document has that id" for work orders WO-098
  had marked `ready`). The bump turns that silent corruption into a
  clear refusal: the plain-text `veri/format` marker (DEC-030) makes
  any newer-format project state "update Veri to open it" instead of
  half-loading (REQ-015).

- [ ] **Every running reader is restarted.** The bump takes effect the
  instant the marker file changes — a process that was mid-session
  against the project keeps the format it started with and begins
  refusing every call, including the agent that is doing the bumping
  (SRC-064 records this happening to a live MCP session). So: every
  live MCP session against the project must reconnect, and every
  long-running host process must restart. Say so in the release notes;
  operators cannot infer it from the refusal alone.

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

5. CI builds every platform in parallel — per-architecture macOS DMGs
   (signed and notarized), a Linux AppImage and `.deb`, and a Windows
   NSIS installer (not Authenticode-signed: SmartScreen warns on first
   install; DEC-082) — then a publish job merges the minisign-signed
   updater artifacts and `latest.json`, creates a **draft** release
   with "What's new" (from the changelog) above the artifact sizes and
   per-platform update caveats, and verifies the release is complete.
   Review the draft and publish it.
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

## npm packages (DEC-077)

`@verikb/core`, `@verikb/cli`, and `@verikb/mcp` publish under the
`verikb` scope (the npm names `veri` and `@veri` belong to others;
DEC-077 named `@verikb` as the fallback), bin name `veri`, the three
versions moving in lockstep on their own 0.x line, independent of the
app version. Publishing needs the `NPM_TOKEN` repository secret — a
granular npm token with read/write on the `@verikb` scope. Note the
token does not bypass 2FA: if the npm account requires 2FA for writes,
CI publishes fail with `EOTP`; the fix is npm trusted publishing
(OIDC), not a bypass token.

1. Bump all three package versions together (the workflow refuses a
   mismatched set).
2. Land on main, wait for green.
3. Run the `npm-publish` workflow (Actions → npm-publish → Run
   workflow) with dry-run **on**; review the file lists it prints.
4. Re-run with dry-run **off**.

## Rules of thumb

- Never reuse or move a version tag except the action's floating `v1`.
- The changelog is the release notes: write entries as users read them,
  not as work-order ids.
- A release that fails midway is safe to re-run by re-pushing the tag
  after deleting the draft; the workflow creates one draft and uploads
  serially (WO-033).
