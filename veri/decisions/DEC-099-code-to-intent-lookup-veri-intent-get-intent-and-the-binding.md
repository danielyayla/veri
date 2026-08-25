---
id: DEC-099
type: decision
title: "Code-to-intent lookup — veri intent, get_intent, and the binding > receipt > module ranking, pure over documents alone"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-095
    rel: constrains
  - id: DEC-081
    rel: consistent-with
  - id: DEC-038
    rel: consistent-with
  - id: DEC-040
    rel: consistent-with
  - id: DEC-059
    rel: builds-on
---

## Choice

The WO-095 lookup is one core derivation, `lookupIntent(documents, path)` in `packages/core/src/intent.ts`, pure over loaded documents with **no git facts**: the evidence it reads — work-order `binds.paths` globs ([[WO-088]]), receipt file tokens (via the existing lenient receipt parser, [[DEC-003]]), and the module registry on the workflow document ([[DEC-059]]) — all lives in the corpus. That keeps the MCP surface inside [[DEC-081]]'s posture (the git tier stays out of reach over MCP) while serving the identical derivation everywhere.

Surfaces and names: the CLI subcommand is `veri intent <path>`; the MCP tool is `get_intent`, matching the server's existing `get_*` read-tool convention. Both print one shared renderer, `renderIntent`, from core — byte-identical channels per [[DEC-038]].

Ranking: matches are tiered **binding > receipt**, newest work order (highest id) first within a tier. A binding counts only while its work order is unfinished (backlog/ready/in-progress) — a binding is a live claim by in-flight work ([[WO-088]]); once done, the receipts are the record, so a lingering broad glob on a finished work order never outranks the receipt of the work that shipped the file. a module-registry hit is context, not a match tier — when it is the only coverage the render says "no document-level matches" and names the module. A binding matches when the path falls under a pattern, or when the pattern's static (glob-free) prefix and the query overlap as directories — so a directory query surfaces work orders bound to globs inside it. Receipt tokens match exactly, as a directory either way, or by basename — the same leniency receipt verification already applies.

Result shape: `IntentLookup { path, matches[{id,title,status,via,evidence}], module?, governing[] }`, where `governing` is the requirements and decisions the matched work orders cite in **frontmatter links only** (deliberate citations, not inline mentions), requirements before decisions, each entry naming which work orders cite it and under what relation.

## Rejected alternatives

- **Reusing git facts (`workOrdersTouching`) as the evidence base** — that is `veri implemented`'s job and needs a subprocess; over MCP the git tier is deliberately unreachable ([[DEC-081]]), so a git-backed lookup could never satisfy WO-095's "MCP tool and CLI print the same derivation". Receipts already record the same file lists inside the corpus.
- **Extending `veri context` with a `--path` flag** — overloads a command whose contract is "the package get_context serves" ([[DEC-038]]) with a different derivation; a distinct noun keeps each contract crisp.
- **Naming the tool `code_to_intent` or `governs`** — the server's read tools are uniformly `get_*` (get_context, get_document, get_neighbors); `get_intent` reads as one of them.
- **Including inline `[[refs]]` in the governing set** — mentions are commentary, not citation; frontmatter links are the deliberate record of what a work order implements and is constrained by.
- **Ranking receipts above bindings** — a binding is a live claim on code by in-flight work and the sharper signal for "should I touch this?"; receipts are history and rank second, as the work order specified.

## Rationale

Everything the lookup needs is already recorded in documents, so purity over the corpus costs nothing and buys MCP parity, trivial fixture tests, and reuse by any host with no fact collection ([[DEC-040]]). One core renderer makes CLI/MCP parity true by construction. The tiering encodes evidence strength: a binding is an explicit present-tense claim, a receipt a recorded past fact, a module entry background purpose — an agent asking "what governs this file?" wants them in exactly that order.
