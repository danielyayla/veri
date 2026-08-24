---
id: DEC-073
type: decision
title: "MIT license for the whole repository"
status: superseded
superseded_by: DEC-074
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-078
    rel: constrains
---

## Choice

License the entire repository — app, core, CLI, MCP server, GitHub Action, site, and the veri/ corpus — under the MIT license: one LICENSE file at the repo root, and `"license": "MIT"` in the root and every package's package.json. Copyright holder: Daniel Kapper. On approval, WO-078 lands the LICENSE file, the package.json fields, and the README license badge.

## Rejected alternatives

- **Apache-2.0** — adds an explicit patent grant and contributor patent protection, but at the cost of a longer, less-recognized text and per-file notice conventions. Veri holds no patent surface worth defending, and MIT is the overwhelming norm for the Node/TypeScript tooling this sits among (npm ecosystem default), so the simpler text wins on adoption friction.
- **Source-available split (open format/CLI/action, proprietary app)** — preserves a future commercialization option for the desktop app, but contradicts the positioning already shipped: the site's download strip says "free & open source", and SRC-040's critical finding is that the project is not legally open source at all. A split would also complicate the single-repo, self-hosted story (one tree, one gate) for marginal optionality.
- **Copyleft (GPL/AGPL)** — guarantees derivatives stay open, but chills adoption by teams embedding the CLI/action in their own pipelines, which is the primary growth path; incompatible with the "table stakes, zero friction" goal of WO-078.

## Rationale

SRC-040 rates the missing license its one critical finding: no LICENSE, no package.json license fields, GitHub reports licenseInfo: null — default copyright applies and the project is not legally open source despite the site promising it is. MIT is the choice that closes the gap with the least friction: it matches the ecosystem the packages live in, renders a clean license chip on GitHub, imposes no notice or compatibility burden on adopters, and keeps the whole repository under one term so the self-hosting loop (the veri/ corpus is part of the product's proof) carries no license seam. The license choice is Daniel's call per WO-078; this decision is filed proposed and nothing ships until it is approved.

Superseded without becoming active: Daniel chose Apache-2.0 in-session on 2026-08-24 — see [[DEC-074]], which records this proposal among its rejected alternatives.
