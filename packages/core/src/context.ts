import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildGraph } from './graph.ts';
import { checkStructure, isPending } from './check.ts';
import { checkSupersededLinks } from './drift.ts';
import { DOC_TYPES, compareIds } from './ids.ts';
import { loadProject } from './load.ts';
import { ASSEMBLY_POLICY, INLINE_THRESHOLD_TOKENS, packingFor } from './schema.ts';
import { getTemplate } from './templates.ts';
import type { VeriDocument } from './types.ts';

/** Rough token estimate per REQ-003: chars/4 is fine. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** How this document's body ships, per the assembly policy (DEC-025). */
function packing(doc: VeriDocument) {
  return packingFor(doc.type, doc.status);
}

export interface ContextPackage {
  text: string;
  /** Documents shipped with their bodies (map rows don't count). */
  docCount: number;
  totalTokens: number;
  /** 'inline': the whole 2-hop neighborhood fit under the threshold and
      ships in full. 'layered': hop-1 in full, hop-2 as the context map
      (DEC-035). A pure function of the same files — never of anything else. */
  mode: 'inline' | 'layered';
  /** Documents enumerated in the context map (0 in inline mode). */
  mappedCount: number;
}

/**
 * Assemble the context package for a work order, layered per DEC-035:
 * a guaranteed core in full text (workflow, the work order, everything
 * directly linked), and — only when the fully-inlined 2-hop package would
 * exceed INLINE_THRESHOLD_TOKENS — the hop-2 ring as a context map the
 * agent retrieves from on demand (REQ-018).
 *
 * Lives in core (DEC-038) so the CLI (`veri context`) and the MCP server
 * (`get_context`) serve one byte-identical package from one implementation.
 */
