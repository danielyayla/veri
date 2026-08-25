/**
 * Canonical strings core owns, in a dependency-free module exposed as the
 * '@verikb/core/prompts' subpath so the browser-bundled renderer shows the
 * one real text (DEC-046, DEC-092). Their old homes (schema.ts, brownfield.ts)
 * import node-flavored dependencies a browser bundle cannot carry.
 */

/**
 * The assembly contract in one human-readable line, for any surface that
 * summarizes a package (REQ-019: one description, so summaries cannot drift
 * from what assembly emits).
 */
export const PACKAGE_RULES =
  'Workflow always first · linked requirements and decisions in full · sources as excerpts · ' +
  'superseded decisions named only · oversized neighborhoods enumerated as a context map';

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
