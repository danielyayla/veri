---
id: WO-059
type: work-order
title: "Receipt path tokens keep dotfile prefixes"
status: backlog
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-021
    rel: implements
  - id: DEC-025
    rel: constrained-by
---

## Summary

The [[WO-044]] receipt verifier cleans edge punctuation off each file
token before matching it against a commit's changed files, and the
cleanup strips leading dots along with quotes and brackets. A receipt
naming `.github/workflows/release.yml` therefore yields the token
`github/workflows/release.yml`, which never matches the committed path,
and the receipt trips the `receipt-files` advisory even though the
citation is correct. Seen live on WO-028's receipt citing 076d07f,
worked around by writing `workflows/release.yml` in the receipt. This
work order fixes the token cleanup so a dot that starts a dotfile or
dot-directory segment (`.github/…`, `.env.example`) survives, while
sentence punctuation — including trailing dots — is still stripped.

## In scope

- Fix `pathTokens()` in `packages/core/src/provenance.ts` so a leading
  dot that begins a path segment is preserved; edge noise (quotes,
  brackets, commas, trailing sentence dots) is still removed.
- Tests in `packages/core/src/provenance.test.ts` covering
  `.github/...`-style receipt tokens: parsed token keeps the dot, and a
  receipt naming only dot-directory files verifies clean against a
  commit that touched them.

## Out of scope

- Any change to the receipt format, the `touches()` matcher, or the
  advisory tiers (DEC-025).
- Rewriting existing receipts (WO-028's workaround stays as written —
  historical receipts are not migrated, per [[WO-044]]).

## Requirements

- [[REQ-021]] — implements
- [[DEC-025]] — constrained-by

## Acceptance tests

- [ ] `parseReceipts` on a files segment naming
      `.github/workflows/release.yml` yields that exact token, leading
      dot intact.
- [ ] A receipt whose only named files live under a dot-directory
      verifies clean against a commit touching those files — no
      `receipt-files` advisory.
- [ ] Existing token cleanup still holds: quoted/bracketed tokens and
      trailing sentence punctuation are stripped as before, and the
      full provenance suite passes.
- [ ] `npm run typecheck` and `veri check` are clean.

## Receipts

(none yet)
