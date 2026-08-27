---
id: DEC-121
type: decision
title: "The product type lands as PRD documents whose filename is their identity; the format bumps to 3"
status: active
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: WO-121
    rel: decided-during
  - id: REQ-037
    rel: implements
  - id: DEC-111
    rel: builds-on
---

## Choice

Implementing [[REQ-037]] ([[WO-121]]), the product layer lands as a sixth document type with these shapes:

1. **Type `product`, prefix `PRD`, ids allocated sequentially** like every other type. The singletons live at fixed paths — `product/vision.md`, `product/users.md`, `product/principles.md`, `product/current-focus.md` — and **the filename is the singleton's identity**: no `facet` frontmatter field exists to drift from it. The sanctioned list (`PRODUCT_FILES`) lives on the dependency-free pending subpath (DEC-046) so every surface shares it.

2. **Lifecycle mirrors the workflow document** (the WF-001 precedent REQ-037 names): `draft` promotes to `accepted` via the approve stamp, `retired` is the exit, no `withdrawn` — a singleton is retired, never discarded. Draft product documents are pending (`isPending`), so they sit in the approval queue like any other gate crossing.

3. **`veri check` owns placement** (`product-file`, a violation): a product document outside its sanctioned path, or any other type filed under `product/`, fails; a frontmatter-less file there already fails the load. `createDocument` refuses type `product` outright — generic creation would mint `product/PRD-00N-slug.md`, which placement refuses; singletons are authored at their fixed paths.

4. **Staleness is a clock-fed advisory** (`stale-focus`), computed beside `checkStaleClaims` in `deriveFindings`: an *accepted* current-focus last updated past the window, or one whose referenced work orders have all finished, advises. The window defaults to 14 days (`DEFAULT_FOCUS_STALE_AFTER_DAYS`), tunable as `focus_stale_after_days` on the workflow document — deliberately a separate knob from `stale_after_days`, whose silence is about code, not intent.

5. **`CURRENT_FORMAT` bumps 2 to 3** (marker-only migration): a new type in the discriminated union is exactly the WO-104 failure class — an older reader drops every PRD document and misreports its inline references — so the bump ships with the type per the RELEASING.md rule.

6. **Assembly policy**: product documents ship full when linked; `include: always` (intent-led packages) is [[REQ-039]]'s work order, not this one.

7. **The self-test exempts open-loop advisories**: `untested-bet` and `stale-focus` are designed to persist until the user judges evidence, so this repo's own zero-advisory bar filters them rather than forbidding a live project from carrying an open bet.

## Rejected alternatives

- **A `facet:` frontmatter field naming which singleton a file is** — a second identity that can contradict the filename; check would then need a facet-filename consistency rule. The filename alone cannot be duplicated or drift.
- **Ids like PRD-VISION or fixed well-known ids** — breaks the uniform ID_RE, the sequential id store, and every surface that assumes numeric ids; sequential PRD ids cost nothing.
- **`withdrawn` on product documents** — withdrawal exists for documents that leave play while links survive; a singleton's exit is retirement (like the workflow), and offering both invites an ambiguous terminal state.
- **Reusing `stale_after_days` for focus staleness** — one knob would couple code-silence tolerance to intent-silence tolerance; a team with long-running bound work orders should not have to accept a slow focus check.
- **No format bump ("the type is additive")** — additive for new readers, corrupting for old ones: an old reader silently drops PRD documents and misreports every inline PRD reference as broken, the exact WO-104 incident shape.
- **Extending `veri new product <title>`** — a growing collection contradicts the closed singleton set; refusal with the sanctioned paths in the error teaches the model instead of minting check-refused files.

## Rationale

Every choice keeps the layer inside REQ-037's rule — gated or derived, never freeform — with one evaluation site per verdict: placement and staleness live in core's check, identity lives in the filesystem where it cannot fork, and the closed set is enforced at creation and at check rather than by convention. Origin: [[SRC-056]].
