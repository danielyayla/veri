# Changelog

Notable user-facing changes to the Veri app, CLI, MCP server, and GitHub
Action. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
version headings match app release tags (`vX.Y.Z`), and the release
workflow publishes each version's section as the release's "What's new"
(see [RELEASING.md](RELEASING.md)). History before 0.2.2 is recorded in
git and the `veri/` knowledge base rather than backfilled here.

## [Unreleased]

## [0.5.0] - 2026-08-29

### Added

- The Veri Skill Library: nine installable skills that coach the
  lifecycle loop rather than the commands — wayfinder,
  product-discovery, evidence-intake, define, decide, plan-work,
  implement, did-it-work, and health. Each stands at one semantic gate,
  interviews toward it, and hands off to the gate that comes next.
- Method documents (`MET-`), Veri's seventh document type: an open
  collection under `veri/methods/` whose frontmatter drives the
  emitter. The coaching lives in the knowledge base, so a project can
  edit, extend, or replace what its skills do.
- `veri skills install` and `veri skills upgrade` emit thin harness
  skill files that point at their method document. A shell's identity
  is its `upstream` slug, and only a shell the emitter marked is ever
  removed — hand-written skills beside them are left alone.
- Shell drift advisories: an emitted shell whose method has moved on,
  or whose method is gone, is surfaced against the shell.
- `list_documents` and `get_queue` over MCP: the enumeration surface,
  answering as ranked text lines with closed filter vocabularies, and a
  queue whose head is the dispatchable work order.
- `get_receipts` over MCP: receipts as structured data with their
  commit SHAs, parsed by one parser in core.
- `init_project` over MCP: the front door opens on a bare repo, so a
  skill can scaffold a project without shelling out to the CLI.
- `supersede_decision` over CLI and MCP: superseding is a verb rather
  than a manual two-line edit. It requires an `active` successor, which
  is what makes it safe for an agent to run.
- `file_requirement` over MCP accepts `kind` and `outcome`, so a skill
  can file a bet — a hypothesis with the metric and target that would
  confirm or refute it — and not only a constraint.
- A trigger corpus (`skills/trigger-corpus.yaml`) mapping utterances to
  the gate that should answer them, with its schema in core.

### Changed

- The on-disk format is now 4 (the `veri/format` marker). Older
  readers — apps, CLIs, MCP servers, the action — refuse a format-4
  project rather than half-loading it.
- **A format bump now breaks readers already running, not only readers
  already installed.** After updating, restart every long-running Veri
  process and reconnect every live MCP session against the project: a
  running reader keeps the format it started with and will refuse every
  call until it restarts. The refusal message names both repairs.

## [0.4.0] - 2026-08-27

### Added

- The product layer: `veri/product/` holds four gated singletons —
  vision, users, principles, and current focus — as first-class `PRD`
  documents with the full draft → approve lifecycle. Freeform files
  there are check violations; only what the maintainer has approved
  steers.
- Context packages open with an Intent section: the approved product
  singletons in full, and — when the work order implements a
  hypothesis — the bet itself, with the metric that will confirm or
  refute it.
- Sources carry a `kind` (design, user-feedback, metric,
  external-eval, investigation, outcome, reference). Absent means
  `reference`, so existing sources stay valid; the MCP `file_source`
  tool and search results show it.
- An `intuition-only` advisory: an accepted requirement with no
  `derived-from` evidence and no inbound outcome evidence is named as
  a bet whose origin is undocumented — link the evidence or retire it.
- A `stale-focus` advisory: an approved current-focus that hasn't been
  touched within its window, or that references only finished work
  orders, is called out — restate what comes next.
- The worth-making trace: a ready or in-progress work order whose
  links reach no live requirement is a check issue, and `veri approve`
  refuses to ready one prospectively.

### Changed

- The on-disk format is now 3 (the `veri/format` marker). Older
  readers — apps, CLIs, MCP servers, the action — refuse a format-3
  project with "update Veri to open it" instead of half-loading it.

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
