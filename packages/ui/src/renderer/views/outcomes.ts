/**
 * The Outcomes view (WO-119, SRC-054, REQ-036): DID IT WORK?'s first-class
 * surface — the full-depth answer behind Home's RECENTLY LEARNED window,
 * the way the Board sits behind the Work Orders panel's subgroups. Three
 * sections, all derived and stateless (no authoritative state, no sidecar
 * reads): outcome evidence (sources with tests/supports/refutes links,
 * verdict chips opening the hypothesis — the SRC-053 split-row grammar,
 * given room to breathe), untested bets (the check snapshot's own
 * `untested-bet` advisories, never recomputed here), and recent receipts
 * (done work orders newest receipt first, windowed behind an expander like
 * DONE on the board). Empty evidence renders the teaching card.
 */
import { h } from '../dom.ts';
import { OUTCOMES_RECEIPTS_WINDOW, outcomeEvidence, recentReceipts, untestedBets } from '../derive.ts';
import type { Ctx } from '../app.ts';

/** The RECENT RECEIPTS window — pure, so the expander states are testable.
    The board's DONE posture (SRC-025): window closed shows the first
    OUTCOMES_RECEIPTS_WINDOW rows; at or under the window, no expander. */
export function receiptsWindow(total: number, open: boolean): { count: number; expander: string | null } {
  if (total <= OUTCOMES_RECEIPTS_WINDOW) return { count: total, expander: null };
  return open
    ? { count: total, expander: '▾ hide receipts' }
    : { count: OUTCOMES_RECEIPTS_WINDOW, expander: `▸ show all ${total} receipts` };
}

const label = (text: string): HTMLElement => h('span', { class: 'hv-label' }, text);
const dot = (color: string): HTMLElement => h('span', { class: 'hv-dot', style: `background:${color};` });

