---
id: DEC-119
type: decision
title: "MCP write tools validate with strict schemas — unknown keys refuse, never strip"
status: proposed
created: 2026-08-27
updated: 2026-08-27
links:
  - id: WO-118
    rel: constrains
---

## Choice

The seven MCP write tools (file_decision, file_work_order, file_requirement, file_source, file_receipt, amend_document, start_work_order) pass full zod object schemas with .strict() to registerTool instead of raw shapes. The SDK preserves the schema instance, so validation refuses any argument key the schema does not declare — the error names the unrecognized keys — and the advertised JSON schema carries additionalProperties: false, letting compliant hosts refuse near-miss keys client-side. Read-only tools keep lenient raw shapes: extra keys there cannot lose data, and strictness could break lenient hosts for no benefit.

## Rejected alternatives

- **Post-write verification in the filers** (re-read the document and compare sections) — cannot see keys stripped before the handler runs; the content is already gone at that point, which is exactly the DEC-112 failure.
- **Catchall passthrough plus warning** (z.object(...).passthrough(), warn on extras) — a warning inside a successful result is easy for an agent to miss; silent-ish loss remains possible when the extra key was the content.
- **Strict schemas on every tool including read-only ones** — refusing extra keys on get_context/search adds breakage risk with hosts that decorate calls, and an extra key on a read can drop nothing.

## Rationale

The DEC-112 drop happened at the wire boundary: zod default strip mode discarded rejected_alternatives sent under a near-miss key while the call reported success. The write surface must fail loudly at the exact boundary where content can vanish; strictness in the schema is the one place that covers every write path at once and also fixes the advertised contract.
