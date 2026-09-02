/**
 * The Change Trace derivation (WO-164, SRC-076 §Change Trace): one turn of
 * the loop read off the record, walked from a single work order — evidence →
 * requirement → decision → work order (receipt commits) → outcome verdict.
 * Pure — no DOM, no IPC; everything is computed from parsed documents, and
 * the chain TOLERATES MISSING HOPS: what the record holds renders, what it
 * lacks is named honestly, and nothing is fabricated (PRD-003 §6).
 */
import type { VeriDocument } from '@verikb/core';
import { compareIds } from '@verikb/core/ids';
import { OUTCOME_OF_REL, isOutcomeRel, isWithdrawn, outcomeLabel, requirementKind } from '@verikb/core/pending';
import { receipts } from './derive.ts';
import type { Receipt } from './derive.ts';

export type TraceRole = 'evidence' | 'requirement' | 'decision' | 'work-order' | 'outcome';

/** The spine's causal order — the loop's own walk (SRC-076). */
const ROLE_ORDER: readonly TraceRole[] = ['evidence', 'requirement', 'decision', 'work-order', 'outcome'];

export interface TraceConnector {
  /** ◈ = a human gate fired the hop (a stamp); ◇ = commit-fired automation. */
  glyph: '◈' | '◇';
  tone: 'amber' | 'green';
  label: string;
}

export interface CommitChip {
  sha: string;
  /** True on every chip here: only receipts record commits — git archaeology
      is out of scope, so a hash renders iff a receipt carries it. */
  receipt: boolean;
}

export interface TraceNode {
  role: TraceRole;
  doc: VeriDocument;
  /** What fired the hop INTO this node, read off its own stamps; null for the
      chain's first node and for evidence siblings (no gate between them). */
  connector: TraceConnector | null;
  /** The card's mono meta line — stamp dates, claim, receipt facts. */
  meta: string;
  /** The card's right-hand state: the verdict rel for outcome nodes
      (supports / refutes / tests), the document status otherwise. */
  statusLabel: string;
  /** Receipt-recorded commit hashes; WO node only, empty elsewhere. */
  commits: CommitChip[];
}

export type TraceRow =
  | { kind: 'node'; node: TraceNode }
  | /** An honest gap on the spine — a hop the record does not hold. */
    { kind: 'absence'; role: TraceRole; text: string };

export interface StampRow {
  id: string;
  /** `REQ-002 accepted`, `WO-002 dispatched`, `WO-002 receipt`. */
  label: string;
  color: string;
  date: string;
  /** approved_by when the record states it, the receipt commit for receipt
      rows, null when the record is silent. */
  by: string | null;
}

export interface ElapsedLeg {
  label: string;
  days: number;
}

export interface Trace {
  wo: VeriDocument;
  rows: TraceRow[];
  stamps: StampRow[];
  /** Legs whose endpoint dates the frontmatter records; missing legs are
      skipped, never estimated. */
  elapsed: ElapsedLeg[];
}

/** Days between two YYYY-MM-DD dates (b − a); null when either is invalid. */
export function daysBetween(a: string, b: string): number | null {
  const pa = Date.parse(`${a}T00:00:00Z`);
  const pb = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(pa) || Number.isNaN(pb)) return null;
  return Math.round((pb - pa) / 86_400_000);
}

/** `same day` / `4 d` / `2 w` / `3 mo` — the mockup's elapsed register. */
export function fmtElapsed(days: number): string {
  if (days <= 0) return 'same day';
  if (days < 10) return `${days} d`;
  if (days < 60) return `${Math.round(days / 7)} w`;
  return `${Math.round(days / 30)} mo`;
}

const byCreated = (a: VeriDocument, b: VeriDocument): number =>
  a.created === b.created ? compareIds(a.id, b.id) : a.created.localeCompare(b.created);

/** Docs linked to `doc` in either direction, deduped, filtered by `keep`. */
function neighbors(docs: readonly VeriDocument[], byId: Map<string, VeriDocument>, doc: VeriDocument, keep: (d: VeriDocument, rel: string) => boolean): VeriDocument[] {
  const seen = new Set<string>();
  const out: VeriDocument[] = [];
  const add = (d: VeriDocument | undefined, rel: string): void => {
    if (d === undefined || seen.has(d.id) || isWithdrawn(d) || !keep(d, rel)) return;
    seen.add(d.id);
    out.push(d);
  };
  for (const l of doc.links) add(byId.get(l.id), l.rel);
  for (const other of docs) {
    for (const l of other.links) if (l.id === doc.id) add(other, l.rel);
  }
  return out;
}

const stampSuffix = (doc: VeriDocument): string =>
  doc.approvedBy !== undefined ? `approved ${doc.approved} by ${doc.approvedBy}` : `approved ${doc.approved}`;

