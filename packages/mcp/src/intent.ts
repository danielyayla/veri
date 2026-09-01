import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadProject, lookupIntent, renderIntent } from '@verikb/core';

/**
 * Code-to-intent lookup over MCP (WO-095, DEC-099): the same core
 * derivation the CLI prints, pure over the loaded corpus — bindings and
 * the module registry are document-recorded, so no git tier is needed and
 * DEC-081's no-subprocess posture holds.
 */
export async function intentForPath(projectRoot: string, path: string): Promise<string> {
  const veriDir = join(projectRoot, 'veri');
  if (!existsSync(veriDir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  const { documents } = await loadProject(veriDir);
  return renderIntent(lookupIntent(documents, path));
}
