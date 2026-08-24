---
id: DEC-079
type: decision
title: "Deliberate divergences from the Vellum spec — what Veri adopts and what it declines, on the record"
status: active
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: SRC-043
    rel: derived-from
  - id: WO-088
    rel: constrains
  - id: WO-089
    rel: constrains
  - id: DEC-037
    rel: related
  - id: DEC-003
    rel: related
  - id: DEC-025
    rel: related
  - id: DEC-018
    rel: related
---

## Choice

From the external Vellum specification analyzed in SRC-043, Veri adopts exactly two mechanisms — declared code bindings with deterministic spec-to-code drift detectors (WO-088) and an MCP self-check tool (WO-089) — and declines the rest of the spec's surface deliberately: sequential IDs stay over dotted slugs; the commit-subject convention stays over git trailers; the document-type vocabulary stays at four (no `feat.`, no `ver.` — verification remains receipts per DEC-003 plus, once WO-088 lands, bound tests); policy continues to ride the workflow document's frontmatter (DEC-018/DEC-039/DEC-059) rather than a separate policy.yml; and Veri keeps its no-stored-derived-state posture rather than adopting an index cache. A closed link-relation vocabulary is deferred, not declined: free-text `rel` stays for now, with a recognized-rel warn list as a candidate future work order. Semantic drift scoring remains out entirely, in agreement with the spec's own warning.

## Rejected alternatives

- Adopt the spec wholesale (six node types, dotted IDs, trailers, policy.yml) — maximal churn across every existing document and commit for no new capability; each piece individually loses to a standing Veri decision.
- Adopt nothing and keep drift document-only — leaves `veri check` blind to unclaimed code changes, the one place the spec is genuinely ahead; rejected because the gap undermines Veri's own promise that drift is mechanical (REQ-021).
- Add a `ver.` verification document type — a standing claim that goes stale; receipts plus machine-checked git facts (REQ-021) and bound tests (WO-088) prove the same thing from evidence instead of assertion.
- Add a `feat.` feature layer between requirements and work orders — an organizational middle tier the current graph depth does not need; requirements carry the business language and work orders the execution.
- Introduce policy.yml as a second policy surface — splits policy between two homes and makes the sidecar the one document the approval gate cannot govern.
- Close the link-relation vocabulary now as a hard error — would break existing free-text rels for marginal gain; deferred as a possible warn-tier advisory instead.
- Semantic (embedding/LLM) drift scoring — nondeterministic findings train users to mute the check; the spec itself warns against it, and DEC-025's advisory discipline depends on findings being boringly correct.

## Rationale

The spec and Veri share a thesis, so every divergence needs a written reason or it will be relitigated each time the comparison resurfaces. The two adopted items are the spec's genuine insights relative to Veri's current state: bindings make spec-to-code drift computable without semantics (extending REQ-021's mechanical-not-social principle from documents to code), and a check tool closes the gap where MCP-only agents can write but never verify. The declined items all lose to an existing Veri decision that is equal or stronger: DEC-037's high-water file already gives IDs permanence without slug churn; commit subjects carry the same provenance as trailers while staying visible in `git log --oneline`; receipts record what was actually verified per session rather than a standing `ver.` claim that rots; a versioned, approvable workflow document is a more self-consistent policy home than an unversioned sidecar YAML; and derive-on-demand is strictly stronger than deletable-and-rebuildable. Recording the declines matters as much as the adoptions: this document is the answer the next spec comparison gets.
