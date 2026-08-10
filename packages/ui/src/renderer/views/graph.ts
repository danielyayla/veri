/** Screen 4 — Graph: minimal link graph, navigation aid only. */
import { h, svgEl } from '../dom.ts';
import { TYPE_META } from '../theme.ts';
import { graphLayout } from '../derive.ts';
import type { Ctx } from '../app.ts';

export function graphView(ctx: Ctx): HTMLElement {
  const layout = graphLayout(ctx.snap);
  const sel = ctx.state.graphSel;
  const selNode = layout.nodes.find((n) => n.id === sel) ?? null;

  const svg = svgEl('svg', {
    viewBox: '0 0 100 100',
    preserveAspectRatio: 'none',
    style: 'position:absolute;inset:0;width:100%;height:100%;',
  });
  for (const line of layout.lines) {
    const hot = sel !== null && (line.from === sel || line.to === sel);
    svg.append(
      svgEl('line', {
        x1: String(line.x1),
        y1: String(line.y1),
        x2: String(line.x2),
        y2: String(line.y2),
        stroke: hot ? '#E8703A' : '#26262C',
        'stroke-width': hot ? '0.35' : '0.22',
      }),
    );
  }

  const nodes = layout.nodes.map((n) => {
    const active = n.id === sel;
    return h(
      'div',
      {
        class: 'gr-node',
        style: `left:${n.x}%;top:${n.y}%;opacity:${n.dim ? 0.45 : 1};`,
        onClick: () => ctx.update({ graphSel: active ? null : n.id }),
      },
      h('span', {
        class: 'gr-dot',
        style: `width:${n.size}px;height:${n.size}px;background:${TYPE_META[n.type].color};border-color:${active ? '#E7E4DE' : '#111114'};`,
      }),
      h('span', { class: 'gr-label', style: active ? 'color:#E7E4DE;' : '' }, n.id),
    );
  });

  const popover =
    selNode !== null
      ? h(
          'div',
          { class: 'gr-pop', style: `left:${selNode.x}%;top:${selNode.y}%;` },
          h(
            'div',
            { class: 'gr-pop-head' },
            h('span', { class: 'gr-pop-id', style: `color:${TYPE_META[selNode.type].color};` }, selNode.id),
            h('span', { class: 'gr-pop-type' }, TYPE_META[selNode.type].label),
          ),
          h('div', { class: 'gr-pop-title' }, selNode.title),
          h('div', { class: 'gr-pop-meta' }, `${selNode.degree} link${selNode.degree === 1 ? '' : 's'} · ${selNode.status}`),
          h('div', { class: 'gr-pop-open', onClick: (e) => ctx.openDoc(selNode.id, { preview: true, background: e.metaKey || e.ctrlKey }) }, 'Open doc →'),
        )
      : null;

  return h(
    'div',
    { class: 'screen-graph' },
    h(
      'div',
      { class: 'graph-head' },
      h('h1', { class: 'screen-title' }, 'Graph'),
      h(
        'div',
        { class: 'graph-legend' },
        ...(['requirement', 'decision', 'work-order', 'source'] as const).map((t) =>
          h(
            'div',
            { class: 'graph-legend-item' },
            h('span', { class: 'graph-legend-dot', style: `background:${TYPE_META[t].color};` }),
            h('span', {}, TYPE_META[t].label),
          ),
        ),
      ),
    ),
    h('div', { class: 'graph-canvas' }, svg, ...nodes, popover),
  );
}
