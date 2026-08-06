# skiff — Veri demo project

This is the knowledge base of **skiff**, a fictional local-first invoicing
app for freelancers, installed by `veri init --demo`. It exists so you can
explore a populated `veri/` directory before writing your own: 4
requirements, 5 decisions, 5 work orders, and 2 sources, all cross-linked.

Things to try:

```bash
veri list            # every document: id, status, title
veri check           # knowledge-base health (see below)
veri new decision "Some new choice"
```

With the Veri MCP server pointed at this directory, `get_context("WO-002")`
assembles the full working context for the in-progress PDF-export work
order: project conventions, the work order, [REQ-002](veri/requirements/REQ-002-pdf-export-with-templates.md)
in full, the decisions that constrain it, and source excerpts — with the
superseded Handlebars decision listed as already rejected.

## Two deliberate health issues

`veri check` reports **exactly two issues** here, on purpose, so the demo
shows what an unhealthy document looks like:

1. **WO-004 (Client manager) has no linked requirement.** A work order
   with no requirement is work nobody asked for — Veri flags it until a
   requirement is written and linked.
2. **REQ-004 (Import time entries from CSV) references `[[SRC-003]]`,
   which does not exist.** The column-mapping source was never imported,
   so the requirement rests on a document you can't read.

Everything else is healthy. Fix them (write the requirement, import the
source or remove the reference) and `veri check` goes green.

## The supersession chain

[DEC-003](veri/decisions/DEC-003-handlebars-templates.md) (Handlebars
templates) is superseded by [DEC-005](veri/decisions/DEC-005-typst-for-pdf-rendering.md)
(Typst): the headless-browser print step was slow and nondeterministic.
Superseded decisions stay in the knowledge base — they record what was
already tried — but context packages exclude their bodies and list them
as already rejected, so an agent never re-proposes Handlebars.
