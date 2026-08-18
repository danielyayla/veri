/** Shared view fragments: id chips, markdown block rendering, activity feed. */
import type { VeriDocument } from '@veri/core';
import { h } from './dom.ts';
import type { Child } from './dom.ts';
import { TYPE_META, statusColor, tint } from './theme.ts';
import type { Block, Seg } from './markdown.ts';
import type { ActivityRow, DocsById } from './derive.ts';

export interface Nav {
  openDoc(id: string, opts?: { preview?: boolean; background?: boolean }): void;
}

let chipSeq = 0;

/** Reset once per render pass so fkeys are stable for a given screen. */
export function resetChipKeys(): void {
  chipSeq = 0;
}

export function idChip(byId: DocsById, id: string, nav: Nav): HTMLElement {
  const target = byId.get(id);
  if (target === undefined) {
    // SRC-019 rule 5: the amber underline gets a glyph channel too.
    return h(
      'span',
      { class: 'chip-broken', title: 'Broken link — target not found', label: `Broken link ${id} — target not found` },
      `⚠ [[${id}]]`,
    );
  }
  const meta = TYPE_META[target.type];
  return h(
    'button',
    {
      class: 'btn-reset chip-ref',
      style: `color:${meta.color};background:${tint(meta.color)};`,
      label: `${id} — ${target.title}`,
      fkey: `chip:${id}:${chipSeq++}`,
      // SRC-004 rule 1: inline links open pinned tabs; ⌘-click stays in the background.
      onClick: (e) => nav.openDoc(id, { background: e.metaKey || e.ctrlKey }),
    },
    id,
  );
}

/** Document-header pin chip (WO-014, WO-035): ☆ Pin / ★ Pinned, floating
    the doc into its type panel's PINNED group. */
export function pinChip(pinned: boolean, toggle: () => void): HTMLElement {
  return h(
    'button',
    {
      class: pinned ? 'btn-reset pin-chip pin-chip-on' : 'btn-reset pin-chip',
      title: pinned ? "Remove from the type panel's PINNED group" : "Keep at the top of the type panel",
      pressed: pinned,
      fkey: 'pin-chip',
      onClick: toggle,
    },
    h('span', {}, pinned ? '★' : '☆'),
    h('span', {}, pinned ? 'Pinned' : 'Pin'),
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
    if (seg.kind === 'italic') return h('em', {}, seg.text);
    return document.createTextNode(seg.text);
  });
}

/** Absolute directory of a document's file, for resolving relative image paths. */
export function imgDirFor(root: string, file: string): string {
  const slash = file.lastIndexOf('/');
  const dir = slash >= 0 ? `/${file.slice(0, slash)}` : '';
  return `${root}/veri${dir}`;
}

/** Standalone image (SRC-020): resolved against the document's directory, alt
    as caption; a missing file gets the amber broken treatment, never a silent
    gap (SRC-019 rule 5). */
function imageBlock(alt: string, src: string, imgDir: string | undefined): HTMLElement {
  const broken = (): HTMLElement =>
    h(
      'div',
      { class: 'rd-img-broken', role: 'img', label: `Broken image ${src} — file not found` },
      h('span', {}, '⚠ image not found'),
      h('span', { class: 'rd-img-path' }, src),
    );
  const resolved = imgDir !== undefined ? new URL(encodeURI(src), `file://${encodeURI(imgDir)}/`).href : src;
  const fig = h('figure', { class: 'rd-img' });
  const img = h('img', {
    src: resolved,
    alt,
    onError: () => fig.replaceChildren(broken()),
  });
  fig.append(img);
  if (alt !== '') fig.append(h('figcaption', { class: 'rd-img-cap' }, alt));
  return fig;
}

export function renderBlocks(
  blocks: Block[],
  byId: DocsById,
  nav: Nav,
  opts: { muted?: boolean; imgDir?: string } = {},
): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const block of blocks) {
    if (block.kind === 'heading') {
      out.push(h('h2', { class: 'rd-h2' }, block.text));
    } else if (block.kind === 'para') {
      out.push(h('p', { class: opts.muted === true ? 'rd-p rd-p-muted' : 'rd-p' }, ...renderSegs(block.segs, byId, nav)));
    } else if (block.kind === 'fence') {
      out.push(h('pre', { class: 'rd-fence' }, block.text));
    } else if (block.kind === 'table') {
      out.push(
        h(
          'div',
          { class: 'rd-table-wrap' },
          h(
            'table',
            { class: 'rd-table' },
            h('thead', {}, h('tr', {}, ...block.header.map((c) => h('th', {}, ...renderSegs(c, byId, nav))))),
            h('tbody', {}, ...block.rows.map((r) => h('tr', {}, ...r.map((c) => h('td', {}, ...renderSegs(c, byId, nav)))))),
          ),
        ),
      );
    } else if (block.kind === 'quote') {
      out.push(h('blockquote', { class: 'rd-quote' }, ...renderSegs(block.segs, byId, nav)));
    } else if (block.kind === 'img') {
      out.push(imageBlock(block.alt, block.src, opts.imgDir));
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
      // 'li' and 'oli' share the list treatment; the author's number rides
      // in the dash slot (SRC-020).
      out.push(
        h(
          'div',
          { class: opts.muted === true ? 'rd-li rd-li-muted' : 'rd-li' },
          h('span', { class: 'rd-dash' }, block.kind === 'oli' ? `${block.num}.` : '–'),
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

/** The read | edit segment toggle in a document's crumb row (WO-022, ⌘E). */
export function modeToggle(ctx: { editFor(id: string): { mode: 'read' | 'edit' } | null; setEditMode(id: string, mode: 'read' | 'edit'): void }, docId: string): HTMLElement {
  const mode = ctx.editFor(docId)?.mode ?? 'read';
  const seg = (m: 'read' | 'edit'): HTMLElement =>
    h(
      'button',
      {
        class: mode === m ? 'btn-reset mode-seg mode-seg-on' : 'btn-reset mode-seg',
        pressed: mode === m,
        fkey: `mode:${m}`,
        onClick: () => {
          if (mode !== m) ctx.setEditMode(docId, m);
        },
      },
      m,
    );
  return h('div', { class: 'mode-toggle', title: '⌘E', role: 'group', label: 'View mode' }, seg('read'), seg('edit'));
}

/** Read-mode strip when the tab holds unsaved edits (SRC-008): the rendered
    view shows the saved file, not the buffer. */
export function dirtyStrip(ctx: { editFor(id: string): { dirty: boolean } | null }, docId: string): HTMLElement | null {
  if (ctx.editFor(docId)?.dirty !== true) return null;
  return h(
    'div',
    { class: 'ed-banner ed-banner-strip' },
    h('span', {}, '⚠ viewing saved version — unsaved edits in edit mode'),
  );
}