function connectorFor(role: TraceRole, doc: VeriDocument, first: boolean): TraceConnector | null {
  if (first) return null;
  if (role === 'evidence') return null; // siblings on the spine — no gate between sources
  if (role === 'requirement') {
    return {
      glyph: '◈',
      tone: 'amber',
      label: doc.approved !== undefined ? `intent gate — ${stampSuffix(doc)}` : 'intent gate — awaiting the stamp',
    };
  }
  if (role === 'decision') {
    return {
      glyph: '◈',
      tone: 'amber',
      label: doc.approved !== undefined ? `decision gate — ${stampSuffix(doc)}` : 'decision gate — proposed, awaiting the stamp',
    };
  }
  if (role === 'work-order') {
    if (doc.approved === undefined) return { glyph: '◈', tone: 'amber', label: 'dispatch gate — awaiting dispatch' };
    const claim = doc.claimedBy !== undefined ? ` · claimed by ${doc.claimedBy}` : '';
    return { glyph: '◈', tone: 'amber', label: `dispatch gate — dispatched ${doc.approved}${claim}` };
  }
  // outcome: reality reported back through the evidence door — no stamp fired it.
  return { glyph: '◇', tone: 'green', label: `reality reported back — filed ${doc.created}` };
}

function metaFor(role: TraceRole, doc: VeriDocument, wo: VeriDocument, woReceipts: Receipt[], reqIds: ReadonlySet<string>): string {
  const parts: string[] = [];
  if (role === 'evidence') {
    parts.push(`filed ${doc.created}`);
    if (typeof doc.kind === 'string' && doc.kind !== 'reference') parts.push(doc.kind);
  } else if (role === 'requirement') {
    if (requirementKind(doc) === 'hypothesis') {
      const bet = outcomeLabel(doc);
      if (bet !== null) parts.push(`bet: ${bet}`);
    }
    parts.push(doc.approved !== undefined ? stampSuffix(doc) : 'not yet approved');
  } else if (role === 'decision') {
    parts.push(doc.approved !== undefined ? stampSuffix(doc) : 'proposed — awaiting the stamp');
  } else if (role === 'work-order') {
    if (doc.claimedBy !== undefined) parts.push(`⌁ ${doc.claimedBy}`);
    if (doc.approved !== undefined) parts.push(`dispatched ${doc.approved}`);
    else if (doc.claimedAt !== undefined) parts.push(`claimed ${doc.claimedAt}`);
    parts.push(woReceipts.length > 0 ? `${woReceipts.length} receipt${woReceipts.length === 1 ? '' : 's'} filed` : 'no receipt yet');
  } else {
    const verdict = doc.links.find((l) => isOutcomeRel(l.rel) && reqIds.has(l.id));
    if (verdict !== undefined) parts.push(`${verdict.rel} ${verdict.id}`);
    if (doc.links.some((l) => l.rel === OUTCOME_OF_REL && l.id === wo.id)) parts.push(`outcome-of ${wo.id}`);
    parts.push(`filed ${doc.created}`);
  }
  return parts.join(' · ');
}

/**
 * The whole trace for one work order, or null when `woId` is not a work
 * order in `docs`. The chain walks the WO's links in both directions —
 * requirements and decisions one hop out, evidence through those
 * requirements and the WO itself, outcome sources by the DEC-113 vocabulary
 * (tests/supports/refutes at a chain requirement, outcome-of at the WO).
 */
