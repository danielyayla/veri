/** Gate Queue view (WO-162, SRC-076 §Gate Queue): the approval pass as a
    first-class surface — left gate list in loop order, detail pane leading
    with what the agent flagged, and the a/e/b action bar. Approve writes
    core's own stamp (REQ-008); dispatch is never performed here (DEC-143). */
import type { VeriDocument } from '@verikb/core';
import { localToday } from '@verikb/core/dates';
import { h } from '../dom.ts';
import { TYPE_META } from '../theme.ts';
import { GATE_META, GATE_ORDER, effectiveSel, gateQueue, moveSel, paneSections, rowActions, rowStatusLine } from '../gatequeue.ts';
import type { GateQueue, GateRow } from '../gatequeue.ts';
import { displayTitle, renderBlocks, renderSegs, statusChip } from '../widgets.ts';
import { receipts } from '../derive.ts';
import type { Ctx } from '../app.ts';

/** The queue the view and the shell's key handler share, from the one
    snapshot — derived per call so neither can hold a stale copy. */
export function queueOf(ctx: Ctx): GateQueue {
  return gateQueue(ctx.snap.documents);
}

export function selectedRow(ctx: Ctx): GateRow | null {
  const queue = queueOf(ctx);
  const sel = effectiveSel(queue, ctx.state.gatesSel);
  return queue.rows.find((r) => r.doc.id === sel) ?? null;
}

/** The approve act, shared by the action bar and the `a` key: opens the
    confirm popover; the popover's stamp button performs core's write. */
export function gatesApprove(ctx: Ctx): void {
  const row = selectedRow(ctx);
  if (row === null || !rowActions(row.gate).approve) return;
  if ((ctx.issues.get(row.doc.id) ?? []).length > 0) {
    ctx.flashToast(`Fix check issues on ${row.doc.id} first`);
    return;
  }
  ctx.update({ gatesPop: true });
}

export function gatesEdit(ctx: Ctx): void {
  const row = selectedRow(ctx);
  if (row === null) return;
  ctx.openDoc(row.doc.id);
  ctx.setEditMode(row.doc.id, 'edit');
}

export function gatesSendBack(ctx: Ctx): void {
  const row = selectedRow(ctx);
  if (row === null || !rowActions(row.gate).sendBack) return;
  ctx.update({ gatesNote: '' });
}

/** ↩ / o: the row's document — for dispatch and done rows this is the
    work-order detail, whose status control owns the lifecycle gesture. */
export function gatesOpen(ctx: Ctx): void {
  const row = selectedRow(ctx);
  if (row !== null) ctx.openDoc(row.doc.id);
}

export function gatesMove(ctx: Ctx, dir: 1 | -1): void {
  const next = moveSel(queueOf(ctx), ctx.state.gatesSel, dir);
  if (next !== ctx.state.gatesSel) ctx.update({ gatesSel: next, gatesNote: null, gatesPop: false });
}

function confirmApprove(ctx: Ctx, doc: VeriDocument): void {
  // Selection moves to the next row before the stamp lands, so the pass
  // keeps walking instead of stranding on the promoted document.
  const next = moveSel(queueOf(ctx), doc.id, 1);
  ctx.update({ gatesPop: false, gatesSel: next === doc.id ? null : next });
  void ctx.api
    .approve(doc.id)
    .then((result) => {
      ctx.sessionLog(doc.id, { agent: false, text: `Approved — ${result.from} → ${result.to}`, time: 'today' });
      ctx.flashToast(`${doc.id} approved`);
      void ctx.refresh();
    })
    .catch((err: Error) => {
      // Core refused (e.g. a check issue landed since render) — surface why.
      ctx.flashToast(err.message.split('\n')[0].replace(/^.*Error: /, ''));
      void ctx.refresh();
    });
}

function approvePopover(ctx: Ctx, doc: VeriDocument): HTMLElement {
  const to = doc.type === 'requirement' ? 'accepted' : 'active';
  return h(
    'div',
    { class: 'gq-pop rv-pop', role: 'dialog', modal: true, label: `Approve ${doc.id}`, onClick: (e) => e.stopPropagation() },
    h('div', { class: 'rv-pop-title' }, `Approve ${doc.id}?`),
    h(
      'div',
      { class: 'rv-pop-diff' },
      h('div', {}, 'status: ', h('span', { class: 'rv-diff-old' }, doc.status), ' → ', h('span', { class: 'rv-diff-new' }, to)),
      h('div', { class: 'rv-diff-new' }, `approved: ${localToday()}`),
    ),
    h('div', { class: 'rv-pop-cap' }, 'The same stamp veri approve writes. From the next context package on, agents treat this as binding.'),
    h(
      'div',
      { class: 'rv-pop-btns' },
      h('button', { class: 'btn-reset rv-ghost', fkey: 'gq-cancel', onClick: () => ctx.update({ gatesPop: false }) }, 'Cancel'),
      h('button', { class: 'btn-reset rv-approve', fkey: 'gq-stamp', onClick: () => confirmApprove(ctx, doc) }, 'Approve & stamp'),
    ),
  );
}

