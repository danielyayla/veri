/**
 * The opinionated default workflow every scaffold installs (DEC-018, WO-021),
 * plus the harness pointer files. The workflow is a first-class document —
 * `veri/workflow.md` — delivered as the first section of every context
 * package. Harness entry files carry no method: they only point here.
 *
 * The text below must stay harness-neutral: no vendor, harness, or model
 * names anywhere.
 */

/** The default `veri/workflow.md`. Ships accepted: installing it is the user's act (DEC-019). */
export function defaultWorkflowMd(date: string): string {
  return `---
id: WF-001
type: workflow
title: Project workflow
status: accepted
approved: ${date}
created: ${date}
updated: ${date}
---

This document defines how work moves through this project. It is
delivered as the first section of every context package, so every
human and every agent — whatever tool they use — works from the same
rules. Edit it to change how this project works.

## The path of work

Evidence becomes requirements and decisions; those become work orders;
work orders become implementation with receipts.

1. **Sources** (\`veri/sources/\`) hold evidence: interviews, research,
   design artifacts, imported material. Sources inform; they never
   bind.
2. **Requirements** (\`veri/requirements/\`) state what must be true and
   for whom, with acceptance criteria. **Decisions**
   (\`veri/decisions/\`) record technical choices with the alternatives
   that were rejected, so settled ground stays settled.
3. **Work orders** (\`veri/work-orders/\`) scope a unit of
   implementation: goal, in scope, out of scope, acceptance criteria,
   receipts. Every work order links at least one requirement.
4. **Implementation** happens only against a work order, inside its
   scope, respecting every linked document.

## Rules for implementers

1. Never start coding from a chat prompt alone. Find the relevant work
   order; if none exists, say so and propose one.
2. Before implementing a work order, read every document it links to
   in full. If you believe a linked decision is wrong, stop and say so
   instead of silently deviating.
3. Stay inside the work order's "In scope" section. Anything under
   "Out of scope" is forbidden, even when it seems easy or obvious.
4. File non-trivial technical choices made during implementation
   (library, algorithm, schema shape) as new decisions with the
   rejected alternatives, using the next free DEC id.
5. Documents are born unapproved (\`draft\` / \`proposed\`). Promotion is
   a human act alone — the project owner's, or a listed maintainer's —
   recorded as an \`approved:\` date stamp (\`veri approve <id>\`). Never
   promote a document yourself. Unapproved documents are visible in
   context packages but never binding.
6. When you finish a work session, append a receipt to the work order
   under \`## Receipts\` — one line: date — commit or PR ref — one
   sentence of what the session did. Git is the record of what changed;
   the receipt is a pointer into it, never a copy of it. A work order
   is done only when all acceptance criteria are checked and at least
   one receipt exists.
7. Run \`veri check\` before declaring any work complete. Zero issues is
   the bar.

## Working as a team

Git is the only sync layer: branches, merges, and pull requests carry
\`veri/\` exactly like code. Three rules keep a shared knowledge base
coherent; a solo project can ignore this section entirely.

1. **Ids may collide across branches.** Two branches can allocate the
   same new id; the merged tree then fails \`veri check\` with both
   files named. Resolve on your branch after merging the main branch:
   \`veri renumber <id> --file <path-to-your-document>\` moves your
   document to the next free id and reports every reference for
   review. Never resolve a collision by hand-editing id lines.
2. **Approvals name their maintainer.** When this document's
   frontmatter declares a \`maintainers:\` list, every stamp records who
   approved: \`veri approve <id> --as <name>\`. Only listed maintainers
   may stamp; the gate honors each maintainer's stamp identically.
3. **The stamp rides the pull request; merging never approves.**
   Propose documents on a branch as \`draft\`/\`proposed\`. The reviewing
   maintainer approves by running \`veri approve\` and pushing that
   commit to the branch before merge. A document merged without a
   stamp simply stays pending — no bot or merge hook ever promotes.
`;
}

/**
 * `AGENTS.md` — the one harness entry file scaffolds write. Content-free
 * by design: the method lives in workflow.md and arrives via the context
 * package, so there is nothing here to drift out of date.
 */
export const AGENTS_MD = `# Working in this repository

This project is managed with Veri: its requirements, decisions, and
work orders live in \`veri/\` as linked markdown documents.

Before writing any code:

1. Identify the work order for your task in \`veri/work-orders/\`
   (if none exists, propose one instead of starting).
2. Fetch its context package — over MCP with \`get_context(<WO-id>)\`,
   or from a terminal with \`veri context <WO-id>\`.
3. Follow the project workflow, which arrives as the first section of
   that package (canonical copy: \`veri/workflow.md\`).

Before filing a receipt or declaring work done, verify: call
\`run_check()\` over MCP, or run \`veri check\` in a terminal. Zero
violations is the bar — advisories inform, never block.

The package contains everything that binds: the workflow, the work
order, its linked requirements and decisions, and source excerpts.
`;

/** `CLAUDE.md` — a deferral, not a second copy. */
export const CLAUDE_MD_POINTER = `See AGENTS.md. This project is managed with Veri — fetch the context
package for your work order before writing any code.
`;
