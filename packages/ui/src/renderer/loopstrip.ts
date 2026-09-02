/**
 * The Loop strip derivation (WO-163, SRC-076 §The Loop): the six-stage
 * AI-native SDLC (Plan → Design → Build → Test → Deploy → Maintain) read off
 * Veri's own artifact types, with WF-001's four human gates placed as markers
 * between stages. Pure — no DOM, no IPC. Counts come from the snapshot's
 * documents and its own issues/advisories — nothing `veri check` decides is
 * recomputed here (PRD-003 §4) — and gate pending-ness is gateQueue's
 * verdict, never a second derivation.
 */
import type { Advisory, Issue, VeriDocument } from '@verikb/core';
import { isOutcomeRel, isWithdrawn } from '@verikb/core/pending';
import { gateQueue } from './gatequeue.ts';
import type { GateKey } from './gatequeue.ts';

export type StageKey = 'plan' | 'design' | 'build' | 'test' | 'deploy' | 'maintain';

export interface StageCard {
  key: StageKey;
  /** Mono letter-spaced label, worn in the stage's type color. */
  label: string;
  /** Canon token (`var(--…)`) — the stage's artifact-type color. */
  color: string;
  /** One-line description in the mockup's register. */
  desc: string;
  /** Mono live count line. A stage with nothing in flight still carries its
      zero-state line — never an empty card (SRC-076 fixture-independence). */
  count: string;
  /** SRC-076: the stage holding claimed work orders wears the ember tint. */
  ember: boolean;
}

export interface GateMarker {
  /** WF-001 gates at this crossing; empty = no human gate, fires on commit. */
  gates: readonly GateKey[];
  /** Amber iff a promotion waits at any of this marker's gates. */
  pending: boolean;
}

export interface LoopStrip {
  /** Six stages, loop order. */
  stages: StageCard[];
  /** Five markers, one per crossing between adjacent stages. */
  markers: GateMarker[];
}

/** The slice of a Snapshot the strip reads — fixtures satisfy it directly. */
export interface LoopState {
  documents: readonly VeriDocument[];
  issues: readonly Issue[];
  advisories: readonly Advisory[];
}

/**
 * WF-001's four gates on the strip's five crossings (SRC-076 §The Loop):
 * intent sits where evidence becomes intent (Plan → Design); decision and
 * dispatch share the crossing into bounded work (Design → Build); done sits
 * where the receipt awaits judgment (Test → Deploy). The two remaining
 * crossings carry no human gate — evals ride the diff and reality reports
 * back on their own, so those markers always read "fires on commit".
 */
export const MARKER_GATES: ReadonlyArray<readonly GateKey[]> = [
  ['intent'],
  ['decision', 'dispatch'],
  [],
  ['done'],
  [],
];

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

export function loopStrip(state: LoopState): LoopStrip {
  // Withdrawn documents are out of play everywhere (SRC-052); the queue
  // filters its own inputs via gateOf, so it takes the raw list.
  const docs = state.documents.filter((d) => !isWithdrawn(d));
  const queue = gateQueue(state.documents);

  // Plan counts the evidence door: sources without an outcome rel. The
  // mockup's "unfiled" intake never reaches the snapshot (the import sheet
  // is transient), so filed evidence is the honest count. Outcome sources
  // are Maintain's — reality reporting back, not evidence entering.
  const sources = docs.filter((d) => d.type === 'source');
  const verdicts = sources.filter((d) => d.links.some((l) => isOutcomeRel(l.rel))).length;
  const evidence = sources.length - verdicts;

  const draftReq = docs.filter((d) => d.type === 'requirement' && d.status === 'draft').length;
  const proposedDec = docs.filter((d) => d.type === 'decision' && d.status === 'proposed').length;

  // Build = bounded work under way: every in-progress WO is a claim (the
  // check flags unclaimed ones); ⌁ counts the distinct sessions holding them.
  const claimed = docs.filter((d) => d.type === 'work-order' && d.status === 'in-progress');
  const sessions = new Set(claimed.map((d) => d.claimedBy).filter((s): s is string => s !== undefined)).size;

  // Test reads the snapshot's own verdicts — issue count and drift-family
  // advisories — never re-running any rule (PRD-003 §4).
  const issues = state.issues.length;
  const drift = state.advisories.filter((a) => a.kind.startsWith('drift-')).length;

  const stages: StageCard[] = [
    {
      key: 'plan',
      label: 'PLAN',
      color: 'var(--t-src)',
      desc: 'Intent enters as evidence',
      count: plural(evidence, 'source'),
      ember: false,
    },
    {
      key: 'design',
      label: 'DESIGN',
      color: 'var(--t-req)',
      desc: 'Define & decide',
      count: `${draftReq} REQ · ${proposedDec} DEC`,
      ember: false,
    },
    {
      key: 'build',
      label: 'BUILD',
      color: 'var(--ember)',
      desc: 'Bounded work',
      count: `${claimed.length} claimed${sessions > 0 ? ` · ⌁ ${sessions}` : ''}`,
      ember: claimed.length > 0,
    },
    {
      key: 'test',
      label: 'TEST',
      color: 'var(--green)',
      desc: 'Evals ride the diff',
      // "clean" is HEALTH's own register for a zero-issue check (DEC-025).
      count: `${issues > 0 ? plural(issues, 'issue') : 'clean'} · ${drift} drift`,
      ember: false,
    },
    {
      key: 'deploy',
      label: 'DEPLOY',
      color: 'var(--t-dec)',
      desc: 'Review the receipt, ship',
      count: `${queue.counts.done} at done gate`,
      ember: false,
    },
    {
      key: 'maintain',
      label: 'MAINTAIN',
      color: 'var(--t-src)',
      desc: 'Reality reports back',
      count: `${plural(verdicts, 'verdict')} filed`,
      ember: false,
    },
  ];

  const markers: GateMarker[] = MARKER_GATES.map((gates) => ({
    gates,
    pending: gates.some((g) => queue.counts[g] > 0),
  }));

  return { stages, markers };
}
