---
id: DEC-147
type: decision
title: "The combined file-and-approve act composes once behind shared gates; sources acknowledge --approve with a notice"
status: active
approved: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: WO-142
    rel: constrains
---

## Choice

veri new --approve runs as a core-level combined act (createApprovedDocument in approve.ts): the gates approveDocument runs today are extracted into shared helpers — the DEC-071 maintainers gate, the work-order dispatch gates, and the blocking-issues filter — and run between composition and a single stamped write, so the document is born at its promoted status with the approval stamp and no pending file ever touches disk. The issues gate runs on a synthetic load (the parsed composed text appended to the loaded documents), which is faithful because loadProject parses each file through the same parseDocument. veri import --approve and veri new source --approve file the source normally and answer with an explicit notice that a source is born imported and already in play — the filing succeeds, nothing is stamped.

## Rejected alternatives

- **Create pending, then call approveDocument, deleting the file on refusal** — two writes plus a rollback path; a crash between them leaves a half-finished act on disk, and the deletion of a just-minted file is a second guarded verb smuggled into a create. Composing once makes the act atomic by construction.
- **Refusing veri import --approve outright** (the strict reading of "refuses exactly what veri approve refuses") — punishes the exact habit WO-142 exists to serve: a source already counts the moment it is filed, and failing the whole import to protest a redundant flag adds friction instead of removing it.
- **Stamping approved: onto sources** — extends what approval means to a type whose lifecycle deliberately has no pending state; explicitly out of scope for WO-142.
- **Duplicating the gate logic in the CLI adapter** — two implementations of REQ-008's gates would drift; core owns the verdicts.

## Rationale

The combined act must be exactly as safe as file-then-approve, so the gates are shared code, not copied prose — one evaluation site per verdict (PRD-003). One composed write keeps "one command, one commit" true at the filesystem level: there is no rollback path because there is no intermediate state. Sources are the one filed type with no approval lifecycle; the flag is acknowledged loudly (degrade loudly, PRD-003) rather than refused or silently ignored, because the user's intent — file it and make it count — is already fully satisfied by the import itself. Keeping the promotion map and gates single-sourced in approve.ts also means WO-143's coming dispatch change flows into the combined path automatically.
