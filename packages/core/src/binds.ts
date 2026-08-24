import type { Advisory, VeriDocument } from './types.ts';
import type { GitFacts } from './provenance.ts';
import { subjectWorkOrders } from './provenance.ts';

/**
 * Binding drift (WO-088, REQ-021): a work order may claim the code it
 * changes — `binds.paths` globs and `binds.tests` identifiers — and these
 * detectors surface the disagreements: code changing that no in-progress
 * work order claims, claimed paths gone quiet, bound tests that no longer
 * exist. Deterministic over documents plus host-collected facts (DEC-040),
 * advisory-tier only (DEC-025), derived on demand with no stored state.
 *
 * The diff range is the "active era", derived rather than book-kept: for
 * each in-progress work order with bindings, commits newer than its start
 * commit (subject naming the id plus a form of "start", the DEC-041
 * lifecycle-by-subject pattern) — falling back to commits dated on or
 * after the work order's `created` when no start commit exists.
 */

const short = (sha: string): string => sha.slice(0, 7);

/** Days of bound-path silence before an in-progress work order is stale.
    Projects override via `stale_after_days` on the workflow document. */
export const DEFAULT_STALE_AFTER_DAYS = 14;

/** The project's staleness window: workflow frontmatter, or the default —
    the DEC-059/DEC-071 pattern of policy riding the workflow document. */
export function staleAfterDays(documents: VeriDocument[]): number {
  for (const doc of documents) {
    if (doc.type !== 'workflow' || doc.status === 'retired') continue;
    const value = doc.frontmatter['stale_after_days'];
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  }
  return DEFAULT_STALE_AFTER_DAYS;
}

/**
 * Compile one binding glob: `**` crosses path segments, `*` and `?` stay
 * within one. Hand-rolled over a dependency — core is deliberately
 * `yaml` + `zod` only, and binding patterns need exactly these three forms.
 */
export function globToRegExp(pattern: string): RegExp {
  let out = '';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i]!;
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          out += '(?:[^/]+/)*';
          i += 3;
        } else {
          out += '.*';
          i += 2;
        }
      } else {
        out += '[^/]*';
        i += 1;
      }
    } else if (ch === '?') {
      out += '[^/]';
      i += 1;
    } else {
      out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      i += 1;
    }
  }
  return new RegExp(`^${out}$`);
}

/** Whether a repo-root-relative path falls under any of the binding
    patterns. A glob-free pattern also claims everything beneath it as a
    directory, so `packages/core` reads the way a human writes it. */
export function pathMatchesBinds(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const clean = pattern.replace(/\/+$/, '');
    if (clean === '') return false;
    if (globToRegExp(clean).test(path)) return true;
    return !/[*?]/.test(clean) && path.startsWith(`${clean}/`);
  });
}

/** The in-progress work orders that claim code paths — the documents the
    unclaimed-change and staleness detectors run against. With none, both
    detectors are inert: nothing claims code, so nothing can disagree. */
export function bindingClaimants(documents: VeriDocument[]): VeriDocument[] {
  return documents.filter(
    (doc) => doc.type === 'work-order' && doc.status === 'in-progress' && (doc.binds?.paths.length ?? 0) > 0,
  );
}

/** Every test identifier bound by an in-progress work order — the list the
    host resolves into TestFacts (existence stays host territory, DEC-040). */
export function boundTests(documents: VeriDocument[]): string[] {
  const out = new Set<string>();
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status !== 'in-progress') continue;
    for (const test of doc.binds?.tests ?? []) out.add(test);
  }
  return [...out];
}

/** One host-resolved answer: does this bound test identifier still exist? */
export interface TestFact {
  id: string;
  exists: boolean;
}

/**
 * Detector: a bound test that no longer resolves — the named proof for
 * in-progress work is gone. Pure over documents plus host-collected facts;
 * an identifier the host did not resolve is skipped, never guessed.
 */
export function checkBoundTests(documents: VeriDocument[], testFacts: TestFact[]): Advisory[] {
  const resolved = new Map(testFacts.map((fact) => [fact.id, fact.exists]));
  const advisories: Advisory[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status !== 'in-progress') continue;
    for (const test of doc.binds?.tests ?? []) {
      if (resolved.get(test) === false) {
        advisories.push({
          kind: 'drift-missing-test',
          file: doc.file,
          id: doc.id,
          test,
          message: `${doc.id} binds test "${test}", which no longer resolves — the bound proof is gone`,
        });
      }
    }
  }
  return advisories;
}

