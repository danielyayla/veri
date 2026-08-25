import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildGraph, loadProject } from '@verikb/core';

/**
 * Read tools (REQ-017): an agent must be able to dereference any id it
 * encounters and walk the graph without assembling a package. Both are
 * pure reads over the same load path every other surface uses (DEC-009).
 */

export interface DocumentText {
  id: string;
  /** Path relative to the project root, e.g. veri/requirements/REQ-001-… */
  file: string;
  /** The file exactly as on disk: frontmatter and body. */
  text: string;
}

export interface NeighborEdge {
  /** The document on the other end of the edge. */
  id: string;
  rel: string;
  via: 'frontmatter' | 'inline' | 'superseded_by';
  /** Null when the target id does not resolve (a broken link). */
  title: string | null;
  type: string | null;
  status: string | null;
}

export interface Neighborhood {
  id: string;
  title: string;
  type: string;
  status: string;
  outgoing: NeighborEdge[];
  backlinks: NeighborEdge[];
}

function requireVeriDir(projectRoot: string): string {
  const dir = join(projectRoot, 'veri');
  if (!existsSync(dir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  return dir;
}

/** One document by id, exactly as it exists on disk. */
export async function getDocument(projectRoot: string, id: string): Promise<DocumentText> {
  const veriDir = requireVeriDir(projectRoot);
  const { documents } = await loadProject(veriDir);
  const doc = documents.find((candidate) => candidate.id === id);
  if (doc === undefined) throw new Error(`no document with id ${id}`);
  const text = await readFile(join(veriDir, doc.file), 'utf8');
  return { id: doc.id, file: `veri/${doc.file}`, text };
}

/** A document's graph neighborhood: outbound links and backlinks with rels. */
export async function getNeighbors(projectRoot: string, id: string): Promise<Neighborhood> {
  const veriDir = requireVeriDir(projectRoot);
  const { documents } = await loadProject(veriDir);
  const graph = buildGraph(documents);
  const doc = graph.byId.get(id);
  if (doc === undefined) throw new Error(`no document with id ${id}`);

  const describe = (otherId: string, rel: string, via: NeighborEdge['via']): NeighborEdge => {
    const other = graph.byId.get(otherId);
    return {
      id: otherId,
      rel,
      via,
      title: other?.title ?? null,
      type: other?.type ?? null,
      status: other?.status ?? null,
    };
  };

  return {
    id: doc.id,
    title: doc.title,
    type: doc.type,
    status: doc.status,
    outgoing: graph.outgoing(id).map((edge) => describe(edge.to, edge.rel, edge.via)),
    backlinks: graph.backlinks(id).map((edge) => describe(edge.from, edge.rel, edge.via)),
  };
}
