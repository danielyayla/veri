import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildGraph, isPending, loadProject } from '@veri/core';
import type { VeriDocument } from '@veri/core';

/** Rough token estimate per REQ-003: chars/4 is fine. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const SOURCE_EXCERPT_CHARS = 600;

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
  const pending = reached.filter(isPending);
  const requirements = reached.filter((doc) => doc.type === 'requirement' && !isPending(doc));
  const activeDecisions = reached.filter((doc) => doc.type === 'decision' && doc.status === 'active');
  const supersededDecisions = reached.filter((doc) => doc.type === 'decision' && doc.status === 'superseded');
  const sources = reached.filter((doc) => doc.type === 'source');

  const conventionsPath = join(projectRoot, 'CLAUDE.md');
  const conventions = existsSync(conventionsPath) ? await readFile(conventionsPath, 'utf8') : null;

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

  // Deterministic ordering: conventions → work order → requirements → decisions → sources.
  if (conventions !== null) {
    push(`## Project conventions (CLAUDE.md) · ~${estimateTokens(conventions)} tokens`, conventions.trim() + '\n');
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
  if (activeDecisions.length > 0 || supersededDecisions.length > 0) {
    parts.push('## Decisions');
    for (const doc of activeDecisions) {
      const { heading, text } = renderFull(doc, '###');
      push(heading, text);
    }
    if (supersededDecisions.length > 0) {
      const lines = supersededDecisions.map(
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
      const excerpt = body.length > SOURCE_EXCERPT_CHARS ? `${body.slice(0, SOURCE_EXCERPT_CHARS)}…` : body;
      const text = `${excerpt}\n`;
      push(`### ${doc.id} — ${doc.title} · excerpt · ~${estimateTokens(text)} tokens`, text);
    }
  }

  const header = `# Context package · ${workOrder.id} — ${workOrder.title}\n(${docCount} docs · ~${totalTokens} tokens)`;
  return { text: [header, ...parts].join('\n\n'), docCount, totalTokens };
}
