---
id: DEC-151
type: decision
title: "npm publishing authenticates by OIDC trusted publishing; DEC-077's token clause is amended"
status: active
approved: 2026-09-02
created: 2026-09-02
updated: 2026-09-02
links:
  - id: WO-155
    rel: constrains
  - id: WO-140
    rel: constrains
  - id: DEC-077
    rel: follows-from
  - id: SRC-065
    rel: informed-by
---

## Choice

The npm-publish workflow authenticates to the registry by OIDC trusted publishing: the job declares `permissions: id-token: write`, upgrades the runner's npm to >= 11.5.1, and mints a short-lived credential from its GitHub identity at publish time. No long-lived write credential exists anywhere — the `NPM_TOKEN` repository secret is deleted, and setup-node writes no `_authToken` line. This amends exactly one clause of DEC-077, "authenticated by an `NPM_TOKEN` repository secret"; every other DEC-077 clause — the @verikb scope, the veri bin, lockstep 0.x, manual workflow_dispatch, dry-run default, ui/action staying private — stands unchanged. Filed proposed by the WO-155 review (MET-010): the conversion was executed in-scope under WO-140 and has now completed two consecutive CI publishes (0.1.2 and 0.1.3), but no decision carried the choice, leaving DEC-077's letter contradicted by the standing workflow.

## Rejected alternatives

- Keep NPM_TOKEN and relax the account's 2FA-for-writes policy so a token can publish — unblocks CI by weakening account security for every write, and SRC-065 records the token path failing identically twice (EOTP) under the policy as configured.
- Publish manually from a maintainer machine with an OTP — proven (0.1.0 bootstrapped this way) but makes every release depend on an interactive human session, so the sanctioned RELEASING.md path can never complete in CI; SRC-065 names this as the standing cost.
- Leave DEC-077 as written and treat the CI failure as a documented caveat — the record then documents a publish step that fails every time it runs, which is the exact condition SRC-065 filed as the finding.

## Rationale

The objection that originally ruled out trusted publishing — it cannot bootstrap a first publish — expired when 0.1.0 was published manually with an OTP (WO-140's summary records this). Two identical EOTP failures (v0.4.0 silently, v0.5.0 on run 33260204206; SRC-065) proved no repository secret can supply a one-time password. WO-140 executed the conversion and published 0.1.2 with no OTP and no token; WO-155's 0.1.3 publish (run 33563388195, provenance signed via GitHub Actions OIDC, sigstore logIndex 2680979842) is the second consecutive proof. The choice is load-bearing in both work orders' acceptance criteria ("no OTP and no token") and belongs on the decision record rather than only in work-order scope; DEC-077's authentication clause should not stand contradicted in active canon.
