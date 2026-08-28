#!/usr/bin/env node
import { join, resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DOC_TYPES, REQUIREMENT_KINDS, SOURCE_KINDS, assembleImportInstructions, classifyFormat, formatStatement, isOperableFormat, loadProject, startWorkOrder, supersedeDecision } from '@verikb/core';
import { z } from 'zod';
import { runCheck } from './check.ts';
import { assembleContext } from './context.ts';
import { DOCUMENT_STATUSES, getQueue, listDocuments, renderDocuments, renderQueue } from './enumerate.ts';
import { initProject, renderInit } from './init.ts';
import { getDocument, getNeighbors } from './read.ts';
import { getReceipts, renderReceipts } from './receipts.ts';
import { intentForPath } from './intent.ts';
import { paletteSearch } from './search.ts';
import { amendDocument } from './amend.ts';
import { fileDecision, fileReceipt, fileRequirement, fileSource, fileWorkOrder } from './writeback.ts';

const projectRoot = resolve(process.argv[2] ?? process.cwd());

// REQ-015: a newer or unreadable format gets a clear statement from every
// tool, never a misparse. Classified per call — the marker can change while
// the server runs (a migration, a git pull).
function guardFormat(): void {
  const format = classifyFormat(join(projectRoot, 'veri'));
  if (!isOperableFormat(format)) throw new Error(formatStatement(format) ?? 'format mismatch');
}

const server = new McpServer({ name: 'veri', version: '0.1.0' });

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

const ok = (text: string): ToolResult => ({ content: [{ type: 'text', text }] });
const fail = (err: unknown): ToolResult => ({ isError: true, content: [{ type: 'text', text: (err as Error).message }] });

server.registerTool(
  'get_context',
  {
    description:
      'Context package for a work order: the project workflow first, then the work order, its linked ' +
      'requirements and decisions (2 hops), pending proposals labeled non-binding, source excerpts, and ' +
      'the project document templates. Superseded decisions are named as already rejected, bodies omitted. ' +
      'When the neighborhood is too large to inline, its outer ring arrives as a context map — rows to ' +
      'retrieve via get_document — instead of full bodies.',
    inputSchema: { id: z.string().describe('Work order id, e.g. WO-002') },
  },
  async ({ id }) => {
    try {
      guardFormat();
      return ok((await assembleContext(projectRoot, id)).text);
    } catch (err) {
      return fail(err);
    }
  },
);

/** Ranked hits the search tool returns before truncating (WO-090); the
    tool description states this cap. */
const SEARCH_CAP = 25;

