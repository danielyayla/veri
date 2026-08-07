/** Screen 5 — Decision log: chronological feed, superseded dimmed. */
import { h } from '../dom.ts';
import { TYPE_META, tint } from '../theme.ts';
import { decisionLog } from '../derive.ts';
import type { Ctx } from '../app.ts';

export function decisionsView(ctx: Ctx): HTMLElement {
  const entries = decisionLog(ctx.snap);
  const superseded = entries.filter((e) => e.status === 'superseded').length;
  const meta = `${entries.length} decision${entries.length === 1 ? '' : 's'}${superseded > 0 ? ` · ${superseded} superseded` : ''}`;
  return h(
    'div',
    { class: 'screen-decisions' },
    h(
      'div',
      { class: 'dl-col' },
      h(
        'div',
        { class: 'board-head' },
        h('h1', { class: 'screen-title' }, 'Decision log'),
        h('span', { class: 'board-count' }, meta),
      ),
      h(
        'div',
        { class: 'dl-list' },
        ...entries.map((e) => {
          const sup = e.status === 'superseded';
          return h(
            'div',
            { class: 'dl-card', style: sup ? 'opacity:0.55;' : '' },
            h(
              'div',
              { class: 'dl-head' },
              h('span', { class: 'dl-id', onClick: () => ctx.openDoc(e.id) }, e.id),
              h('span', { class: 'dl-date' }, e.date),
              h(
                'span',
                {
                  class: 'dl-badge',
                  style: sup
                    ? `color:#D9A03F;background:${tint('#D9A03F')};`
                    : `color:#7FAF8A;background:${tint('#7FAF8A')};`,
                },
                e.status,
              ),
            ),
            h('div', { class: 'dl-title' }, e.title),
            h('div', { class: 'dl-choice' }, e.choice),
            e.rejected.length > 0
              ? h(
                  'div',
                  { class: 'dl-row' },
                  h('span', { class: 'dl-micro' }, 'REJECTED'),
                  ...e.rejected.map((r) => h('span', { class: 'dl-rejected' }, r)),
                )
              : null,
            e.links.length > 0
              ? h(
                  'div',
                  { class: 'dl-row' },
                  h('span', { class: 'dl-micro' }, 'LINKS'),
                  ...e.links.map((l) =>
                    h(
                      'span',
                      {
                        class: 'dl-link',
                        style: `color:${TYPE_META[l.type].color};background:${tint(TYPE_META[l.type].color)};`,
                        onClick: () => ctx.openDoc(l.id),
                      },
                      l.id,
                    ),
                  ),
                )
              : null,
            sup && e.supersededBy !== null
              ? h(
                  'div',
                  { class: 'dl-sup', onClick: () => ctx.openDoc(e.supersededBy!) },
                  h('span', {}, '↪ superseded by'),
                  h('span', { class: 'dl-sup-id' }, e.supersededBy),
                )
              : null,
          );
        }),
      ),
    ),
  );
}