function noteComposer(ctx: Ctx, doc: VeriDocument): HTMLElement {
  const submit = (): void => {
    const text = (ctx.state.gatesNote ?? '').trim();
    if (text === '') return;
    void ctx.api.reviewNote(doc.id, text).then(() => {
      ctx.sessionLog(doc.id, { agent: false, text: 'Returned with a review note', time: 'today' });
      ctx.update({ gatesNote: null });
      ctx.flashToast(`Note added to ${doc.id} — stays at your gate`);
      void ctx.refresh();
    });
  };
  const input = h('textarea', {
    class: 'rv-composer-input',
    label: 'Send-back note',
    fkey: 'gq-note',
    placeholder: 'What should change before you’d approve this?',
    value: ctx.state.gatesNote ?? '',
    onInput: (e) => ctx.update({ gatesNote: (e.target as HTMLTextAreaElement).value }),
    onKeydown: (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        ctx.update({ gatesNote: null });
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit();
      }
    },
  }) as HTMLTextAreaElement;
  queueMicrotask(() => {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
  return h(
    'div',
    { class: 'gq-composer rv-composer' },
    input,
    h(
      'div',
      { class: 'rv-composer-btns' },
      h('button', { class: 'btn-reset rv-ghost', fkey: 'gq-note-cancel', onClick: () => ctx.update({ gatesNote: null }) }, 'Cancel'),
      h('button', { class: 'btn-reset rv-return', fkey: 'gq-note-send', onClick: submit }, 'Return with note'),
    ),
  );
}

function keycap(key: string): HTMLElement {
  return h('span', { class: 'gq-key' }, key);
}

function actionBar(ctx: Ctx, row: GateRow): HTMLElement {
  const acts = rowActions(row.gate);
  if (!acts.approve) {
    // Dispatch and done rows hand off: the work-order surface owns the
    // status gesture (DEC-143) — the queue only takes you there.
    const caption =
      row.gate === 'dispatch'
        ? `dispatch stays your gesture — veri dispatch ${row.doc.id} --as <session>, or the work order's status control`
        : 'judge the receipt on the work order — ticks and the done flip live there';
    return h(
      'div',
      { class: 'gq-bar' },
      h('button', { class: 'btn-reset gq-primary', fkey: 'gq-open', onClick: () => gatesOpen(ctx) }, 'Open work order ', keycap('↩')),
      h('span', { class: 'gq-bar-cap' }, caption),
    );
  }
  const issueCount = (ctx.issues.get(row.doc.id) ?? []).length;
  return h(
    'div',
    { class: 'gq-bar' },
    issueCount > 0
      ? h(
          'button',
          { class: 'btn-reset gq-primary gq-primary-off', disabled: true, fkey: 'gq-approve' },
          `✓ Approve `,
          keycap('a'),
          h('span', { class: 'rv-tip' }, `Fix check issues first — ${issueCount} on this document`),
        )
      : h('button', { class: 'btn-reset gq-primary', fkey: 'gq-approve', onClick: () => gatesApprove(ctx) }, '✓ Approve ', keycap('a')),
    h('button', { class: 'btn-reset gq-ghost', fkey: 'gq-edit', onClick: () => gatesEdit(ctx) }, 'Edit first ', keycap('e')),
    h('button', { class: 'btn-reset gq-ghost', fkey: 'gq-back', onClick: () => gatesSendBack(ctx) }, 'Send back ', keycap('b')),
    h(
      'span',
      { class: 'gq-bar-cap' },
      'approve stamps ',
      h('span', { class: 'gq-bar-code' }, `approved: ${localToday()}`),
      ' and fires the next gate',
    ),
  );
}

function detailPane(ctx: Ctx, row: GateRow): HTMLElement {
  const doc = row.doc;
  const filed =
    row.gate === 'done'
      ? `claimed by ⌁ ${String(doc.frontmatter['claimed_by'] ?? 'session')} · receipt ${ctx.rel(receipts(doc).at(-1)?.date ?? doc.updated)}`
      : `filed ${ctx.rel(doc.created)}`;
  const context = doc.links
    .slice(0, 3)
    .map((l) => `${l.rel} ${l.id}`)
    .join(' · ');
  const sections = paneSections(doc).map((s) => {
    if (s.kind === 'flagged') {
      return h(
        'div',
        { class: 'gq-flag-card' },
        h('div', { class: 'gq-flag-label' }, 'FLAGGED BY THE AGENT — READ THESE FIRST'),
        ...s.blocks.map((b) =>
          b.kind === 'li' || b.kind === 'oli' || b.kind === 'check' || b.kind === 'para'
            ? h('div', { class: 'gq-flag-item' }, h('span', { class: 'gq-flag-dot' }, '◆'), h('span', {}, ...renderSegs(b.segs, ctx.byId, ctx)))
            : null,
        ),
      );
    }
    if (s.kind === 'alternatives') {
      return h(
        'div',
        { class: 'gq-sec' },
        h('div', { class: 'gq-sec-label' }, 'ALTERNATIVES THAT COULD HAVE BEEN CHOSEN'),
        ...s.items.map((alt) =>
          h(
            'div',
            { class: 'gq-alt' },
            h('div', { class: 'gq-alt-head' }, h('span', { class: 'gq-alt-name' }, alt.name), h('span', { class: 'gq-alt-chip' }, 'rejected')),
            alt.reason !== '' ? h('div', { class: 'gq-alt-reason' }, alt.reason) : null,
          ),
        ),
      );
    }
    if (s.kind === 'revisit') {
      return h(
        'div',
        { class: 'gq-sec' },
        h('div', { class: 'gq-sec-label' }, 'REVISIT WHEN'),
        h('div', { class: 'gq-revisit' }, s.text),
      );
    }
    return h(
      'div',
      { class: 'gq-sec gq-sec-body' },
      s.title !== '' ? h('div', { class: 'gq-sec-label' }, s.title.toUpperCase()) : null,
      ...renderBlocks(s.blocks, ctx.byId, ctx),
    );
  });
  return h(
    'div',
    { class: 'gq-detail' },
    h(
      'div',
      { class: 'gq-detail-scroll' },
      h(
        'div',
        { class: 'gq-detail-head' },
        h('span', { class: 'gq-id', style: `color:${TYPE_META[doc.type].color};` }, doc.id),
        statusChip(doc.status),
        h('span', { class: 'gq-filed' }, filed),
      ),
      h('h1', { class: 'gq-title' }, displayTitle(doc.title)),
      context !== '' ? h('div', { class: 'gq-context' }, context) : null,
      ...sections,
      ctx.state.gatesNote !== null ? noteComposer(ctx, doc) : null,
    ),
    actionBar(ctx, row),
    ctx.state.gatesPop ? approvePopover(ctx, doc) : null,
  );
}

export function gatesView(ctx: Ctx): HTMLElement {
  const queue = queueOf(ctx);
  const sel = effectiveSel(queue, ctx.state.gatesSel);

  if (queue.total === 0) {
    return h(
      'div',
      { class: 'screen-gates' },
      h(
        'div',
        { class: 'gq-empty' },
        h('div', { class: 'gq-empty-title' }, 'Nothing at your gates'),
        h('div', { class: 'gq-empty-cap' }, 'Gates hold what needs judgment. Everything between gates moves on its own.'),
      ),
    );
  }

  const listRows: HTMLElement[] = [];
  for (const gate of GATE_ORDER) {
    const rows = queue.rows.filter((r) => r.gate === gate);
    if (rows.length === 0) continue;
    listRows.push(h('div', { class: 'gq-gate-label' }, `${GATE_META[gate].label} · ${rows.length}`));
    for (const r of rows) {
      const active = r.doc.id === sel;
      listRows.push(
        h(
          'button',
          {
            class: `btn-reset btn-block gq-row${active ? ' gq-row-sel' : ''}`,
            fkey: `gq-row:${r.doc.id}`,
            label: `${r.doc.id} — ${r.doc.title}`,
            onClick: () => ctx.update({ gatesSel: r.doc.id, gatesNote: null, gatesPop: false }),
          },
          h('span', { class: 'gq-row-id', style: `color:${TYPE_META[r.doc.type].color};` }, r.doc.id),
          h(
            'span',
            { class: 'gq-row-main' },
            h('span', { class: 'gq-row-title' }, r.doc.title),
            h('span', { class: 'gq-row-status' }, rowStatusLine(r.gate, r.doc)),
          ),
          active ? h('span', { class: 'gq-row-hint' }, '↩') : null,
        ),
      );
    }
  }

  const row = queue.rows.find((r) => r.doc.id === sel) ?? null;
  return h(
    'div',
    { class: 'screen-gates' },
    h(
      'div',
      { class: 'gq-list' },
      h(
        'div',
        { class: 'gq-list-head' },
        h('span', { class: 'gq-list-title' }, 'Your gates'),
        h('span', { class: 'gq-list-meta' }, `${queue.total} stamp${queue.total === 1 ? '' : 's'} · j/k`),
      ),
      h('div', { class: 'gq-list-rows' }, ...listRows),
      h('div', { class: 'gq-list-foot' }, 'Gates hold what needs judgment, ordered by how the loop turns. Everything else moved on its own.'),
    ),
    row !== null ? detailPane(ctx, row) : null,
  );
}
