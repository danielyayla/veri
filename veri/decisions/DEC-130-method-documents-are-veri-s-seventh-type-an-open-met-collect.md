---
id: DEC-130
type: decision
title: "Method documents are Veri's seventh type — an open MET- collection whose frontmatter drives the emitter"
status: active
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: DEC-125
    rel: follows-from
  - id: SRC-060
    rel: derived-from
  - id: SRC-061
    rel: derived-from
  - id: REQ-040
    rel: serves
  - id: REQ-041
    rel: consistent-with
  - id: DEC-129
    rel: consistent-with
  - id: DEC-018
    rel: consistent-with
  - id: DEC-023
    rel: consistent-with
  - id: DEC-025
    rel: consistent-with
  - id: DEC-040
    rel: consistent-with
  - id: WO-130
    rel: constrains
---

## Choice

[[DEC-125]] put the coaching method in `veri/` as Veri documents and deliberately left open what `type:` they are. They are a **seventh document type**: `method`, id prefix `MET-`, an open collection under `veri/methods/`.

**Lifecycle.** The workflow's, exactly — `draft → accepted → retired`, plus `withdrawn` like every type. `method: { from: 'draft', to: 'accepted' }` joins the `PROMOTION` table in `approve.ts`, which is what makes [[DEC-125]]'s "the user can amend and approve the method" true rather than aspirational. The shell emitter writes a shell only for an `accepted` method, so a draft can never trigger before it has been read.

**Assembly.** `include: 'always'`, packing `name-only`. Every context package carries a menu of the gates that exist; the body is fetched on demand.

**Collection, not singletons.** Any file under `veri/methods/`, ids minted on demand, slug filenames — the sources-and-decisions shape, not the product singleton shape. The fourteen skills [[SRC-060]] names are seeds, not a schema.

**Frontmatter holds what machines act on; the body holds what the agent reads.** Two required frontmatter fields beyond the base:

- `description:` — one paragraph, the text the emitted shell triggers on. Near-miss disambiguation between adjacent gates (the pairs [[WO-130]] enumerates) belongs here, because only matched text affects triggering.
- `requires:` — the MCP tool names the skill cannot run without, as a list. This is what [[DEC-125]]'s capability probe compares against the tool list, and what its refuse-with-repair message names.

An optional third:

- `upstream:` — the stable slug of the shipped method this file was scaffolded from (`veri/product-discovery`). Written by the scaffold, absent on project-authored methods.

`veri/templates/method.md` expects six sections: Purpose, What it reads, The interview, What it files, Guardrails, Handoff. Like every template it is advisory and the project may edit it ([[DEC-023]], [[DEC-025]]).

**Shell drift is checked in the host-fed tier, at advisory severity.** Shells live outside `veri/`, so `checkProject` cannot see them without giving up its purity. The host collects the emitted shells the way the CLI already collects git facts for the provenance advisories ([[DEC-040]]) and hands core a pure comparator. Two rules: a shell whose content differs from what its method would emit now, and a shell whose method is missing or retired. Advisory, not issue — a stale shell is a stale pointer, not a broken knowledge base, and the repair is one command.

**Format.** `CURRENT_FORMAT` 3 → 4, marker-only migration. Methods are purely additive and no existing document changes, but a format-3 reader meets `type: method` against a discriminated union and `MET-` against `ID_RE`; the marker is what makes it say "update Veri" instead of reporting invalid frontmatter.

## Rejected alternatives

