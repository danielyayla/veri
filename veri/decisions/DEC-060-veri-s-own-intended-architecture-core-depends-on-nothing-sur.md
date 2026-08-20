---
id: DEC-060
type: decision
title: "Veri's own intended architecture — core depends on nothing, surfaces never couple sideways"
status: proposed
created: 2026-08-20
updated: 2026-08-20
links:
  - id: REQ-022
    rel: satisfies
  - id: DEC-058
    rel: follows-from
  - id: DEC-059
    rel: follows-from
  - id: DEC-037
    rel: follows-from
  - id: DEC-038
    rel: follows-from
architecture:
  constraints:
    - from: core
      to: [cli, mcp, ui]
      allowed: false
    - from: mcp
      to: [cli, ui]
      allowed: false
    - from: cli
      to: [mcp, ui]
      allowed: false
---

## Choice

Veri's package lattice is governed by three constraints, carried on this decision's frontmatter per [[DEC-058]] and resolved against the module registry now declared on the workflow document ([[DEC-059]]):

```yaml
architecture:
  constraints:
    - from: core
      to: [cli, mcp, ui]
      allowed: false
    - from: mcp
      to: [cli, ui]
      allowed: false
    - from: cli
      to: [mcp, ui]
      allowed: false
```

**core depends on no surface.** The foundation is pure functions over the veri/ directory — `yaml` + `zod` and nothing else. [[DEC-037]] ruled it subprocess-free; [[DEC-040]] built provenance on that split (hosts collect facts, core computes meaning). An import from any surface package inverts the whole design.

**mcp depends only on core.** The agent door must stay subprocess-free ([[DEC-037]]) and serve packages byte-identical to the CLI's ([[DEC-038]]); reaching into cli or ui would smuggle host machinery — git subprocesses, Electron — into the door every agent walks through.

**cli depends only on core.** The CLI must remain installable standalone. `veri open`'s discovery of the desktop app is deliberately a runtime resolve that degrades to a clear message when @veri/ui is absent — a static dependency on ui or mcp would turn that graceful edge into a hard requirement.

**ui is unconstrained.** The desktop app is the top of the stack and deliberately composes all three: core for the pipeline, cli for the shared demo seed ([[DEC-016]]), mcp for the in-app agent door. Absent rules mean unconstrained by design ([[DEC-058]]).

## Rejected alternatives

- **Whitelist style — an `allowed: true` rule for every sanctioned edge** — more rules with no more enforcement: absence already means unconstrained, so the forbidden edges are the only load-bearing assertions, and a whitelist would demand an edit for every legitimate new edge.
- **Also forbidding ui → cli and ui → mcp** — contradicts the codebase as designed: the app seeds demos from the CLI package's files ([[DEC-016]]) and hosts the agent door in-process; the top of a stack composing everything below it is the intended shape, not erosion.
- **Splitting the three rules across separate decisions** — the rules describe one lattice and stand or fall together; a single policy decision supersedes cleanly the day the package structure changes, keeping mechanism ([[DEC-058]], [[DEC-059]]) and policy separately supersedable without scattering policy itself.

## Rationale

This is the first policy instance of the DEC-058 mechanism, and it deliberately encodes only what prior rulings already assert: [[DEC-037]]'s purity boundary, [[DEC-038]]'s byte-identical channels, [[DEC-040]]'s hosts-collect/core-computes split. A future violation therefore cites the same authority those decisions carry — "who decided this, when, and why" in the same breath as "what broke" ([[REQ-022]]). Declaring the registry on the workflow document moves WF-001 out from under its approval stamp until re-approved — the loudness DEC-059 chose, applied to the act that introduces it.
