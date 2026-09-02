/**
 * Gate Queue derivation (WO-162, SRC-076 §Gate Queue): every promotion
 * waiting on the user, grouped into WF-001's gates in the order the loop
 * turns — intent, decision, dispatch, done. Pure — no DOM, no IPC; the
 * view renders what this computes and core performs any write.
 */
import type { VeriDocument } from '@verikb/core';
import { compareIds } from '@verikb/core/ids';
import { receipts } from './derive.ts';
import { plainText, sections } from './markdown.ts';
import type { Block } from './markdown.ts';

export type GateKey = 'intent' | 'decision' | 'dispatch' | 'done';

/** SRC-076's gate order — how the loop turns, and the j/k walk order. */
export const GATE_ORDER: readonly GateKey[] = ['intent', 'decision', 'dispatch', 'done'];

export const GATE_META: Record<GateKey, { label: string; hint: string }> = {
  intent: { label: 'INTENT GATE', hint: 'Draft requirements awaiting your accept' },
  decision: { label: 'DECISION GATE', hint: 'Proposed decisions awaiting your approve' },
  dispatch: { label: 'DISPATCH GATE', hint: 'Backlog work awaiting your dispatch' },
  done: { label: 'DONE GATE', hint: 'Receipts filed, awaiting your judgment' },
};

/**
 * The gate a document is waiting at, or null when it waits at none. The done
 * gate holds only in-progress work orders with a filed receipt — an unclaimed
 * in-progress WO is mid-execution, not awaiting judgment.
 */
export function gateOf(doc: VeriDocument): GateKey | null {
  if (doc.type === 'requirement' && doc.status === 'draft') return 'intent';
  if (doc.type === 'decision' && doc.status === 'proposed') return 'decision';
  if (doc.type === 'work-order' && doc.status === 'backlog') return 'dispatch';
  if (doc.type === 'work-order' && doc.status === 'in-progress' && receipts(doc).length > 0) return 'done';
  return null;
}

export interface GateRow {
  gate: GateKey;
  doc: VeriDocument;
}

export interface GateQueue {
  /** Flat, gate order then oldest-first within a gate (the longest-waiting
      promotion may be gating work — the pendingDocs precedent). */
  rows: GateRow[];
  counts: Record<GateKey, number>;
  total: number;
}

export function gateQueue(docs: readonly VeriDocument[]): GateQueue {
  const byGate = new Map<GateKey, VeriDocument[]>(GATE_ORDER.map((g) => [g, []]));
  for (const doc of docs) {
    const gate = gateOf(doc);
    if (gate !== null) byGate.get(gate)!.push(doc);
  }
  const rows: GateRow[] = [];
  const counts = { intent: 0, decision: 0, dispatch: 0, done: 0 };
  for (const gate of GATE_ORDER) {
    const list = byGate
      .get(gate)!
      .sort((a, b) => (a.created === b.created ? compareIds(a.id, b.id) : a.created.localeCompare(b.created)));
    counts[gate] = list.length;
    for (const doc of list) rows.push({ gate, doc });
  }
  return { rows, counts, total: rows.length };
}

/** Approve and send-back act on pending documents only; dispatch- and
    done-gate rows hand off to the work-order surface — dispatch is never
    performed from the queue (DEC-143), and the done judgment lives with the
    work order's ticks and status control. */
export function rowActions(gate: GateKey): { approve: boolean; sendBack: boolean } {
  const pending = gate === 'intent' || gate === 'decision';
  return { approve: pending, sendBack: pending };
}

/** The list row's one-line state, in the mockup's register. */
export function rowStatusLine(gate: GateKey, doc: VeriDocument): string {
  if (gate === 'intent') return 'draft → accepted on your stamp';
  if (gate === 'decision') {
    const flags = paneSections(doc).find((s) => s.kind === 'flagged');
    const n = flags !== undefined && flags.kind === 'flagged' ? flags.blocks.length : 0;
    return n > 0 ? `proposed · ${n} concern${n === 1 ? '' : 's'} flagged` : 'proposed → active on your stamp';
  }
  if (gate === 'dispatch') return 'backlog · dispatch is your gesture';
  return 'in-progress · receipt filed';
}

/** The row the queue considers selected: the stored id while it still waits
    at a gate, else the first row — so an approve moves selection forward
    instead of stranding it on the promoted document. */