export function traceChain(docs: readonly VeriDocument[], woId: string): Trace | null {
  const wo = docs.find((d) => d.id === woId);
  if (wo === undefined || wo.type !== 'work-order') return null;
  const byId = new Map(docs.map((d) => [d.id, d]));

  const requirementsOf = neighbors(docs, byId, wo, (d) => d.type === 'requirement').sort((a, b) => compareIds(a.id, b.id));
  const decisions = neighbors(docs, byId, wo, (d) => d.type === 'decision').sort((a, b) => compareIds(a.id, b.id));
  const reqIds = new Set(requirementsOf.map((r) => r.id));

  // Outcome sources first, so the evidence walk can exclude them: reality's
  // answer is Maintain's node, not Plan's (the loopstrip split).
  const isOutcomeSrc = (d: VeriDocument): boolean =>
    d.type === 'source' &&
    d.links.some((l) => (l.rel === OUTCOME_OF_REL && l.id === wo.id) || (isOutcomeRel(l.rel) && reqIds.has(l.id)));
  const outcomes = docs.filter((d) => !isWithdrawn(d) && isOutcomeSrc(d)).sort(byCreated);
  const outcomeIds = new Set(outcomes.map((d) => d.id));

  // Evidence stays scoped to this turn: through a requirement only its
  // provenance links (`derived-from` — the evidence it came from), never the
  // requirement's whole accreted neighborhood (a REQ-004 carries thirty
  // design sources; anything that lists everything must filter or die,
  // SRC-016 via SRC-024). The WO's own direct source links (designed-by,
  // constrained-by) are deliberate and few — all of them count.
  const evidenceSeen = new Set<string>();
  const evidence: VeriDocument[] = [];
  const collect = (anchor: VeriDocument, keepRel: (rel: string) => boolean): void => {
    for (const src of neighbors(docs, byId, anchor, (d, rel) => d.type === 'source' && !isOutcomeRel(rel) && rel !== OUTCOME_OF_REL && keepRel(rel))) {
      if (outcomeIds.has(src.id) || evidenceSeen.has(src.id)) continue;
      evidenceSeen.add(src.id);
      evidence.push(src);
    }
  };
  for (const req of requirementsOf) collect(req, (rel) => rel === 'derived-from');
  collect(wo, () => true);
  evidence.sort(byCreated);

  const woReceipts = receipts(wo);
  const groups: Record<TraceRole, VeriDocument[]> = {
    evidence,
    requirement: requirementsOf,
    decision: decisions,
    'work-order': [wo],
    outcome: outcomes,
  };

  const rows: TraceRow[] = [];
  let first = true;
  for (const role of ROLE_ORDER) {
    if (groups[role].length === 0) {
      // Say what's absent honestly — but an unlinked WO renders degenerate
      // (just its own node), not as a ladder of gaps it never claimed.
      if (role === 'evidence' && requirementsOf.length > 0) {
        rows.push({ kind: 'absence', role, text: 'no evidence source on record — the requirement stands on intuition' });
      } else if (role === 'decision' && (requirementsOf.length > 0 || evidence.length > 0)) {
        rows.push({ kind: 'absence', role, text: 'no decision on this turn — no fork was recorded' });
      } else if (role === 'outcome' && wo.status === 'done') {
        rows.push({ kind: 'absence', role, text: "no outcome source yet — reality hasn't reported" });
      }
      continue;
    }
    for (const doc of groups[role]) {
      rows.push({
        kind: 'node',
        node: {
          role,
          doc,
          connector: connectorFor(role, doc, first),
          meta: metaFor(role, doc, wo, woReceipts, reqIds),
          statusLabel:
            role === 'outcome' ? (doc.links.find((l) => isOutcomeRel(l.rel) && reqIds.has(l.id))?.rel ?? doc.status) : doc.status,
          commits: role === 'work-order' ? woReceipts.map((r) => ({ sha: r.commit, receipt: true })) : [],
        },
      });
      first = false;
    }
  }

  return { wo, rows, stamps: stampLedger(groups, woReceipts), elapsed: elapsedLegs(groups, woReceipts) };
}

const STAMP_COLORS: Record<string, string> = {
  requirement: 'var(--t-req)',
  decision: 'var(--t-dec)',
  'work-order': 'var(--t-wo)',
};

/** The ledger: every stamp the record states — approved: dates with
    approved_by when present, plus receipt commits — date order. */
function stampLedger(groups: Record<TraceRole, VeriDocument[]>, woReceipts: Receipt[]): StampRow[] {
  const rows: StampRow[] = [];
  for (const req of groups.requirement) {
    if (req.approved !== undefined) {
      rows.push({ id: req.id, label: `${req.id} ${req.status}`, color: STAMP_COLORS.requirement, date: req.approved, by: req.approvedBy ?? null });
    }
  }
  for (const dec of groups.decision) {
    if (dec.approved !== undefined) {
      rows.push({ id: dec.id, label: `${dec.id} ${dec.status}`, color: STAMP_COLORS.decision, date: dec.approved, by: dec.approvedBy ?? null });
    }
  }
  const wo = groups['work-order'][0];
  if (wo !== undefined && wo.approved !== undefined) {
    rows.push({ id: wo.id, label: `${wo.id} dispatched`, color: STAMP_COLORS['work-order'], date: wo.approved, by: wo.approvedBy ?? null });
  }
  for (const r of woReceipts) {
    rows.push({ id: wo?.id ?? '', label: `${wo?.id ?? ''} receipt`, color: STAMP_COLORS['work-order'], date: r.date, by: r.commit });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * SRC-076's leading/lagging indicators, from frontmatter dates only:
 * evidence created → REQ approved → last receipt date → outcome created.
 * A leg with a missing endpoint is skipped, never estimated.
 */
function elapsedLegs(groups: Record<TraceRole, VeriDocument[]>, woReceipts: Receipt[]): ElapsedLeg[] {
  const min = (dates: string[]): string | null => (dates.length > 0 ? dates.slice().sort()[0] : null);
  const max = (dates: string[]): string | null => (dates.length > 0 ? dates.slice().sort()[dates.length - 1] : null);
  const evidenceAt = min(groups.evidence.map((d) => d.created));
  const acceptedAt = min(groups.requirement.map((d) => d.approved).filter((d): d is string => d !== undefined));
  const shippedAt = max(woReceipts.map((r) => r.date));
  const verdictAt = min(groups.outcome.map((d) => d.created));

  const legs: ElapsedLeg[] = [];
  const push = (label: string, a: string | null, b: string | null): void => {
    if (a === null || b === null) return;
    const days = daysBetween(a, b);
    if (days !== null) legs.push({ label, days });
  };
  push('evidence → accepted', evidenceAt, acceptedAt);
  push('accepted → shipped', acceptedAt, shippedAt);
  push('shipped → verdict', shippedAt, verdictAt);
  return legs;
}
