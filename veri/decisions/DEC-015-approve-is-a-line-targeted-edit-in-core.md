---
id: DEC-015
type: decision
title: Approve is a line-targeted frontmatter edit living in core
status: active
approved: 2026-08-10
created: 2026-08-10
updated: 2026-08-10
links:
  - id: WO-016
    rel: constrains
  - id: DEC-002
    rel: follows-from
---

## Choice

`approveDocument` lives in `packages/core` (`approve.ts`) and performs
the promotion by editing exactly three frontmatter lines in place —
`status`, `approved`, `updated` — via line-targeted string replacement
on the raw file, then re-parses the result before writing as a guard.
Everything outside those lines survives byte-for-byte. The CLI
(`veri approve`) and the future UI (WO-017) share this one write path.

Relatedly, the "promoted without a stamp" rule is enforced as a `veri
check` issue (`missing-approval`), not as schema-level parse rejection.

## Rejected alternatives

- **YAML round-trip (parse, mutate, re-serialize)** — reorders keys,
  normalizes quoting, and drops comments, turning a two-line approval
  into a noisy diff; hostile to the git-audit story of [[DEC-002]].
- **Approve logic in the MCP package's library** — the CLI would then
  depend on `packages/mcp`; core is the natural shared home and keeps
  its zero-dependency constraint (only `node:fs`).
- **Enforcing the stamp in the zod schema (parse failure)** — WO-016's
  scope sketched this as a superRefine, but a parse-invalid document
  drops out of the graph entirely, cascading one missing stamp into
  broken-link noise on every referencing document. A check issue keeps
  the document loaded and reports exactly one actionable problem.

## Rationale

Approval is the user's audited act; its footprint in git should be
exactly the three lines the user meant to change. One shared
implementation in core keeps CLI, MCP, and UI incapable of drifting
apart on the single most sensitive write in the system.
