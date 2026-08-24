# Contributing to Veri

Thanks for your interest. Bug reports, documentation fixes, and focused
code changes are all welcome. For anything larger than a small fix,
open an issue or a [Discussion](https://github.com/danielyayla/veri/discussions)
first — it saves you from building something that can't merge.

## The part that surprises people: the Veri gate

This repository is self-hosted: Veri is built by executing Veri work
orders, and every PR runs `veri check` over the `veri/` knowledge base
(the **Veri gate** check). Two consequences for an outside contributor:

1. **Substantive changes need a work order.** Code changes are traced
   to documents in `veri/work-orders/`, and the documents that enable a
   work order must be approved — an act only the maintainer can
   perform. You cannot file or approve these yourself, and that's by
   design ([REQ-008](veri/requirements/REQ-008-document-approval-workflow-proposals-need-daniel-s-stamp-to.md)).
2. **So the flow is:** open an issue describing what you want to
   change → the maintainer files (or points you at) a work order, say
   `WO-123` → you reference it in your commits (`WO-123: what changed`)
   and in the PR. Seeded [good first issues](https://github.com/danielyayla/veri/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
   already have this context lined up.

Typo and small documentation fixes don't need this ceremony — open the
PR directly and the maintainer handles the bookkeeping.

If the Veri gate fails your PR, the annotations name the exact
document and rule. It is almost never your code — it's the knowledge
base asking for a work order or an approval. Say so in the PR and the
maintainer will sort it.

## Dev setup

Development requires **Node >= 22.18** (native TypeScript type
stripping; published output targets Node >= 20). Rust is only needed if
you build the desktop app.

```bash
npm install
npm test        # builds all packages, then runs every test suite
npm run typecheck
npm --workspace @veri/ui run start   # desktop app (needs Rust + Tauri 2)
```

What CI will run on your PR: `npm run typecheck`, `npm test`,
`veri check`, and a freshness check that `action/dist/` matches the
action source (`npm test` rebuilds it — commit the bundle if you
changed `packages/action/`). The required checks on `main` are named
**test** (CI) and **veri-check** (Veri gate).

## Repository map

- `packages/core` — parse, validate, and graph a `veri/` directory
- `packages/cli` — the `veri` binary
- `packages/mcp` — stdio MCP server for agents
- `packages/action` — the Veri Check GitHub Action (bundled to `action/dist/`)
- `packages/ui` — the Tauri 2 desktop app (macOS)
- `site/` — the website, hand-authored static files
- `veri/` — the knowledge base this project is governed by

## Using a coding agent

Agent-assisted contributions are welcome — this project is largely
built that way. Point your agent at [AGENTS.md](AGENTS.md); it explains
how to fetch a work order's context package over MCP before writing
code. You remain responsible for what the agent produces.

## Pull requests

The PR template asks three things: what changed, the work order or
issue it traces to, and how you verified it. Green on **test** and
**veri-check** plus maintainer review is the whole bar — there is no
CLA.

## Security issues

Not here — see [SECURITY.md](SECURITY.md) for the private reporting
path.
