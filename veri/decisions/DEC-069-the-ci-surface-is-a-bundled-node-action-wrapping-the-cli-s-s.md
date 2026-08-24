---
id: DEC-069
type: decision
title: "The CI surface is a bundled Node action wrapping the CLI's structured check report"
status: proposed
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-076
    rel: constrains
  - id: REQ-025
    rel: satisfies
  - id: DEC-002
    rel: consistent-with
  - id: DEC-040
    rel: builds-on
  - id: DEC-025
    rel: consistent-with
---

## Choice

The Veri Check GitHub Action is a JavaScript action: a root `action.yml` (required for marketplace listing) running `action/dist/index.js` on the `node24` runtime. The bundle is built by esbuild from `packages/action` — a thin runner that imports `checkReport(cwd)`, a structured derivation newly extracted from the CLI's own `check` command, and renders it as GitHub workflow commands: issues become `::error` annotations on their documents and fail the run; advisories become `::warning` annotations tagged with their advisory kind and pass unless the `strict-advisories` input escalates them; skip notes become `::notice` lines, with a `fetch-depth: 0` hint appended to the shallow-clone skip. The bundle is committed, and CI proves it current by rebuilding and diffing (`git diff --exit-code -- action/dist`). The runner has zero runtime dependencies of its own — inputs are read from `INPUT_*` env vars and outputs/summaries written to the `GITHUB_OUTPUT`/`GITHUB_STEP_SUMMARY` files directly, with no `@actions/*` packages.

## Rejected alternatives

- **Composite action that builds the CLI from source on each run** — no
  committed artifacts, but adds ~1–2 minutes of npm install/build to every
  PR check, needs network at run time, and couples every consumer to the
  repo's dev toolchain.
- **Installing a published @veri/cli from npm** — the natural shape once the
  packages are on npm, but they are not published yet, and even then an
  unpinned install could let the action and CLI verdicts drift apart; the
  bundle pins by tag.
- **Reimplementing the checks in action code against @veri/core** —
  duplicates the CLI's orchestration (git facts, architecture collection,
  skip policy) and is exactly the second source of truth REQ-025 forbids.
- **Parsing `veri check`'s text output into annotations** — no CLI change
  needed, but couples the action to line formats that exist for humans and
  loses the advisory kind and file structure the annotations want.
- **Using the @actions/core toolkit** — idiomatic, but adds a dependency
  tree for what four env-var reads and file appends do; workflow commands
  are a stable documented interface.

## Rationale

REQ-025 demands one source of truth: extracting `checkReport` and having both the terminal renderer and the action consume it makes divergence structurally impossible rather than a discipline. A committed esbuild bundle is what lets `uses: danielyayla/veri@v1` run instantly — GitHub fetches an action's repo without installing anything, so the entry point must be self-contained; esbuild is already this repo's bundler for the UI renderer, so no new tool class enters the build. Shallow checkouts were already safe before this work — `collectGitFacts` reports them as unavailable and provenance skips with a note — so the action only needed to surface that note visibly, satisfying "informative, never false" with zero new checking logic. Skipping the `@actions/core` toolkit keeps the bundle small and the dependency surface at exactly what the CLI already carries (yaml, zod).