server.registerTool(
  'search',
  {
    description:
      'Find documents with the shared query grammar: case-insensitive free text over id, title, and body, ' +
      'plus composable filters — req:/dec:/wo:/src: narrows by type, is:<status> by lifecycle ' +
      '(is:active means living, is:proposed the review queue), and related:<ID> narrows to the 1-hop link ' +
      'neighborhood of that id: documents it links to and documents linking to it, via frontmatter links ' +
      'and inline [[refs]], plus the id itself. An unknown related: id returns no matches, never an error. ' +
      'Multi-word text AND-matches each word. Hits are ranked by score — id, then title, then body matches, ' +
      `whole words above substrings — and truncated to the top ${SEARCH_CAP}; each line ends with its score ` +
      'and where it matched. Example: "related:WO-028 is:active".',
    inputSchema: { query: z.string() },
  },
  async ({ query }) => {
    try {
      guardFormat();
      const { hits } = await paletteSearch(projectRoot, query);
      if (hits.length === 0) return ok('no matches');
      const lines = hits
        .slice(0, SEARCH_CAP)
        .map(
          (hit) =>
            `${hit.id}  ${hit.type}${hit.kind !== undefined ? ` (${hit.kind})` : ''}  ${hit.status}  ${hit.title}` +
            `  [score ${hit.score}${hit.matched.length > 0 ? ` · ${hit.matched.join(',')}` : ''}]`,
        );
      if (hits.length > SEARCH_CAP) lines.unshift(`top ${SEARCH_CAP} of ${hits.length} matches by score:`);
      return ok(lines.join('\n'));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'get_document',
  {
    description:
      'One document by id: its file path, then the file exactly as on disk (frontmatter and body). ' +
      'Use to read in full any document a package, search hit, or link names.',
    inputSchema: { id: z.string().describe('Document id, e.g. REQ-014') },
  },
  async ({ id }) => {
    try {
      guardFormat();
      const doc = await getDocument(projectRoot, id);
      return ok(`${doc.file}\n\n${doc.text}`);
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'get_neighbors',
  {
    description:
      'A document\'s graph neighborhood: outbound links and backlinks, each with its relation and ' +
      'whether it is declared in frontmatter, as an inline [[id]] mention, or by supersession.',
    inputSchema: { id: z.string().describe('Document id, e.g. DEC-009') },
  },
  async ({ id }) => {
    try {
      guardFormat();
      const hood = await getNeighbors(projectRoot, id);
      const line = (edge: { id: string; rel: string; via: string; title: string | null; type: string | null; status: string | null }): string =>
        edge.title === null
          ? `${edge.id}  ${edge.rel}  [${edge.via}]  (no such document — broken link)`
          : `${edge.id}  ${edge.rel}  [${edge.via}]  ${edge.type} · ${edge.status} · ${edge.title}`;
      return ok(
        [
          `${hood.id} — ${hood.title} (${hood.type} · ${hood.status})`,
          '',
          'Outbound:',
          ...(hood.outgoing.length === 0 ? ['(none)'] : hood.outgoing.map((edge) => `→ ${line(edge)}`)),
          '',
          'Backlinks:',
          ...(hood.backlinks.length === 0 ? ['(none)'] : hood.backlinks.map((edge) => `← ${line(edge)}`)),
        ].join('\n'),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'list_documents',
  {
    description:
      'Enumerate the knowledge base by lifecycle facts rather than by relevance: optional type, status, and ' +
      'updated_before (a YYYY-MM-DD cutoff, strictly before) narrow the corpus, and the filters combine. ' +
      'Returns every hit in id order — id, type, status, updated date, path, title — with no truncation, so ' +
      'a review pass ("status: proposed"), a wayfinding pass, or a staleness sweep sees the whole set. ' +
      'Documents awaiting the user\'s approval are marked (pending); withdrawn documents are excluded unless ' +
      'asked for by status. Use search instead when looking for documents by what they say.',
    // Read filters take a strict schema for the same reason writes do
    // (WO-118): a near-miss key must refuse loudly, never widen the answer
    // by being silently dropped.
    inputSchema: z
      .object({
        type: z.enum(DOC_TYPES).optional().describe('Document type, e.g. requirement, decision, work-order, source'),
        status: z.enum(DOCUMENT_STATUSES).optional().describe('Lifecycle status, e.g. draft, proposed, ready, in-progress'),
        updated_before: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a YYYY-MM-DD date')
          .optional()
          .describe('Keep only documents whose updated date is strictly before this date'),
      })
      .strict(),
  },
  async ({ type, status, updated_before }) => {
    try {
      guardFormat();
      return ok(renderDocuments(await listDocuments(projectRoot, { type, status, updatedBefore: updated_before })));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'get_queue',
  {
    description:
      'The dispatch queue: ready work orders in the order `veri next` dispatches them — lowest id first, the ' +
      'head being the one to start — followed by the in-progress work orders and the claim held on each ' +
      '(claimed_by, claimed_at). Call this to orient before starting work: take the ready head, then ' +
      'start_work_order to claim it. A work order another session holds is never yours to pick up.',
    inputSchema: z.object({}).strict(),
  },
  async () => {
    try {
      guardFormat();
      return ok(renderQueue(await getQueue(projectRoot)));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'get_receipts',
  {
    description:
      'Receipts as data rather than prose: what each work order recorded when it shipped — date, the commit ' +
      'SHAs it cites, the files it names, and its summary — one entry per line, work order first and summary ' +
      'last. Pass id for a single work order; omit it for every work order that has filed one (those with none ' +
      'are simply absent, as are withdrawn work orders unless asked for by id). An unknown id answers with an ' +
      'empty result, never an error. The SHAs are as filed and unverified: this server runs no git, so ' +
      'confirming a commit exists is `veri check` in a terminal.',
    inputSchema: z
      .object({ id: z.string().optional().describe('Work order id, e.g. WO-126; omit for every work order') })
      .strict(),
  },
  async ({ id }) => {
    try {
      guardFormat();
      return ok(renderReceipts(await getReceipts(projectRoot, id), id));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'init_project',
  {
    description:
      'Create a Veri knowledge base where there is none — the same scaffold `veri init` writes: a veri/ directory ' +
      'holding requirements/, decisions/, work-orders/, sources/, the default workflow document, and the project ' +
      'templates, plus AGENTS.md and CLAUDE.md pointer files (a file of either name that already exists is left ' +
      'untouched). This is the only tool that works before a knowledge base exists; every other one needs one. ' +
      'Ask the user first and call this only after they say yes — it writes files into their repository, and ' +
      'having Veri installed is not consent to restructure a repo (DEC-125, DEC-133). Refused when a veri/ is ' +
      'already there: an existing knowledge base is never overwritten, and bringing an older one to the current ' +
      'format is `veri migrate` in a terminal. Optional path, relative to this server\'s project root, initializes ' +
      'a subdirectory; omit it for the root itself.',
    // Strict like every other schema on this surface (WO-118): a near-miss
    // key must refuse loudly rather than be dropped — here a dropped path
    // would silently scaffold the project root instead of the subdirectory
    // the caller named.
    inputSchema: z
      .object({
        path: z
          .string()
          .optional()
          .describe('Directory to initialize, relative to this server\'s project root; omit for the root itself'),
      })
      .strict(),
  },
  async ({ path }) => {
    try {
      guardFormat();
      return ok(renderInit(initProject(projectRoot, path)));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'file_decision',
  {
    description:
      'File a technical decision as a proposal — a new document with the next free DEC id and status: proposed, ' +
      'pending the user\'s review; it is not binding until they approve it. ' +
      'Use when a non-trivial choice is made during implementation; include the rejected alternatives.',
    // Write tools take strict schemas (WO-118): zod's default strip mode
    // silently swallowed content sent under a near-miss key — DEC-112 lost
    // its Rejected alternatives this way. Unknown keys must refuse loudly.
    inputSchema: z
      .object({
        title: z.string(),
        choice: z.string().describe('What was chosen'),
        rejected_alternatives: z.string().optional().describe('Markdown list of alternatives and why they lost'),
        rationale: z.string().optional(),
        links: z
          .array(z.object({ id: z.string(), rel: z.string() }))
          .optional()
          .describe('Documents this decision constrains, e.g. [{id: "WO-003", rel: "constrains"}]'),
      })
      .strict(),
  },
  async (input) => {
    try {
      guardFormat();
      const { id, file } = await fileDecision(projectRoot, input);
      return ok(
        `Filed ${id} at ${file} as a proposal pending the user's review — not binding yet. ` +
          `Present it to the user: what it commits them to, what it rules out, and the alternatives rejected. ` +
          `They promote it with veri approve ${id} (or in the app).`,
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'file_work_order',
  {
    description:
      'Propose a unit of work as a new work order with the next free WO id and status: backlog — ' +
      'planned, not started, and not binding until the user reviews it. ' +
      'Use when asked to implement something no existing work order covers.',
    inputSchema: z
      .object({
        title: z.string(),
        summary: z.string().describe('What this delivers'),
        in_scope: z.string().optional().describe('Markdown list of what the work includes'),
        out_of_scope: z.string().optional().describe('Markdown list of what is explicitly excluded'),
        acceptance_tests: z.string().optional().describe('Markdown checklist, e.g. "- [ ] First test"'),
        links: z
          .array(z.object({ id: z.string(), rel: z.string() }))
          .optional()
          .describe('Documents this work order delivers or depends on, e.g. [{id: "REQ-002", rel: "implements"}]'),
      })
      .strict(),
  },
  async (input) => {
    try {
      guardFormat();
      const { id, file } = await fileWorkOrder(projectRoot, input);
      return ok(
        `Filed ${id} at ${file} in backlog — a proposal, not started work. ` +
          `Present it to the user; implementation begins only after they review it and move it out of backlog ` +
          `(a started work order must link the requirement it implements).`,
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'file_requirement',
  {
    description:
      'File a requirement as a draft — a new document with the next free REQ id and status: draft, ' +
      'pending the user\'s review; it is not binding until they accept it. ' +
      'Used by brownfield import sessions and any session proposing a requirement. ' +
      'A requirement that is a bet rather than a rule must say so: pass kind: hypothesis with the ' +
      'outcome that would settle it, or it lands as a constraint and nothing will ever ask whether it paid off.',
    inputSchema: z
      .object({
        title: z.string(),
        body: z.string().describe('What must hold, as markdown prose — the what, not the how'),
        acceptance_criteria: z.string().optional().describe('Markdown checklist, e.g. "- [ ] First criterion"'),
        links: z
          .array(z.object({ id: z.string(), rel: z.string() }))
          .optional()
          .describe('Evidence and related documents, e.g. [{id: "SRC-002", rel: "derived-from"}]'),
        // REQ-032's epistemic kind, reachable from the tool surface (WO-137).
        kind: z
          .enum(REQUIREMENT_KINDS)
          .optional()
          .describe(
            'constraint (default) — must be satisfied and stay satisfied, verified by acceptance criteria; ' +
              'hypothesis — a bet only tested by shipping, which stays open until outcome evidence lands',
          ),
        outcome: z
          .object({
            metric: z.string().min(1).describe('What is measured, e.g. "time-to-first-success"'),
            target: z.union([z.string().min(1), z.number()]).describe('The value that settles it, e.g. "< 5 minutes"'),
          })
          .strict()
          .optional()
          .describe('What would confirm or refute a hypothesis. A hypothesis filed without one is a check violation'),
      })
      .strict(),
  },
  async (input) => {
    try {
      guardFormat();
      const { id, file } = await fileRequirement(projectRoot, input);
      // A bet with no terms is reported, never quietly accepted: check calls
      // it a violation, and the filer hears it here rather than at the gate.
      const bare =
        input.kind === 'hypothesis' && input.outcome === undefined
          ? ` It is a hypothesis with no declared outcome, which veri check reports as a violation — ` +
            `add outcome: {metric, target} naming what would confirm or refute it.`
          : '';
      return ok(
        `Filed ${id} at ${file} as a draft pending the user's review — not binding yet. ` +
          `They promote it with veri approve ${id} (or in the app).${bare}`,
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'file_source',
  {
    description:
      'File a source document — imported evidence or reference material — with the next free SRC id. ' +
      'Brownfield imports file their manifest and evidence documents here; the body should name ' +
      'concrete file paths, commit refs, and excerpts.',
    inputSchema: z
      .object({
        title: z.string(),
        body: z.string().describe('The evidence: file paths, commit refs, excerpts, provenance'),
        links: z
          .array(z.object({ id: z.string(), rel: z.string() }))
          .optional()
          .describe('Related documents, e.g. [{id: "SRC-001", rel: "imported-via"}] for the import manifest'),
        kind: z
          .enum(SOURCE_KINDS)
          .optional()
          .describe('The evidence class (REQ-038): design, user-feedback, metric, external-eval, investigation, outcome, or reference. Absent means reference.'),
      })
      .strict(),
  },
  async (input) => {
    try {
      guardFormat();
      const { id, file } = await fileSource(projectRoot, input);
      return ok(`Filed ${id} at ${file}.`);
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'get_import_instructions',
  {
    description:
      'The brownfield import instruction package (REQ-024): what to mine from the repo, the filing ' +
      'rules and link relations, a census of documents already in the knowledge base, and the ' +
      'project\'s document templates. Call this when asked to import existing project knowledge ' +
      'into Veri, then follow it exactly.',
    inputSchema: {},
  },
  async () => {
    try {
      guardFormat();
      const veriDir = join(projectRoot, 'veri');
      const { documents } = await loadProject(veriDir);
      return ok(assembleImportInstructions(veriDir, documents));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'run_check',
  {
    description:
      'The project health check — the same derivation `veri check` runs, as structured JSON. ' +
      '`violations` are the gate (any entry fails the CLI with exit 1); `advisories` inform and never block; ' +
      '`skipped` names checks this server cannot run with the reason — the git-backed tier (provenance, drift) ' +
      'needs a terminal `veri check`, since this server spawns no subprocesses, and the shell tier (stale shells, ' +
      'orphaned triggers) belongs to the host that emits them. ' +
      'Call this before filing a receipt or declaring a work order done: pass true with zero violations is the bar.',
    inputSchema: {},
  },
  async () => {
    try {
      guardFormat();
      const report = await runCheck(projectRoot);
      if (report === null) throw new Error('no veri/ directory here');
      // The tool's wire keys (pass/violations/skipped, per the description
      // above) are this surface's serialization of core's CheckReport —
      // presentation at the edge, not a second report shape (WO-093).
      return ok(
        JSON.stringify(
          {
            pass: report.issues.length === 0,
            format: report.formatLine,
            documents: report.documentCount,
            violations: report.issues,
            advisories: report.advisories,
            skipped: report.skips,
          },
          null,
          2,
        ),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'start_work_order',
  {
    description:
      'Begin implementation: flip a ready work order to in-progress, recording the claim — which session ' +
      'holds it (claimed_by) and since when (claimed_at). Only ready work orders start: the user\'s ' +
      'approve stamp is the dispatch clearance, and an already-claimed work order is refused, naming its ' +
      'holder. Call this before writing code for a work order, with a claimed_by that identifies this ' +
      'session; then commit the flip with a subject like "WO-042: started".',
    inputSchema: z
      .object({
        id: z.string().describe('Work order id, e.g. WO-042'),
        claimed_by: z.string().describe('This session\'s identity — free text, unique per session'),
      })
      .strict(),
  },
  async ({ id, claimed_by }) => {
    try {
      guardFormat();
      const result = await startWorkOrder(join(projectRoot, 'veri'), id, claimed_by);
      return ok(
        `${result.id} ready → in-progress — claimed by ${result.claimedBy} (${result.claimedAt}) at veri/${result.file}. ` +
          `Commit the flip with a start subject (e.g. "${result.id}: started — claimed by ${result.claimedBy}") so ` +
          `provenance anchors the work's era.`,
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'supersede_decision',
  {
    description:
      'Retire an active decision, naming the active decision that now governs: writes status: superseded and ' +
      'superseded_by together, the pair the schema requires. This is the backward half of a reversal — file the ' +
      'replacement forward first (file_decision, with a supersedes link), have the user approve it, and only then ' +
      'call this. A successor that is still proposed is refused: an unapproved decision has no downstream power ' +
      '(REQ-008), and retiring the old one on its word would leave the fork governed by nothing. Superseding is ' +
      'not itself a promotion — the human act it records is the successor\'s approval stamp.',
    inputSchema: z
      .object({
        id: z.string().describe('The active decision being retired, e.g. DEC-063'),
        superseded_by: z.string().describe('The active decision that replaces it, e.g. DEC-074'),
      })
      .strict(),
  },
  async ({ id, superseded_by }) => {
    try {
      guardFormat();
      const result = await supersedeDecision(join(projectRoot, 'veri'), id, superseded_by);
      return ok(
        `${result.id} ${result.from} → superseded by ${result.successor} at veri/${result.file}. ` +
          `Its body stays: a reversed decision is history the record keeps, and in-progress work orders still ` +
          `standing on ${result.id} now report as drift.`,
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'file_receipt',
  {
    description:
      'Append a work-session receipt (date, commit, files touched, one-line summary) to a work order — ' +
      'or, for import sessions, to the import manifest source as the completion signal. ' +
      'Receipts accumulate; existing ones are never overwritten.',
    inputSchema: z
      .object({
        work_order_id: z.string().describe('Work order id — or an import manifest SRC id (DEC-068)'),
        commit: z.string().describe('Commit SHA of the session’s work'),
        files: z.string().describe('Files touched, comma-separated'),
        summary: z.string().describe('One-line summary of the session'),
        date: z.string().optional().describe('YYYY-MM-DD, defaults to today'),
      })
      .strict(),
  },
  async (input) => {
    try {
      guardFormat();
      const { file } = await fileReceipt(projectRoot, input);
      return ok(`Appended receipt to ${file}`);
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'amend_document',
  {
    description:
      'Revise a pending document after review feedback — the iterate half of propose → review → revise (DEC-103). ' +
      'Replaces the title, the whole body, and/or the links list of a draft requirement, proposed decision, or ' +
      'backlog work order. Never a promotion: approved, ready, or started documents are refused, no status or ' +
      'approval field exists to send, and receipts stay append-only via file_receipt (the body may not carry a ' +
      'Receipts section — the existing one is preserved). Create with the file_* tools; amend while unbinding; ' +
      'promotion stays the user’s act.',
    inputSchema: z
      .object({
        id: z.string().describe('Document id, e.g. WO-002'),
        title: z.string().optional().describe('Replacement title'),
        body: z
          .string()
          .optional()
          .describe('Complete replacement markdown body (everything below the frontmatter), without a Receipts section'),
        links: z
          .array(z.object({ id: z.string(), rel: z.string() }))
          .optional()
          .describe('Full replacement of the frontmatter links list; [] clears it'),
      })
      .strict(),
  },
  async (input) => {
    try {
      guardFormat();
      const { id, file } = await amendDocument(projectRoot, input);
      return ok(`Amended ${id} at ${file} — still pending the user's review, not binding until they approve it.`);
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'get_intent',
  {
    description:
      'The documents governing a code path (WO-095): work orders whose code bindings or receipts touch it — ' +
      'bindings ranked above receipts, newest first — the module-registry entry covering it, and the ' +
      'requirements and decisions those work orders cite. Grounded entirely in what this knowledge base ' +
      'records (bindings, receipt file lists, the module registry), not a code index: unrecorded work will ' +
      'not appear. Ask before editing a file to learn what governs it.',
    inputSchema: { path: z.string().describe('Repo-relative file or directory path, e.g. packages/core/src/check.ts') },
  },
  async ({ path }) => {
    try {
      guardFormat();
      return ok(await intentForPath(projectRoot, path));
    } catch (err) {
      return fail(err);
    }
  },
);

await server.connect(new StdioServerTransport());
