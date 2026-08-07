/** Shared view fragments: id chips, markdown block rendering, activity feed. */
import type { VeriDocument } from '@veri/core';
import { h } from './dom.ts';
import type { Child } from './dom.ts';
import { TYPE_META, statusColor, tint } from './theme.ts';
import type { Block, Seg } from './markdown.ts';
import type { ActivityRow, DocsById } from './derive.ts';

export interface Nav {
  openDoc(id: string): void;
}

export function idChip(byId: DocsById, id: string, nav: Nav): HTMLElement {
  const target = byId.get(id);
  if (target === undefined) {
    return h('span', { class: 'chip-broken', title: 'Broken link — target not found' }, `[[${id}]]`);
  }
  const meta = TYPE_META[target.type];
  return h(
    'span',
    {
      class: 'chip-ref',
      style: `color:${meta.color};background:${tint(meta.color)};`,
      onClick: () => nav.openDoc(id),
    },
    id,
  );
}

export function statusChip(status: string): HTMLElement {
  const color = statusColor(status);
  return h('span', { class: 'chip-status', style: `color:${color};background:${tint(color)};` }, status);
}

export function typeChip(type: VeriDocument['type']): HTMLElement {
  const meta = TYPE_META[type];
  return h('span', { class: 'chip-status', style: `color:${meta.color};background:${tint(meta.color)};` }, meta.label);
}

export function renderSegs(segs: Seg[], byId: DocsById, nav: Nav): Child[] {
  return segs.map((seg): Child => {
    if (seg.kind === 'ref') return idChip(byId, seg.id, nav);
    if (seg.kind === 'code') return h('span', { class: 'inline-code' }, seg.text);
    if (seg.kind === 'bold') return h('strong', {}, seg.text);
    return document.createTextNode(seg.text);
  });
}

export function renderBlocks(blocks: Block[], byId: DocsById, nav: Nav, opts: { muted?: boolean } = {}): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const block of blocks) {
    if (block.kind === 'heading') {
      out.push(h('h2', { class: 'rd-h2' }, block.text));
    } else if (block.kind === 'para') {
      out.push(h('p', { class: opts.muted === true ? 'rd-p rd-p-muted' : 'rd-p' }, ...renderSegs(block.segs, byId, nav)));
    } else if (block.kind === 'check') {
      out.push(
        h(
          'div',
          { class: 'rd-check' },
          h('span', { class: block.done ? 'rd-box rd-box-done' : 'rd-box' }, block.done ? '✓' : ''),
          h('span', { class: block.done ? 'rd-check-text rd-check-done' : 'rd-check-text' }, ...renderSegs(block.segs, byId, nav)),
        ),
      );
    } else {
      out.push(
        h(
          'div',
          { class: opts.muted === true ? 'rd-li rd-li-muted' : 'rd-li' },
          h('span', { class: 'rd-dash' }, '–'),
          h('span', {}, ...renderSegs(block.segs, byId, nav)),
        ),
      );
    }
  }
  return out;
}

export function activityFeed(rows: ActivityRow[]): HTMLElement {
  const list = rows.length > 0 ? rows : [{ agent: false, text: 'No activity yet', time: '' }];
  return h(
    'div',
    { class: 'act' },
    h('div', { class: 'micro-label' }, 'ACTIVITY'),
    ...list.map((a) =>
      h(
        'div',
        { class: 'act-row' },
        h('span', { class: 'act-dot', style: `background:${a.agent ? '#E8703A' : '#3A3A44'};` }),
        a.agent ? h('span', { class: 'act-agent' }, 'agent') : null,
        h('span', { class: 'act-text' }, a.text),
        h('span', { class: 'act-time' }, a.time),
      ),
    ),
  );
}
