# Changelog

Notable user-facing changes to the Veri app, CLI, MCP server, and GitHub
Action. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
version headings match app release tags (`vX.Y.Z`), and the release
workflow publishes each version's section as the release's "What's new"
(see [RELEASING.md](RELEASING.md)). History before 0.2.2 is recorded in
git and the `veri/` knowledge base rather than backfilled here.

## [Unreleased]

## [0.3.2] - 2026-08-25

### Added

- Windows and Linux installers: every release now ships a Windows NSIS
  installer and a Linux AppImage and `.deb` alongside the signed macOS
  DMGs. The Windows installer is not Authenticode-signed yet, so
  SmartScreen warns on first install.
- An Architecture view in the app: a dependency map of the declared
  modules with observed import edges, a rules view showing each
  constraint against what the code actually does, and violation
  surfacing through the existing issue pipeline.
- Architecture constraints can declare `severity: error`, which turns a
  violation of that rule into a real `veri check` issue (exit 1,
  CI-blocking). The default stays advisory; blocking power arrives only
  with the user's approval stamp on the governing decision.
- `veri init --starter <cli-tool|library|web-app>` seeds a new project
  with a type-tuned starter bundle — draft requirements, proposed
  decisions, and a workflow to edit — instead of an empty tree.
- A `run_check` MCP tool: agents can run the same check the CLI runs
  and get structured violations, advisories, and named skips before
  filing documents or declaring work done.
- Search (in the MCP `search` tool and the app's command palette) now
  ranks results — whole-word and title matches first, multi-term
  queries require every term — instead of flat substring matching.
- The repository is licensed under Apache-2.0 (LICENSE at the root,
  `license` fields in every package).
- This changelog, and RELEASING.md documenting the app and action
  release flows.

### Changed

- CI runs the full test suite on macOS, Linux, and Windows on every
  push.
- Installer size ceilings are per-platform: macOS and Windows stay at
  50 MB; the Linux AppImage (which must carry its own WebView engine)
  gets 150 MB and the `.deb` 60 MB. Release notes list each artifact
  against its ceiling.
- The release pipeline recognizes non-app tags (such as the action's
  `v1`) and passes them through green instead of failing.
- Release notes now open with a "What's new" section drawn from this
  file, above the artifact-size manifest.

### Fixed

- On Windows, newly created documents recorded backslash paths and
  drift detection could silently skip its checks; paths are now
  normalized everywhere.
