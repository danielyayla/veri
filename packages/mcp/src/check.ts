import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { boundTests, buildCheckReport, loadProject, localToday, moduleRegistry } from '@verikb/core';
import type { CheckReport } from '@verikb/core';
import { collectImportFacts, collectTestFacts } from './facts.ts';

/**
 * run_check (WO-089): the same health-check derivation `veri check` runs —
 * core's buildCheckReport — over the facts this host can collect without a
 * subprocess. Pure document checks, bound tests, and observed architecture
 * always run; the git-backed tier (provenance, drift, binding drift) is out
 * of reach under the server's WF-001 posture and reports as skipped with
 * this reason (DEC-081), never silently omitted (REQ-021). The shell tier
 * (WO-136) joins it, for a different reason of the same kind.
 */
export const GIT_SKIP_REASON =
  'the MCP server spawns no subprocesses (WF-001, DEC-081) — run `veri check` in a terminal for the git-backed tier';

/**
 * The harness tier (WO-136, DEC-130): `.claude/skills/` is outside `veri/`
 * and belongs to the host that writes the shells. This server writes none,
 * so it does not read them either — it reports the tier as skipped rather
 * than reimplementing the collector or, worse, returning a pass it did not
 * earn.
 */
export const SHELL_SKIP_REASON =
  'the harness directory is outside veri/ and belongs to the host that emits shells (DEC-130) — run `veri check` in a terminal for the shell tier';

/** The shared report, unrenamed (WO-093): core's CheckReport is the one
    shape every surface consumes; the tool's agent-facing key names
    (pass/violations/skipped) are serialization at the server edge.
    Returns null when projectRoot has no veri/ directory. */
export async function runCheck(projectRoot: string): Promise<CheckReport | null> {
  const dir = join(projectRoot, 'veri');
  if (!existsSync(dir)) return null;
  const load = await loadProject(dir);
  const modules = moduleRegistry(load.documents);
  return buildCheckReport(load, {
    git: { kind: 'unavailable', reason: GIT_SKIP_REASON },
    today: localToday(),
    testFacts: collectTestFacts(projectRoot, boundTests(load.documents)),
    importFacts: modules.length > 0 ? collectImportFacts(projectRoot, modules) : undefined,
    shells: { kind: 'unavailable', reason: SHELL_SKIP_REASON },
  });
}