export async function assembleContext(projectRoot: string, workOrderId: string): Promise<ContextPackage> {
  const veriDir = join(projectRoot, 'veri');
  if (!existsSync(veriDir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  const { documents } = await loadProject(veriDir);
  const graph = buildGraph(documents);

  const workOrder = graph.byId.get(workOrderId);
  if (workOrder === undefined) throw new Error(`no document with id ${workOrderId}`);
  if (workOrder.type !== 'work-order') {
    throw new Error(`${workOrderId} is a ${workOrder.type}; get_context expects a work order id`);
  }

  // 2-hop traversal in both directions: a decision that constrains this work
  // order links *to* it, so incoming edges count as "linked" too. Each id
  // keeps the hop it was first reached at — hop 1 is the binding core's ring,
  // hop 2 is the map's (DEC-035).
  const hopOf = new Map<string, number>([[workOrderId, 0]]);
  let frontier = [workOrderId];
  for (let hop = 1; hop <= 2; hop++) {
    const next: string[] = [];
    for (const id of frontier) {
      const neighbors = [
        ...graph.outgoing(id).map((edge) => edge.to),
        ...graph.backlinks(id).map((edge) => edge.from),
      ];
      for (const neighbor of neighbors) {
        if (!hopOf.has(neighbor) && graph.byId.has(neighbor)) {
          hopOf.set(neighbor, hop);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }

  const reached = [...hopOf.keys()]
    .filter((id) => id !== workOrderId)
    .map((id) => graph.byId.get(id)!)
    .sort((a, b) => compareIds(a.id, b.id));

  // The project workflow (DEC-018) opens every package, reached or not — its
  // policy is include: 'always', never part of the traversal buckets.
  // Retired ones stay out.
  const workflow =
    ASSEMBLY_POLICY.workflow.include === 'always'
      ? documents
          .filter((doc) => doc.type === 'workflow' && doc.status !== 'retired')
          .sort((a, b) => compareIds(a.id, b.id))[0]
      : undefined;

  const linksLine = (doc: VeriDocument): string =>
    doc.links.length === 0 ? '' : `Links: ${doc.links.map((l) => `${l.id} (${l.rel})`).join(', ')}\n\n`;

  /** How a hop-2 document connects to the core: its first edge to a hop-1
      document in id order (then rel order), either direction. Deterministic. */
  const connection = (doc: VeriDocument): string => {
    const pairs: Array<[string, string]> = [];
    for (const edge of graph.outgoing(doc.id)) if (hopOf.get(edge.to) === 1) pairs.push([edge.to, edge.rel]);
    for (const edge of graph.backlinks(doc.id)) if (hopOf.get(edge.from) === 1) pairs.push([edge.from, edge.rel]);
    pairs.sort((a, b) => compareIds(a[0], b[0]) || a[1].localeCompare(b[1]));
    const [id, rel] = pairs[0]!;
    return `via ${id} (${rel})`;
  };

  /** Render one package: `inlined` ships bodies (bucketed as ever), `mapped`
      ships as annotated map rows. Inline mode is exactly `render(reached, [])`. */
  const render = (inlined: VeriDocument[], mapped: VeriDocument[]): Omit<ContextPackage, 'mode' | 'mappedCount'> => {
    // Pending documents (draft REQ / proposed DEC, REQ-008) leave the binding
    // sections for a labeled block: visible so agents don't contradict them,
    // labeled so agents don't rely on them.
    const pending = inlined.filter((doc) => isPending(doc) && doc.type !== 'workflow');
    const requirements = inlined.filter((doc) => doc.type === 'requirement' && !isPending(doc));
    const activeDecisions = inlined.filter(
      (doc) => doc.type === 'decision' && !isPending(doc) && packing(doc).mode === 'full',
    );
    const nameOnlyDecisions = inlined.filter((doc) => doc.type === 'decision' && packing(doc).mode === 'name-only');
    const sources = inlined.filter((doc) => doc.type === 'source');

    interface Rendered {
      heading: string;
      text: string;
    }
    const renderFull = (doc: VeriDocument, level: string): Rendered => {
      const text = `${linksLine(doc)}${doc.body.trim()}\n`;
      return {
        heading: `${level} ${doc.id} — ${doc.title} · ${doc.status} · ~${estimateTokens(text)} tokens`,
        text,
      };
    };

    const parts: string[] = [];
    let totalTokens = 0;
    let docCount = 0;

    const push = (heading: string, text: string): void => {
      parts.push(`${heading}\n\n${text}`);
      totalTokens += estimateTokens(text);
      docCount += 1;
    };

    // Deterministic ordering: workflow → work order → requirements → decisions
    // → pending → sources → context map → templates.
    if (workflow !== undefined) {
      const text = `${workflow.body.trim()}\n`;
      // A draft workflow is visible but non-binding, same labeling rule as REQ-008.
      const pendingNote = isPending(workflow) ? ` · ${workflow.status} — not ratified, do not treat as binding` : '';
      push(`## Workflow · ${workflow.id} — ${workflow.title}${pendingNote} · ~${estimateTokens(text)} tokens`, text);
    }
    {
      const { heading, text } = renderFull(workOrder, '## Work order');
      push(heading, text);
    }
    // The advisory tier for the subject work order (WO-045) — pure findings
    // only, so the package stays byte-identical across CLI and MCP (DEC-038)
    // and the MCP server stays subprocess-free (DEC-037). Git-backed
    // advisories surface in `veri check` and the UI instead.
    {
      const advisories = [
        ...checkStructure(veriDir, [workOrder]),
        ...checkSupersededLinks(documents).filter((advisory) => advisory.id === workOrder.id),
      ];
      if (advisories.length > 0) {
        const text = `${advisories.map((advisory) => `- ${advisory.message}`).join('\n')}\n`;
        totalTokens += estimateTokens(text);
        parts.push(`## Advisories on this work order — informational, never blocking (DEC-025)\n\n${text}`);
      }
    }
    if (requirements.length > 0) {
      parts.push('## Requirements');
      for (const doc of requirements) {
        const { heading, text } = renderFull(doc, '###');
        push(heading, text);
      }
    }
    if (activeDecisions.length > 0 || nameOnlyDecisions.length > 0) {
      parts.push('## Decisions');
      for (const doc of activeDecisions) {
        const { heading, text } = renderFull(doc, '###');
        push(heading, text);
      }
      if (nameOnlyDecisions.length > 0) {
        const lines = nameOnlyDecisions.map(
          (doc) => `- ${doc.id} — ${doc.title}${doc.supersededBy ? ` (superseded by ${doc.supersededBy})` : ''}`,
        );
        parts.push(`### Already rejected (superseded — bodies omitted)\n\n${lines.join('\n')}\n`);
      }
    }
    if (pending.length > 0) {
      parts.push('## Pending proposals — not ratified, do not treat as binding');
      for (const doc of pending) {
        const { heading, text } = renderFull(doc, '###');
        push(heading, text);
      }
    }
    if (sources.length > 0) {
      parts.push('## Sources (excerpts)');
      for (const doc of sources) {
        const body = doc.body.trim();
        const mode = packing(doc);
        const chars = mode.mode === 'excerpt' ? mode.chars : body.length;
        const excerpt = body.length > chars ? `${body.slice(0, chars)}…` : body;
        const text = `${excerpt}\n`;
        push(`### ${doc.id} — ${doc.title} · excerpt · ~${estimateTokens(text)} tokens`, text);
      }
    }
    if (mapped.length > 0) {
      // The context map (DEC-035): the hop-2 ring as annotated rows — id,
      // title, type, status, how it connects to the core, and what retrieval
      // costs — so nothing adjacent is silently invisible (REQ-018).
      const rows = mapped.map(
        (doc) =>
          `- ${doc.id} — ${doc.title} · ${doc.type} · ${doc.status} · ${connection(doc)} · ~${estimateTokens(doc.body)} tokens`,
      );
      const text = `Adjacent knowledge, enumerated instead of inlined. Retrieve any of it in full with get_document(<id>); walk further with get_neighbors(<id>).\n\n${rows.join('\n')}\n`;
      totalTokens += estimateTokens(text);
      parts.push(`## Context map — ${mapped.length} adjacent documents, not inlined\n\n${text}`);
    }

    // Document templates close every package (REQ-010): an agent drafting a
    // document mid-work-order follows the project's structure, not its own.
    // Templates are not documents (DEC-023) — they add tokens, never docCount.
    {
      const blocks = DOC_TYPES.map((type) => {
        const { body, source } = getTemplate(veriDir, type);
        return `### ${type} · ${source === 'project' ? 'project template' : 'built-in default'}\n\n${body.trim()}\n`;
      });
      const text = blocks.join('\n');
      totalTokens += estimateTokens(text);
      parts.push(`## Templates — how new documents start in this project\n\nWhen you create a document, use its type's body below.\n\n${text}`);
    }

    const header = `# Context package · ${workOrder.id} — ${workOrder.title}\n(${docCount} docs · ~${totalTokens} tokens)`;
    return { text: [header, ...parts].join('\n\n'), docCount, totalTokens };
  };

  // DEC-035's escalation rule: under the threshold, everything inlines —
  // identical to the pre-layering output. The switch is a pure function of
  // the same files, so assembly stays byte-deterministic.
  const inline = render(reached, []);
  if (inline.totalTokens <= INLINE_THRESHOLD_TOKENS) {
    return { ...inline, mode: 'inline', mappedCount: 0 };
  }

  const core = reached.filter((doc) => hopOf.get(doc.id) === 1);
  // The map enumerates the whole hop-2 ring — including neighboring work
  // orders, which no bucket inlines — except workflows (always inlined).
  const mapped = reached.filter((doc) => hopOf.get(doc.id) === 2 && doc.type !== 'workflow');
  const layered = render(core, mapped);
  return { ...layered, mode: 'layered', mappedCount: mapped.length };
}