export function effectiveSel(queue: GateQueue, stored: string | null): string | null {
  if (stored !== null && queue.rows.some((r) => r.doc.id === stored)) return stored;
  return queue.rows[0]?.doc.id ?? null;
}

/** j/k movement over the flat row order; clamped at both ends. */
export function moveSel(queue: GateQueue, current: string | null, dir: 1 | -1): string | null {
  const sel = effectiveSel(queue, current);
  if (sel === null) return null;
  const at = queue.rows.findIndex((r) => r.doc.id === sel);
  return queue.rows[Math.min(queue.rows.length - 1, Math.max(0, at + dir))].doc.id;
}

// ---- Detail-pane anatomy (SRC-076 §Gate Queue detail) ---------------------

export interface Alternative {
  name: string;
  reason: string;
}

export type PaneSection =
  | { kind: 'flagged'; blocks: Block[] }
  | { kind: 'alternatives'; items: Alternative[] }
  | { kind: 'revisit'; text: string }
  | { kind: 'section'; title: string; blocks: Block[] };

/** Headings whose content the agent wrote as flags for the reviewer. */
const FLAGGED_RE = /^(flagged|concerns?\b|open questions|risks\b)/i;
const ALTERNATIVES_RE = /^(rejected )?alternatives\b/i;
const REVISIT_RE = /^revisit\b/i;
/** A revisit condition folded into prose (the DEC-143 shape). */
const REVISIT_PARA_RE = /^Revisit (when|if)\b/i;

function itemBlocks(blocks: Block[]): Block[] {
  return blocks.filter((b) => b.kind === 'li' || b.kind === 'oli' || b.kind === 'check' || b.kind === 'para');
}

function toAlternative(block: Block): Alternative | null {
  if (block.kind !== 'li' && block.kind !== 'oli' && block.kind !== 'para') return null;
  const segs = block.segs;
  if (segs.length > 0 && segs[0].kind === 'bold') {
    const reason = plainText(segs.slice(1)).replace(/^\s*[—–-]+\s*/, '');
    return { name: segs[0].text, reason };
  }
  const text = plainText(segs);
  const split = text.split(/\s+—\s+/);
  if (split.length >= 2) return { name: split[0], reason: split.slice(1).join(' — ') };
  return text === '' ? null : { name: text, reason: '' };
}

/**
 * The detail pane's render order, fixed here so the view cannot reorder it:
 * agent-flagged concerns first, then alternatives with their rejection
 * reasons, then revisit conditions, then the rest of the document in its own
 * order. Sections that do not exist in the document are absent — nothing is
 * fabricated to fill the anatomy.
 */
export function paneSections(doc: VeriDocument): PaneSection[] {
  const secs = sections(doc.body);
  const flagged: Block[] = [];
  const alternatives: Alternative[] = [];
  let revisit: string | null = null;
  const rest: Array<{ title: string; blocks: Block[] }> = [];

  for (const [title, blocks] of secs) {
    if (title !== '' && FLAGGED_RE.test(title)) {
      flagged.push(...itemBlocks(blocks));
    } else if (title !== '' && ALTERNATIVES_RE.test(title)) {
      for (const block of blocks) {
        const alt = toAlternative(block);
        if (alt !== null) alternatives.push(alt);
      }
    } else if (title !== '' && REVISIT_RE.test(title)) {
      revisit = blocks
        .filter((b) => b.kind === 'para' || b.kind === 'li' || b.kind === 'quote')
        .map((b) => plainText(b.segs))
        .join(' ');
    } else {
      if (title === '' && blocks.length === 0) continue;
      rest.push({ title, blocks });
    }
  }
  // A revisit condition living inside prose (Rationale, commonly) still
  // surfaces in the anatomy — lifted as a copy, the section keeps its text.
  if (revisit === null) {
    outer: for (const { blocks } of rest) {
      for (const b of blocks) {
        if ((b.kind === 'para' || b.kind === 'li') && REVISIT_PARA_RE.test(plainText(b.segs))) {
          revisit = plainText(b.segs);
          break outer;
        }
      }
    }
  }

  const out: PaneSection[] = [];
  if (flagged.length > 0) out.push({ kind: 'flagged', blocks: flagged });
  if (alternatives.length > 0) out.push({ kind: 'alternatives', items: alternatives });
  if (revisit !== null && revisit !== '') out.push({ kind: 'revisit', text: revisit });
  for (const s of rest) out.push({ kind: 'section', title: s.title, blocks: s.blocks });
  return out;
}
