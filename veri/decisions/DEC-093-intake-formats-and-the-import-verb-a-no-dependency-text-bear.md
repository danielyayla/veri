---
id: DEC-093
type: decision
title: "Intake formats and the import verb — a no-dependency text-bearing set behind an overloaded veri import"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-094
    rel: constrains
  - id: REQ-031
    rel: satisfies
  - id: DEC-067
    rel: follows-from
  - id: DEC-002
    rel: follows-from
---

## Choice

veri import <file> accepts exactly .md, .txt, and .eml — the text-bearing set extractable with zero new dependencies. Markdown and plain text pass through UTF-8 decoding; .eml gets a minimal RFC-822 reader in core (headline headers as a preamble, first text/plain part, quoted-printable decoded; base64 and nested multiparts refused). Everything else is refused naming the supported set; NUL-bearing content behind a text extension is refused as not-text; empty extractions are refused rather than filed. The verb is the existing veri import, split on its argument: with a file path it runs intake, bare it keeps printing the brownfield kickoff prompt ([[DEC-067]]). Empty extractions are the [[REQ-031]] no-empty-shell bar applied mechanically.

## Rejected alternatives

- **PDF/DOCX extraction via a dependency** — core ships `yaml` + `zod` and nothing else; pdf and zip parsing are exactly the heavy dependencies WO-094 excludes. Named as the loudest future direction: the refusal message says why.
- **A full MIME implementation for .eml** — nested multiparts, base64 bodies, and the charset zoo, for marginal gain; the minimal reader covers the mail people actually export, and anything it cannot read refuses loudly instead of filing garbage.
- **A new verb (`veri add`, `veri ingest`)** — a second import-flavored verb invites "which import?" forever; the argument split is unambiguous (repo mining takes no file) and keeps the surface at one verb.
- **Content sniffing instead of extension dispatch** — magic-byte detection buys little over the extension + NUL check and invents a classification layer to maintain.

## Rationale

The supported set is exactly what can be extracted honestly with what core already ships. Every boundary is a loud refusal naming the set, so the day PDF support matters the pressure lands on a visible seam — extending `INTAKE_EXTENSIONS` and the extractor — rather than on users wondering why their file vanished.
