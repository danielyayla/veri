/** The Work Orders board (WO-103, SRC-047): a four-column kanban over the
    WO-098 lifecycle, returned as a view tab after the WO-053 retirement.
    Read-and-navigate only — the work-order detail's segmented control stays
    the sole status mutation, and `backlog → ready` is a stamped promotion
    no UI control performs. DONE is windowed behind an expander (the
    SRC-025 scale answer); cards carry only what no other surface shows at
    a glance: id, title, recency — receipt SHA on done — plus the filled
    amber check-issue dot (SRC-010 shape rule). */
import type { VeriDocument } from '@verikb/core';
import { h } from '../dom.ts';
import { relTime, statusColor } from '../theme.ts';
import { BOARD_DONE_WINDOW, boardColumns, receipts } from '../derive.ts';
import type { BoardColumn } from '../derive.ts';
import { displayTitle } from '../widgets.ts';
import type { Ctx } from '../app.ts';

/** Living cards show recency; done cards show their latest receipt SHA. */
function cardMeta(doc: VeriDocument): HTMLElement {
  if (doc.status === 'done') {
    const latest = receipts(doc).at(-1);
    if (latest !== undefined) {
      return h(
        'span',
        { class: 'board-card-meta' },
        h('span', { class: 'board-card-rcpt' }, `✓ ${latest.commit}`),
        ` · ${relTime(doc.updated)}`,
      );
    }
  }
  return h('span', { class: 'board-card-meta' }, `updated ${relTime(doc.updated)}`);
}

function card(ctx: Ctx, doc: VeriDocument): HTMLElement {
  const issues = ctx.issues.get(doc.id) ?? [];
  return h(
    'button',
    {
      class: doc.status === 'done' ? 'btn-reset btn-block board-card board-card-done' : 'btn-reset btn-block board-card',
      label: `${doc.id} — ${doc.title} — ${doc.status}${issues.length > 0 ? ' — has check issues' : ''}`,
      fkey: `board:${doc.id}`,
      onClick: (e) => ctx.openDoc(doc.id, { preview: true, background: e.metaKey || e.ctrlKey }),
    },
    h(
      'span',
      { class: 'board-card-head' },
      h('span', { class: 'board-card-id' }, doc.id),
      issues.length > 0 ? h('span', { class: 'board-health-dot', title: 'veri check issues' }) : null,
    ),
    h('span', { class: 'board-card-title' }, displayTitle(doc.title)),
    cardMeta(doc),
  );
}

function column(ctx: Ctx, col: BoardColumn): HTMLElement {
  const windowed = col.status === 'done' && !ctx.state.boardDone;
  const shown = windowed ? col.docs.slice(0, BOARD_DONE_WINDOW) : col.docs;
  const expander =
    col.status === 'done' && col.docs.length > BOARD_DONE_WINDOW
      ? h(
          'button',
          {
            class: 'btn-reset btn-block board-more',
            expanded: ctx.state.boardDone,
            fkey: 'board:done-more',
            onClick: () => ctx.update({ boardDone: !ctx.state.boardDone }),
          },
          ctx.state.boardDone ? '▾ hide done' : `▸ show all ${col.docs.length} done`,
        )
      : null;
  return h(
    'section',
    { class: 'board-col', label: `${col.label} — ${col.docs.length} work order${col.docs.length === 1 ? '' : 's'}` },
    h(
      'div',
      { class: 'board-col-head' },
      h('span', { class: 'board-col-dot', style: `background:${statusColor(col.status)};` }),
      h('span', { class: 'board-col-label' }, col.label),
      h('span', { class: 'board-col-count' }, String(col.docs.length)),
    ),
    h('div', { class: 'board-cards' }, ...shown.map((d) => card(ctx, d)), expander),
  );
}

export function boardView(ctx: Ctx): HTMLElement {
  const cols = boardColumns(ctx.snap);
  const total = cols.reduce((n, c) => n + c.docs.length, 0);
  const counts = cols.map((c) => `${c.docs.length} ${c.label.toLowerCase()}`).join(' · ');
  return h(
    'div',
    { class: 'screen-board' },
    h(
      'div',
      { class: 'board-head' },
      h('h1', { class: 'screen-title' }, 'Work orders'),
      h('span', { class: 'board-count' }, `${total} total · ${counts}`),
    ),
    h('div', { class: 'board-grid' }, ...cols.map((c) => column(ctx, c))),
  );
}
