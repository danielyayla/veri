import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { boundTests, buildCheckReport, loadProject, localToday, moduleRegistry } from '@verikb/core';
import { collectImportFacts, collectTestFacts } from './facts.ts';

/**
 * run_check (WO-089): the same health-check derivation `veri check` runs —
 * core's buildCheckReport — over the facts this host can collect without a
 * subprocess. Pure document checks, bound tests, and observed architecture
 * always run; the git-backed tier (provenance, drift, binding drift) is out
 * of reach under the server's WF-001 posture and reports as skipped with
 * this reason (DEC-081), never silently omitted (REQ-021).
 */
export const GIT_SKIP_REASON =
  'the MCP server spawns no subprocesses (WF-001, DEC-081) — run `veri check` in a terminal for the git-backed tier';

export interface RunCheckResult {
  /** Mirrors the CLI's exit semantics: true exactly when `veri check` exits 0. */
  pass: boolean;
  format: string;
  documents: number;
  /** The gate (DEC-025): any violation fails `veri check`. */
  violations: Array<{ kind?: string; id?: string; file: string; message: string }>;
  /** The advisory tier (DEC-025): informs, never blocks. */
  advisories: Array<{ kind: string; id?: string; file: string; message: string }>;
  /** Checks this server could not run, each with its reason. */
  skipped: string[];
}

/** Returns null when projectRoot has no veri/ directory. */
export async function runCheck(projectRoot: string): Promise<RunCheckResult | null> {
  const dir = join(projectRoot, 'veri');
  if (!existsSync(dir)) return null;
  const load = await loadProject(dir);
  const modules = moduleRegistry(load.documents);
  const report = buildCheckReport(load, {
    git: { kind: 'unavailable', reason: GIT_SKIP_REASON },
    today: localToday(),
    testFacts: collectTestFacts(projectRoot, boundTests(load.documents)),
    importFacts: modules.length > 0 ? collectImportFacts(projectRoot, modules) : undefined,
  });
  return {
    pass: report.issues.length === 0,
    format: report.formatLine,
    documents: report.documentCount,
    violations: report.issues,
    advisories: report.advisories,
    skipped: report.skips,
  };
}
