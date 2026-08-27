import { checkObservedArchitecture } from './architecture.ts';
import type { ImportEdge } from './architecture.ts';
import { bindingClaimants, checkBindingDrift, checkBoundTests, staleAfterDays } from './binds.ts';
import type { TestFact } from './binds.ts';
import { checkDesignGateDiff, checkProject, checkStaleClaims, checkStaleFocus, designGatePaths, focusStaleAfterDays } from './check.ts';
import { checkDrift } from './drift.ts';
import { formatStatement } from './format.ts';
import type { FormatClassification } from './format.ts';
import type { LoadResult } from './load.ts';
import { checkProvenance } from './provenance.ts';
import type { GitFacts } from './provenance.ts';
import type { ModuleEntry } from './schema.ts';
import type { Advisory, Issue } from './types.ts';

/**
 * The one health-check derivation every surface shares (WO-076, WO-089,
 * REQ-025): the CLI's `veri check`, the GitHub Action, and the MCP server's
 * `run_check` all call buildCheckReport, so no surface can grow checking
 * logic of its own. Pure over loaded documents plus host-collected facts
 * (DEC-040): hosts own git, filesystem, and source-tree access; core owns
 * what the facts mean. A fact a host cannot collect arrives as
 * `unavailable` with a reason and surfaces as a skip note — never a
 * failure, never a silent omission (REQ-021).
 */

/** Git history as the host could (or could not) collect it. `veriPath` is
    the veri/ directory's repo-root-relative path, for mapping document
    files onto the paths git reports (WO-045). */
export type GitFactsInput =
  | { kind: 'ok'; facts: GitFacts; veriPath: string }
  | { kind: 'unavailable'; reason: string };

export interface HostFacts {
  git: GitFactsInput;
  /** Local calendar date, YYYY-MM-DD (DEC-076). */
  today: string;
  /** Existence facts for the ids `boundTests(documents)` names (WO-088).
      Ids with no fact are unresolved and produce no finding. */
  testFacts: TestFact[];
  /** Collected import edges and skipped modules, when the host scanned the
      registry's module paths (WO-067). Absent when there is no registry. */
  importFacts?: { edges: ImportEdge[]; skipped: ModuleEntry[] };
}

/** The typed stage of the derivation (DEC-091): the same orchestration as
    buildCheckReport with the Issue/Advisory unions intact, for surfaces
    that render findings rather than print lines (the app's snapshot
    pipeline). `skips` is shared verbatim with the presentation view. */
export interface CheckFindings {
  issues: Issue[];
  advisories: Advisory[];
  skips: string[];
}

export interface CheckReport {
  formatLine: string;
  documentCount: number;
  /** Gate violations — non-zero exit. `file` is veri/-relative; a
      duplicate-id issue names every claimant, comma-separated. */
  issues: Array<{ kind?: string; id?: string; file: string; message: string }>;
  /** The DEC-025 advisory tier: informs, never affects the exit code. */
  advisories: Array<{ kind: string; id?: string; file: string; message: string }>;
  /** Checks that could not run here (no git, shallow clone, module not on
      disk), pre-rendered exactly as the CLI prints them. */
  skips: string[];
}

/** One line naming the format version — and the migration, when one applies (REQ-015). */
function formatLine(format: FormatClassification): string {
  if (format.kind === 'current') return `format ${format.version} (current)`;
  return formatStatement(format) ?? `format ${String(format.kind)}`;
}

function fileOf(issue: Issue): string {
  return issue.kind === 'duplicate-id' ? issue.files.join(', ') : issue.file;
}

function idOf(value: object): string | undefined {
  const id = (value as { id?: unknown }).id;
  return typeof id === 'string' ? id : undefined;
}

/** Skip notes for registry modules the collector could not find on disk (WO-067). */
export function importSkipNotes(skipped: ModuleEntry[]): string[] {
  return skipped.map((entry) => `(architecture: skipped module ${entry.name} — ${entry.path} is not on disk)`);
}

export function deriveFindings(load: LoadResult, host: HostFacts): CheckFindings {
  const { issues, advisories } = checkProject(load);
  // Receipt verification (WO-044) and git drift (WO-045, WO-088): pure
  // checks over host facts. No facts means a note, never a failure.
  if (host.git.kind === 'ok') {
    advisories.push(...checkProvenance(load.documents, host.git.facts));
    advisories.push(...checkDrift(load.documents, host.git.facts, host.git.veriPath));
    // The design gate's diff tier (WO-113, DEC-114): claimed commits that
    // touched a gated path the work order never declared.
    advisories.push(...checkDesignGateDiff(load.documents, host.git.facts));
    advisories.push(
      ...checkBindingDrift(load.documents, host.git.facts, {
        veriPath: host.git.veriPath,
        today: host.today,
        staleAfterDays: staleAfterDays(load.documents),
      }),
    );
  }
  // Bound tests (WO-088) need the filesystem, not git — they run either way.
  advisories.push(...checkBoundTests(load.documents, host.testFacts));
  // Stale claims (WO-099) need only the host's clock — they too run either
  // way, sharing the binding detectors' staleness window.
  advisories.push(...checkStaleClaims(load.documents, host.today, staleAfterDays(load.documents)));
  // Current-focus staleness (REQ-037) likewise needs only the clock.
  advisories.push(...checkStaleFocus(load.documents, host.today, focusStaleAfterDays(load.documents)));
  // Observed architecture (WO-067): import edges vs the intended
  // architecture, split by declared constraint severity (DEC-062) — error
  // violations join the issues (counted, exit 1); advisory violations stay
  // in the grey tier.
  if (host.importFacts !== undefined) {
    const observed = checkObservedArchitecture(load.documents, host.importFacts.edges);
    issues.push(...observed.issues);
    advisories.push(...observed.violations);
  }
  return {
    issues,
    advisories,
    skips: [
      ...(host.git.kind === 'ok' ? [] : [`(provenance: skipped — ${host.git.reason})`]),
      ...(host.git.kind !== 'ok' && bindingClaimants(load.documents).length > 0
        ? [`(binding drift: skipped — ${host.git.reason})`]
        : []),
      // The diff tier degrades loudly, never silently (REQ-021): a project
      // with gated paths and no git facts is told the gate's diff evidence
      // could not be read.
      ...(host.git.kind !== 'ok' && designGatePaths(load.documents).length > 0
        ? [`(design gate diff: skipped — ${host.git.reason})`]
        : []),
      ...importSkipNotes(host.importFacts?.skipped ?? []),
    ],
  };
}

/** The presentation view over deriveFindings (DEC-091): flattens the typed
    unions into the print records the CLI, the Action, and the MCP run_check
    tool share. Shape and output unchanged since WO-089. */
export function buildCheckReport(load: LoadResult, host: HostFacts): CheckReport {
  const { issues, advisories, skips } = deriveFindings(load, host);
  return {
    formatLine: formatLine(load.format),
    documentCount: load.documents.length,
    issues: issues.map((issue) => ({ kind: issue.kind, id: idOf(issue), file: fileOf(issue), message: issue.message })),
    advisories: advisories.map((advisory) => ({
      kind: advisory.kind,
      id: idOf(advisory),
      file: advisory.file,
      message: advisory.message,
    })),
    skips,
  };
}