- **Reuse `source`.** The cheapest possible answer, and methods really are prose. Eliminated by a fact rather than a preference: `PROMOTION` in `approve.ts` has no `source` entry and `approveDocument` refuses outright — "only requirements, decisions, workflows, work orders and product documents are approved". A type that cannot be approved cannot carry a method [[DEC-125]] says the user ratifies.
- **Reuse `workflow`.** Approvable, and methods are process canon one level below [[WF-001]], so the semantics nearly fit. Rejected because `assembleContext` selects `[0]` — the single lowest-id non-retired workflow. Fourteen methods filed as `workflow` would not bloat packages; they would be *silently invisible* to them, losing the exact property [[DEC-125]] chose `veri/` to get. Fixing that means teaching assembly that some workflow documents are the workflow and some are not — a discriminator field inside a type, which is what `type:` already is.
- **Reuse `product`.** Also approvable, also a recent precedent. Rejected on both semantics and machinery: product documents are the user's intent model, methods are process; and product is a closed set of gated singletons whose creation `create.ts` refuses generically, which would make "author your own skill" a change to Veri's source.
- **`include: 'always'` with full packing.** The literal reading of [[DEC-125]]'s promise that the method reaches every context package. Rejected as unaffordable: fourteen coaching documents against an inline threshold of 15,000 tokens would consume the layering budget on every work order, to deliver thirteen gates the implementing agent is not standing at.
- **`include: 'linked'`.** Correct token economics — a method ships only when something links it. Rejected because it silently drops [[DEC-125]]'s harness-agnostic claim: an agent in a harness with no skill mechanism would never learn the gates exist.
- **A closed, enumerated set of methods** on the product-singleton pattern. Would give stable identity for free and make upgrade a per-file diff. Rejected because it makes authoring a fifteenth skill a change to Veri rather than a change to the project, contradicting the ownership [[DEC-125]] exists to grant.
- **Keying `veri skills upgrade` on the id, the title, or the filename.** Each is simpler than a new field. Ids are minted on demand, so the same shipped method is MET-003 in one project and MET-009 in another depending on authoring order; titles and filenames are things the user is explicitly invited to edit. All three break precisely when the project has made the method its own — the case upgrade-by-proposal exists to serve.
- **Letting `checkProject` read `.claude/skills/` directly.** One tier instead of two, and no host plumbing. Rejected because it makes the core check impure over `veri/`, which every host then inherits — the MCP server would need filesystem access to a harness directory it has no business knowing about.
- **No drift check at all**, with re-running the emitter as the reconciliation. Defensible, since the shell is generated and regeneration is idempotent. Rejected because [[DEC-129]] names method–canon consistency as part of the pre-ship bar, and an unreported stale shell is a skill that triggers on a description its method no longer holds.

## Rationale

The type question looked like bookkeeping and is not: it decides whether the method reaches agents at all. Both cheap-looking reuses turned out to cost the same edits as a new type — each needs a discriminator added to a type that has none — while leaving the schema misdescribing the document. The seventh type has a measured price and a working recipe: the sixth (`product`, commit `f21a943`) was 651 insertions across 29 files with a marker-only format bump, and this change follows it step for step.

The frontmatter/body split is the load-bearing part. A skill has to do two things Veri's other documents never do: **trigger**, and **refuse when it cannot file what it collected**. Both are machine acts, and prose is the wrong substrate for either — an emitter scraping a heading has nothing to validate, and a capability probe reading a bulleted list is inferring intent. Putting `description:` and `requires:` in frontmatter gives the schema something to enforce, gives [[WO-130]]'s corpus a stable target, and leaves the body free to be what it should be: coaching a human reads.

`upstream:` is `original:` one type over — a record of where content came from, absent when hand-authored. Its absence is the signal that matters: a method with no `upstream:` is the project's own, and `veri skills upgrade` never proposes anything to it.

Putting shell drift in the host-fed tier rather than in core keeps [[DEC-018]]'s boundary intact in both directions. Harness files are thin pointers generated *out of* `veri/`; core stays ignorant of which harness exists, and only the host that emitted the shells is asked to look at them.

## What this unblocks and what it leaves open

Unblocked by this decision: authoring the fourteen method documents (they now have a schema to be authored against), the shell emitter (it now has fields to read), and [[DEC-129]]'s canon-consistency check rule (it now has a tier and a severity).

Still open, and deliberately not settled here: whether shells are emitted per project or installed once per user — the second half of what [[DEC-125]] deferred, and independent of everything above. Whether methods get a surface in the app is design-gated by [[DEC-012]] and is a design document, not a decision on this route.
