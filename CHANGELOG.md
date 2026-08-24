# Changelog

Notable user-facing changes to the Veri app, CLI, MCP server, and GitHub
Action. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
version headings match app release tags (`vX.Y.Z`), and the release
workflow publishes each version's section as the release's "What's new"
(see [RELEASING.md](RELEASING.md)). History before 0.2.2 is recorded in
git and the `veri/` knowledge base rather than backfilled here.

## [Unreleased]

### Added

- The repository is licensed under Apache-2.0 (LICENSE at the root,
  `license` fields in every package).
- This changelog, and RELEASING.md documenting the app and action
  release flows.

### Changed

- The release pipeline recognizes non-app tags (such as the action's
  `v1`) and passes them through green instead of failing.
- Release notes now open with a "What's new" section drawn from this
  file, above the artifact-size manifest.
