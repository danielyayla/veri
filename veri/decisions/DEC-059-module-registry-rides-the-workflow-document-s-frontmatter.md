---
id: DEC-059
type: decision
title: "Module registry rides the workflow document's frontmatter"
status: active
approved: 2026-08-20
created: 2026-08-20
updated: 2026-08-20
links:
  - id: DEC-058
    rel: follows-from
  - id: DEC-039
    rel: follows-from
  - id: WO-066
    rel: constrains
---

## Choice

The module registry [[DEC-058]] requires — the list of module names architecture constraints may reference, each with a path and a one-line purpose — lives in the **workflow document's frontmatter** as a `modules:` key:

```yaml
modules:
  - name: core
    path: packages/core
    purpose: Pure domain logic over the veri/ directory
```

Constraint resolution, the compiled projection, and `veri check` all read module names from every non-retired workflow document, exactly as the design gate reads `design_gate_paths` ([[DEC-039]]). A project with no `modules:` key defines no modules, so any decision carrying constraints fails check until the registry is declared — never a silent no-op ([[DEC-058]]).

## Rejected alternatives

- **Derivation from `package.json` workspaces with annotated purposes** — reaches outside `veri/`, which core never reads past (host adapters own everything else, [[DEC-040]]); purposes have no natural home in npm metadata; ties a language-neutral document format to the JS ecosystem; and modules are an architectural notion that need not coincide with npm packages at all.
- **A dedicated config file (`veri/modules.yaml`)** — a second machine-readable format inside a markdown corpus, invisible to the document pipeline (load, check, context, drift), and with no approval story: the registry could change without any stamp, though the module list is itself part of the intended architecture [[REQ-022]] says cannot change without one.
- **A dedicated registry document or new document type** — a new type for one short list; [[DEC-058]] already rejected per-module documents, and a `source` document is imported evidence, not governed authority.

## Rationale

The workflow document is governed (accepted with an `approved:` stamp, [[REQ-008]]), always present, and ships first in every context package — so the registry inherits approval gating, drift detection, and agent visibility for free, and editing the module list is loud: it moves the file out from under its stamp until the user re-approves. [[DEC-039]] already established structured, machine-actionable frontmatter on the workflow document as the place for project-defined configuration core enforces; the registry is the same shape. One governed home, no new files, no new formats.
