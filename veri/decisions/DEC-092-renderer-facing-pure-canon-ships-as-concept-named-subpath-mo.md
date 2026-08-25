---
id: DEC-092
type: decision
title: "Renderer-facing pure canon ships as concept-named subpath modules — pending.ts and prompts.ts join ids and dates"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-097
    rel: constrains
  - id: DEC-046
    rel: extends
  - id: REQ-008
    rel: satisfies
---

## Choice

The pure core exports the browser-bundled renderer needs live in dedicated dependency-free modules, each exposed as a package subpath (the DEC-046 mechanism): pending.ts holds isPending (the REQ-008 not-yet-binding predicate, moved out of check.ts), and prompts.ts holds the canonical strings PACKAGE_RULES and importKickoffPrompt (moved out of context.ts and brownfield.ts, whose node:fs imports keep them un-bundleable). check.ts, context.ts, and brownfield.ts import from the new homes; the main '@verikb/core' entry re-exports both modules, so every node-side consumer keeps its import site. esbuild inlines the subpaths into app.bundle.js exactly as it already does for './ids' and './dates'. The renderer's derive.ts re-exports the core definitions in place of its mirrors, so its six consumer files change nothing; the sidecar's write.ts imports isPending from the main entry. The two drift tests die with the mirrors.

## Rejected alternatives

- **One mechanism-named module ('./pure' or './browser') absorbing everything renderer-safe** — names the constraint instead of the concept, and grows into a junk drawer; DEC-046 set the precedent of concept modules (ids, dates), and two small ones cost one extra exports entry
- **isPending into ids.ts** — the module stays dependency-free but stops being about ids; status predicates and id arithmetic are different concepts sharing only their purity
- **Tree-shaking context.ts/brownfield.ts into the bundle as-is** — relies on esbuild eliding node:fs imports whose reachability an edit can silently change; a build that breaks at a distance, versus modules that cannot regress
- **Keeping the mirrors and adding the missing workflow clause plus a third drift test** — fixes today's bug and reinstates the pattern DEC-046 already condemned: a copy kept honest only by a test someone must remember to write (isPending drifted precisely because it was the mirror without one)

## Rationale

The isPending drift proved the mirror pattern's failure mode empirically: the two mirrors with drift tests stayed honest, the one without silently lost its workflow clause, and the app's review flow broke for draft workflow documents. Concept-named pure modules make the drift structurally impossible while keeping DEC-046's contract — node-side consumers never notice, and the renderer imports the one real implementation. Moving definitions rather than re-exporting them from their impure old homes keeps each subpath's purity a property of the module itself, checkable at a glance, not of what a bundler managed to shake off.
