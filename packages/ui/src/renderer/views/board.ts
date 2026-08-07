/** Screen 3 — Board: work orders as kanban. */
import { h } from '../dom.ts';
import { boardColumns } from '../derive.ts';
import type { Ctx } from '../app.ts';

const COLUMN_DOTS: Record<string, string> = {
  backlog: '#55525E',
  'in-progress': '#E8703A',
  done: '#7FAF8A',
};

export function boardView(ctx: Ctx): HTMLElement {
  const cols = boardColumns(ctx.snap);
  const total = cols.reduce((n, c) => n + c.cards.length, 0);
  return h(
    'div',
    { class: 'screen-board' },
    h(
      'div',
      { class: 'board-head' },
      h('h1', { class: 'screen-title' }, 'Work orders'),
      h('span', { class: 'board-count' }, `${total} total`),
    ),
    h(
      'div',
      { class: 'board-grid' },
      ...cols.map((col) =>
        h(
          'div',
          { class: 'board-col' },
          h(
            'div',
            { class: 'board-col-head' },
            h('span', { class: 'board-col-dot', style: `background:${COLUMN_DOTS[col.status]};` }),
            h('span', { class: 'board-col-label' }, col.label),
            h('span', { class: 'board-col-count' }, String(col.cards.length)),
          ),
          h(
            'div',
            { class: 'board-cards' },
            ...col.cards.map((card) =>
              h(
                'div',
                { class: 'board-card', onClick: () => ctx.openDoc(card.id) },
                h(
                  'div',
                  { class: 'board-card-head' },
                  h('span', { class: 'board-card-id' }, card.id),
                  card.agent
                    ? h('span', { class: 'board-agent-chip', title: 'Agent execution attached' }, '⌁ agent')
                    : null,
                  !card.agent && card.health
                    ? h('span', { class: 'board-health-dot', title: 'veri check issue on this work order' })
                    : null,
                ),
                h('div', { class: 'board-card-title' }, card.title),
                h(
                  'div',
                  { class: 'board-card-reqs', style: card.reqCount === 0 ? 'color:#D9A03F;' : '' },
                  `${card.reqCount} linked REQ${card.reqCount === 1 ? '' : 's'}`,
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
