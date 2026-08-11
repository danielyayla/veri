---
id: REQ-006
type: requirement
title: Document schemas — one rulebook for structure, checks, and packing
status: accepted
approved: 2026-08-11
created: 2026-08-07
updated: 2026-08-11
links:
  - id: REQ-001
    rel: depends-on
  - id: REQ-003
    rel: depends-on
  - id: DEC-006
    rel: informed-by
---

## Purpose

Today the rules for what a document should contain live in three
separate places: the blank-note templates in the CLI
(`packages/cli/src/templates.ts`), the health checks in core
(`packages/core/src/check.ts`), and the context-package rules hardcoded
in the MCP server per [[DEC-006]]. When rules live in three places,
they drift apart and one of them is always stale.

Target user: anyone (or any agent) creating documents in a Veri
project. Success means: a new requirement written by any tool, any
model, or by hand has the same sections in the same order, and
`veri check` can tell you when one doesn't.

## What a schema is

One definition per document type, owned by core, that states:

1. **Structure** — the body sections this type must (or may) have,
   in order, with one line of guidance per section. Example for
   requirements: Purpose (why + who), body, Acceptance criteria
   (at least one checkbox).
2. **Assembly policy** — how documents of this type participate in a
   context package: full body, excerpt, name-only, or
   always-included. These are the rules [[DEC-006]] currently
   hardcodes (sources as 600-char excerpts, superseded decisions
   name-only), promoted from code into the schema.

Everything else is *derived* from the schema:

- `veri new` renders its blank-note template from the schema
- `veri check` gains structural checks (missing required section)
- `get_context` packs each document per its type's assembly policy
- The MCP server can serve the schema as writing guidance to any
  connected agent, whatever the model

In v1 the schemas are defined in core's code, exactly like the
frontmatter schema in `packages/core/src/schema.ts` is today.
User-editable schema files and user-defined types are future work,
not this requirement.

## Acceptance criteria

- [ ] Each built-in document type has one schema in core defining its
      body sections and its assembly policy
- [ ] `veri new <type>` generates its body template from the schema;
      the hardcoded templates in the CLI are deleted
- [ ] `veri check` flags a document missing a required section, as a
      normal issue (file + one-line message)
- [ ] `get_context` derives per-type packing (full / excerpt /
      name-only / always-included) from the schema, with output
      unchanged for existing document types
- [ ] An MCP-connected agent can retrieve the writing guidance for any
      document type
- [ ] Existing documents in this repo pass the new structural checks
      (backfilling sections where needed is part of the work)