export function outcomesView(ctx: Ctx): HTMLElement {
  const open = (id: string) => (e: MouseEvent) => ctx.openDoc(id, { preview: true, background: e.metaKey || e.ctrlKey });
  let rowSeq = 0;

  // OUTCOME EVIDENCE (SRC-054 §1): one split row per outcome source — the
  // main button opens the source, each verdict chip opens its hypothesis
  // (two honest targets, never nested buttons — the SRC-053 grammar).
  const evidence = outcomeEvidence(ctx.snap, ctx.rel);
  const evidenceRows = evidence.map((r) =>
    h(
      'div',
      { class: 'hv-row ov-row hv-row-split' },
      h(
        'button',
        { class: 'btn-reset hv-split-main', fkey: `ov:${r.id}:${rowSeq++}`, onClick: open(r.id) },
        h('span', { class: 'hv-id', style: 'color:var(--t-src);' }, r.id),
        h('span', { class: 'hv-flight-title' }, r.title),
      ),
      ...r.verdicts.map((v) =>
        h(
          'button',
          {
            class: `btn-reset hv-verdict hv-verdict-${v.rel}`,
            fkey: `ov:${r.id}:${rowSeq++}`,
            title: `Outcome evidence — open ${v.reqId}`,
            label: `${v.rel} ${v.reqId} — open the hypothesis`,
            onClick: open(v.reqId),
          },
          `${v.rel} ${v.reqId}`,
        ),
      ),
      h('span', { class: 'hv-time' }, `filed ${r.time}`),
    ),
  );
  const evidenceCard = h(
    'div',
    { class: 'hv-card ov-card' },
    h(
      'div',
      { class: 'hv-card-head' },
      dot('var(--t-src)'),
      label('OUTCOME EVIDENCE'),
      h('span', { class: 'hv-meta' }, `${evidence.length} source${evidence.length === 1 ? '' : 's'}`),
    ),
    ...(evidence.length > 0
      ? evidenceRows
      : [
          // The teaching empty (SRC-054): mirrors the home bets card's
          // posture — the section renders at zero so it can teach the loop.
          h(
            'div',
            { class: 'hv-empty ov-teach' },
            'Nothing reported back yet — when a shipped hypothesis gets outcome evidence (a source linked tests/supports/refutes), reality’s answers land here.',
          ),
        ]),
  );

  // UNTESTED BETS (SRC-054 §2): the snapshot's advisories — shipped bets
  // still awaiting reality's answer, each naming what shipped.
  const bets = untestedBets(ctx.snap);
  const betsCard = h(
    'div',
    { class: 'hv-card ov-card' },
    h(
      'div',
      { class: 'hv-card-head' },
      dot('var(--amber)'),
      label('UNTESTED BETS'),
      h('span', { class: 'hv-meta' }, `${bets.length} ${bets.length === 1 ? 'hypothesis' : 'hypotheses'}`),
    ),
    ...(bets.length > 0
      ? bets.map((b) =>
          h(
            'button',
            { class: 'btn-reset btn-block hv-row ov-row', fkey: `ov:${b.id}:${rowSeq++}`, onClick: open(b.id) },
            h('span', { class: 'hv-bet-untested' }, '● untested bet'),
            h('span', { class: 'hv-id', style: 'color:var(--t-req);' }, b.id),
            h('span', { class: 'hv-flight-title' }, b.title),
            h('span', { class: 'ov-shipped' }, `shipped: ${b.workOrderIds.join(', ')}`),
          ),
        )
      : [h('div', { class: 'hv-empty' }, 'No untested bets — every shipped hypothesis has evidence, or is still shipping')]),
  );

  // RECENT RECEIPTS (SRC-054 §3): done work orders newest receipt first,
  // windowed behind an expander like DONE on the board (session state only).
  const rcpts = recentReceipts(ctx.snap, ctx.rel);
  const win = receiptsWindow(rcpts.length, ctx.state.outcomesDone);
  const shown = rcpts.slice(0, win.count);
  const expander =
    win.expander !== null
      ? h(
          'button',
          {
            class: 'btn-reset btn-block board-more',
            expanded: ctx.state.outcomesDone,
            fkey: 'ov:done-more',
            onClick: () => ctx.update({ outcomesDone: !ctx.state.outcomesDone }),
          },
          win.expander,
        )
      : null;
  const receiptsCard = h(
    'div',
    { class: 'hv-card ov-card' },
    h(
      'div',
      { class: 'hv-card-head' },
      dot('var(--green)'),
      label('RECENT RECEIPTS'),
      h('span', { class: 'hv-meta' }, `${rcpts.length} work order${rcpts.length === 1 ? '' : 's'}`),
    ),
    ...(rcpts.length > 0
      ? shown.map((r) =>
          h(
            'button',
            { class: 'btn-reset btn-block hv-row ov-row', fkey: `ov:${r.id}:${rowSeq++}`, onClick: open(r.id) },
            h('span', { class: 'hv-id hv-id-wo' }, r.id),
            h('span', { class: 'hv-flight-title' }, r.title),
            r.reqIds.length > 0 ? h('span', { class: 'ov-req' }, r.reqIds.join(', ')) : null,
            h('span', { class: 'board-card-rcpt' }, `✓ ${r.commit}`),
            h('span', { class: 'hv-time' }, r.time),
          ),
        )
      : [h('div', { class: 'hv-empty' }, 'No receipts yet — a done work order files one')]),
    expander,
  );

  return h(
    'div',
    { class: 'screen-outcomes' },
    h(
      'div',
      { class: 'ov-wrap' },
      h(
        'div',
        { class: 'hv-head' },
        h('h1', { class: 'hv-title' }, 'Outcomes'),
        h(
          'span',
          { class: 'hv-count' },
          `${evidence.length} evidence · ${bets.length} untested · ${rcpts.length} receipts`,
        ),
      ),
      evidenceCard,
      betsCard,
      receiptsCard,
    ),
  );
}