/** A start commit for a work order: the status flip's own write, recognized
    by subject the way approve/supersede flows are (DEC-041). */
function isStartCommit(docId: string, subject: string): boolean {
  return subject.includes(docId) && /\bstart(?:ed|s)?\b/i.test(subject);
}

interface EraAnchor {
  /** Newest-first index of the start commit, when the convention finds one. */
  index: number | undefined;
  /** The start commit's date, or the work order's `created` fallback. */
  date: string;
}

function startAnchor(facts: GitFacts, workOrder: VeriDocument): EraAnchor {
  const index = facts.commits.findIndex((commit) => isStartCommit(workOrder.id, commit.subject));
  if (index >= 0) return { index, date: facts.commits[index]!.date };
  return { index: undefined, date: workOrder.created };
}

function inEra(commitIndex: number, commitDate: string, anchor: EraAnchor): boolean {
  return anchor.index !== undefined ? commitIndex < anchor.index : commitDate >= anchor.date;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export interface BindingDriftOptions {
  /** Repo-root-relative path of the veri/ directory ('' when veri/ is the
      repo root — a knowledge-base-only repository has no code to claim). */
  veriPath: string;
  /** Today's LOCAL calendar date (dates.ts) — passed in, never read here. */
  today: string;
  staleAfterDays?: number;
}

/**
 * Git-backed binding detectors: unclaimed code changes and stale work
 * orders. A commit whose subject names any work order is claimed by the
 * existing WO-nnn: convention and never flagged — bindings catch what the
 * subject convention misses, they do not double-charge it.
 */
export function checkBindingDrift(
  documents: VeriDocument[],
  facts: GitFacts,
  options: BindingDriftOptions,
): Advisory[] {
  if (options.veriPath === '') return [];
  const claimants = bindingClaimants(documents);
  if (claimants.length === 0) return [];
  const windowDays = options.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS;
  const veriPrefix = `${options.veriPath}/`;
  const anchors = new Map(claimants.map((wo) => [wo.id, startAnchor(facts, wo)]));
  const advisories: Advisory[] = [];

  // Detector: unclaimed code change — an active-era commit touching code
  // that no subject claims and no in-progress binding matches.
  facts.commits.forEach((commit, index) => {
    if (subjectWorkOrders(commit.subject).length > 0) return;
    if (!claimants.some((wo) => inEra(index, commit.date, anchors.get(wo.id)!))) return;
    const code = commit.files.filter((file) => !file.startsWith(veriPrefix));
    const unclaimed = code.filter((file) => !claimants.some((wo) => pathMatchesBinds(file, wo.binds!.paths)));
    if (unclaimed.length === 0) return;
    const shown = unclaimed.slice(0, 3).join(', ');
    const more = unclaimed.length > 3 ? ` and ${unclaimed.length - 3} more` : '';
    advisories.push({
      kind: 'drift-unclaimed-change',
      file: unclaimed[0]!,
      id: short(commit.sha),
      sha: commit.sha,
      message: `commit ${short(commit.sha)} "${commit.subject}" touched ${shown}${more} — no in-progress work order claims it by binding or subject`,
    });
  });

  // Detector: stale work order — in-progress past the window with no
  // commits on its bound paths inside it. Too-young work never flags.
  for (const wo of claimants) {
    const anchor = anchors.get(wo.id)!;
    if (daysBetween(anchor.date, options.today) < windowDays) continue;
    const newest = facts.commits.find((commit) => commit.files.some((file) => pathMatchesBinds(file, wo.binds!.paths)));
    if (newest !== undefined && daysBetween(newest.date, options.today) < windowDays) continue;
    const since =
      newest === undefined
        ? `no commits have touched its bound paths since it started (${anchor.date})`
        : `no commits have touched its bound paths since ${newest.date}`;
    advisories.push({
      kind: 'drift-stale-wo',
      file: wo.file,
      id: wo.id,
      message: `${wo.id} is in-progress but ${since} — stale after ${windowDays} days`,
    });
  }

  return advisories;
}
