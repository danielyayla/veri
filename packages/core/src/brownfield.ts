// Brownfield import (REQ-024, DEC-067, DEC-068): the canonical kickoff
// prompt, the brownfield predicate shared by CLI and app, and the
// instruction package the MCP server serves to the importing agent.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getTemplate } from './templates.ts';
import type { VeriDocument } from './types.ts';

/**
 * The one kickoff prompt (DEC-067): what the app's "Copy import kickoff"
 * button copies and what `veri import` prints. It points the agent at the
 * MCP-served instruction package rather than carrying the instructions,
 * so the paste never goes stale.
 */
export function importKickoffPrompt(): string {
  return [
    'You are importing existing project knowledge into Veri.',
    'Call the veri MCP tool get_import_instructions and follow it exactly:',
    'read this repo — code layout, git history, ADRs, READMEs, agent docs —',
    'and file what you find as an import manifest, evidence sources, draft',
    'requirements, and proposed decisions. Nothing you file is binding',
    'until the user approves it.',
  ].join('\n');
}

/**
 * A project root is brownfield when it holds anything beyond what a fresh
 * `veri init` produces: veri/ plus the AGENTS.md/CLAUDE.md pointer files
 * (DEC-018), ignoring dotfiles and node_modules. Import is an offer on
 * such roots, never a gate (SRC-039).
 */
const SCAFFOLD_ROOT_ENTRIES = new Set(['veri', 'AGENTS.md', 'CLAUDE.md', 'node_modules']);

export function isBrownfieldRoot(projectRoot: string): boolean {
  let entries: string[];
  try {
    entries = readdirSync(projectRoot);
  } catch {
    return false;
  }
  return entries.some((name) => !SCAFFOLD_ROOT_ENTRIES.has(name) && !name.startsWith('.'));
}

/**
 * A knowledge base is unpopulated while it has no documents beyond the
 * scaffolded workflow — the point where the import offer leads (SRC-039);
 * one hand-authored document demotes it.
 */
export function isUnpopulated(documents: VeriDocument[]): boolean {
  return documents.every((doc) => doc.type === 'workflow');
}

/**
 * The instruction package served by get_import_instructions (DEC-067):
 * what to mine, the filing rules and link relations of DEC-068, a census
 * of documents already on disk so re-runs only add, and the project's
 * requirement and decision templates. Assembled fresh per call.
 */
export function assembleImportInstructions(veriDir: string, documents: VeriDocument[]): string {
  const census = documents
    .filter((doc) => doc.type !== 'workflow')
    .map((doc) => `- ${doc.id}  ${doc.type}  ${doc.status}  ${doc.title}`);

  const requirementTemplate = getTemplate(veriDir, 'requirement').body.trim();
  const decisionTemplate = getTemplate(veriDir, 'decision').body.trim();

  return [
    '# Veri brownfield import — instructions for the importing agent',
    '',
    "You are seeding this project's Veri knowledge base from the repository",
    'itself. Veri never reads the code; you do. Everything you file is a',
    'proposal — the user reviews and approves each document before it binds.',
    '',
    '## What to mine',
    '',
    '- Code layout: top-level structure, packages and modules, entry points',
    '- Git history: recurring themes, migrations, incidents, reversals',
    '- ADRs and design docs (docs/adr/, docs/design/, decision records)',
    '- READMEs at every level',
    '- Agent docs: CLAUDE.md, AGENTS.md, CONTRIBUTING.md',
    '',
    '## Filing rules — order matters',
    '',
    '1. File ONE import manifest first, with file_source: title it',
    '   "Import manifest — <short description>", body = what you read and',
    '   how. Note the id it returns; call it MANIFEST below.',
    '2. File evidence sources with file_source — one per coherent body of',
    '   evidence (a directory, an ADR set, a slice of git history). The body',
    '   names concrete file paths, commit refs, and short excerpts. Link',
    '   each one: {id: MANIFEST, rel: imported-via}.',
    '3. File requirements with file_requirement (they are born draft) and',
    '   decisions with file_decision (born proposed). Every mined document',
    '   must link at least one evidence source {id: SRC-xxx,',
    '   rel: derived-from} and the manifest {id: MANIFEST,',
    '   rel: imported-via}.',
    '4. Do not refile knowledge the documents listed below already cover.',
    '5. When you are done, file_receipt on MANIFEST (work_order_id:',
    '   MANIFEST, commit, files read, one-line summary) — that receipt is',
    '   the completion signal.',
    '',
    '## Standards for mined documents',
    '',
    '- A requirement states what must hold, not how it is implemented.',
    '- A decision records a choice actually visible in the repo, with the',
    '  alternatives the history shows were rejected or abandoned.',
    '- Say what the evidence supports; flag guesses as open questions in',
    '  the body rather than stating them as facts.',
    '- Prefer fewer well-evidenced documents over exhaustive weak ones.',
    '',
    '## Already in this knowledge base — do not duplicate',
    '',
    ...(census.length === 0 ? ['(empty — this is a fresh knowledge base)'] : census),
    '',
    '## Requirement template for this project',
    '',
    requirementTemplate,
    '',
    '## Decision template for this project',
    '',
    decisionTemplate,
    '',
  ].join('\n');
}
