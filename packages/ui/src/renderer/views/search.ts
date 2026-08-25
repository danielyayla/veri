/** Search view (WO-048, SRC-022): a singleton view tab holding one query —
    the palette row, given room to breathe. Same filter syntax, the shared
    library's ranking unsliced, top 200 rendered. */
import type { VeriDocument } from '@verikb/core';
import type { PaletteHit } from '@verikb/mcp';
import { h } from '../dom.ts';
import { TYPE_META, statusColor, tint } from '../theme.ts';
import { boldSegments, searchRows } from '../searchview.ts';
import type { Ctx } from '../app.ts';

export function searchView(ctx: Ctx): HTMLElement {
  const result = ctx.state.searchResult;
  const hits = result?.hits ?? [];
  const text = result?.query.text ?? '';
  const { rows, more } = searchRows(hits);
  const { focus, caret } = ctx.svInput();

  const input = h('input', {
    class: 'sv-input',
    placeholder: 'Search docs — try related:WO-028 is:active',
    label: 'Search query',
    fkey: 'sv-input',
    value: ctx.state.searchQuery,
    onInput: (e) => {
      const el = e.target as HTMLInputElement;
      ctx.setSearchQuery(el.value, el.selectionStart);
    },
  }) as HTMLInputElement;
  input.spellcheck = false;
  if (focus) {
    queueMicrotask(() => input.focus());
  } else if (caret !== null) {
    queueMicrotask(() => {
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  }

  // The palette row's anatomy, one per hit; SRC-018 semantics on click
  // (preview tab; ⌘-click background) — exactly how Board rows open docs.
  const rowEl = (hit: PaletteHit): HTMLElement => {
    const meta = TYPE_META[hit.type as VeriDocument['type']];
    const st = statusColor(hit.status);
    return h(
      'button',
      {
        class: 'btn-reset btn-block sv-row',
        label: `${hit.id} — ${hit.title} — ${hit.status}`,
        fkey: `sv:${hit.id}`,
        onClick: (e) => ctx.openDoc(hit.id, { preview: true, background: e.metaKey || e.ctrlKey }),
      },
      h(
        'span',
        { class: 'sv-line' },
        h('span', { class: 'sv-id', style: `color:${meta.color};` }, hit.id),
        h('span', { class: 'sv-title' }, hit.title),
        h('span', { class: 'sv-status', style: `color:${st};background:${tint(st)};` }, hit.status),
      ),
      hit.snippet !== null
        ? h(
            'span',
            { class: 'sv-snippet' },
            ...boldSegments(hit.snippet, text).map((seg) => (seg.bold ? h('b', {}, seg.text) : h('span', {}, seg.text))),
          )
        : null,
    );
  };

  return h(
    'div',
    { class: 'screen-search' },
    h('div', { class: 'sv-head' }, h('span', { class: 'sv-glyph' }, '⌕'), input),
    h(
      'div',
      { class: 'sv-count', live: 'polite' },
      result === null ? '' : `${hits.length} result${hits.length === 1 ? '' : 's'}`,
    ),
    h(
      'div',
      { class: 'sv-list' },
      ...rows.map(rowEl),
      more > 0 ? h('div', { class: 'sv-more' }, `${more} more — refine the query`) : null,
      result !== null && hits.length === 0
        ? h(
            'div',
            { class: 'sv-empty' },
            'No matches — try an id, title text, or a filter like ',
            h('span', { class: 'pal-empty-code' }, 'related:WO-028 is:active'),
          )
        : null,
    ),
  );
}
