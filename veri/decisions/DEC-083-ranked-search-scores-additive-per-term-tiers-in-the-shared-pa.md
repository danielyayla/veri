---
id: DEC-083
type: decision
title: "Ranked search scores — additive per-term tiers in the shared palette core, capped at the MCP surface"
status: active
approved: 2026-08-25
created: 2026-08-24
updated: 2026-08-25
links:
  - id: WO-090
    rel: constrains
  - id: DEC-044
    rel: follows-from
  - id: DEC-009
    rel: follows-from
---

## Choice

`rankDocs` in packages/mcp/src/search.ts — the one scoring function behind the palette, the Search view, and the MCP `search` tool (DEC-044) — gains multi-term AND-matching with additive per-term tier scores. Free text splits on whitespace; every term must match title or body (AND), and a document's score is the sum of each term's best tier plus phrase bonuses, from a named constant table: id exact 1000 and id prefix 800 (evaluated on the whole query first, dominating everything), then per term title whole-word 100 > title substring 80 > body whole-word 40 > body substring 30, plus 50 when the full phrase starts the title or 25 when it merely appears in it. Ties break by `compareIds`, so ordering is a pure function of the corpus. `PaletteHit` grows a `matched` field (`id`/`title`/`body`) restoring the old `SearchHit` shape; the MCP tool appends `[score N · fields]` to each hit line and truncates to a top-25 cap stated in the tool description. The corpus still loads per call — no index, no cache (DEC-009). No `veri search` CLI command is added: none exists today, and WO-090 forbids a new surface, so ranked search reaches users through the three existing surfaces only.

## Rejected alternatives

- **TF-IDF / BM25 term weighting** — better long-corpus relevance in theory, but needs corpus-wide document frequencies computed per call (or a persistent index, forbidden by DEC-009) and makes scores corpus-relative: adding one document reshuffles every ranking, breaking the "same corpus, same ordering — and explainable tiers" contract the palette already honors.
- **Replace tier constants with the palette's old 100/80/62/55/30 scale extended per term** — keeps old magic numbers but leaves no headroom between tiers for whole-word bonuses and summed terms; a rescale with named constants documents the lattice instead of packing new meaning into old values.
- **OR-matching with per-term scores** — never drops a hit, but a multi-term query exists to narrow; OR turns "ranked search" into the union of two floods, exactly the undifferentiated-hits failure WO-090 opens with. AND with per-term substring matching still returns every hit the old full-phrase scan returned (the phrase matching implies each term matching), so recall is preserved.
- **Fuzzy edit-distance matching (e.g. Levenshtein ≤ 1)** — explicitly out of WO-090's scope; whole-word and prefix handling cover the misspelling-free case agents actually hit, with zero dependency cost.
- **Capping inside `rankDocs`** — one cap for all surfaces, but the Search view deliberately renders the top 200 unsliced and the palette caps at 8 rows; the cap is presentation, so each surface applies its own to the same full ranking (the MCP tool's 25, stated in its description).

## Rationale

Additive tiers keep every property the shared core already promised — deterministic, dependency-free, one implementation for humans and agents (DEC-044) — while fixing the two retrieval failures WO-090 names: common-word queries now differentiate (title and whole-word evidence outranks incidental body substrings) and multi-word queries now narrow (AND) instead of matching only as a literal phrase. Summed per-term scores make "matches more of the query" and "matches it in better places" the same axis, so the ordering explains itself in the `matched` field the tool now returns. The id tiers sitting an order of magnitude above everything preserves the palette's first invariant: typing an id always surfaces that document first.
