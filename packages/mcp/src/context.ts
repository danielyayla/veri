import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ASSEMBLY_POLICY, DOC_TYPES, buildGraph, getTemplate, isPending, loadProject, packingFor } from '@veri/core';
import type { VeriDocument } from '@veri/core';

/** Rough token estimate per REQ-003: chars/4 is fine. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** How this document's body ships, per core's assembly policy (DEC-025). */
function packing(doc: VeriDocument) {
  return packingFor(doc.type, doc.status);
}

export interface ContextPackage {
  text: string;
  docCount: number;
  totalTokens: number;
}

/**
 * Assemble the context package for a work order: everything an agent needs
 * to implement it correctly, per the package rules in REQ-003.
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
  // order links *to* it, so incoming edges count as "linked" too.
  const visited = new Set<string>([workOrderId]);
  let frontier = [workOrderId];
  for (let hop = 0; hop < 2; hop++) {
    const next: string[] = [];
    for (const id of frontier) {
      const neighbors = [
        ...graph.outgoing(id).map((edge) => edge.to),
        ...graph.backlinks(id).map((edge) => edge.from),
      ];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor) && graph.byId.has(neighbor)) {
          visited.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }

  const reached = [...visited]
    .filter((id) => id !== workOrderId)
    .map((id) => graph.byId.get(id)!)
    .sort((a, b) => a.id.localeCompare(b.id));
  // Pending documents (draft REQ / proposed DEC, REQ-008) leave the binding
  // sections for a labeled block: visible so agents don't contradict them,
  // labeled so agents don't rely on them.
  const pending = reached.filter((doc) => isPending(doc) && doc.type !== 'workflow');
  const requirements = reached.filter((doc) => doc.type === 'requirement' && !isPending(doc));
  const activeDecisions = reached.filter(
    (doc) => doc.type === 'decision' && !isPending(doc) && packing(doc).mode === 'full',
  );
  const nameOnlyDecisions = reached.filter((doc) => doc.type === 'decision' && packing(doc).mode === 'name-only');
  const sources = reached.filter((doc) => doc.type === 'source');

  // The project workflow (DEC-018) opens every package, reached or not — its
  // policy is include: 'always', never part of the traversal buckets.
  // Retired ones stay out.
  const workflow =
    ASSEMBLY_POLICY.workflow.include === 'always'
      ? documents
          .filter((doc) => doc.type === 'workflow' && doc.status !== 'retired')
          .sort((a, b) => a.id.localeCompare(b.id))[0]
      : undefined;

  const linksLine = (doc: VeriDocument): string =>
    doc.links.length === 0 ? '' : `Links: ${doc.links.map((l) => `${l.id} (${l.rel})`).join(', ')}\n\n`;

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

  // Deterministic ordering: workflow → work order → requirements → decisions → sources.
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
}
