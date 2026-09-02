/** The Change Trace section (WO-164, SRC-076 §Change Trace): one turn of the
    loop on the work-order surface — the SRC-024 precedent, a property of the
    document, not a screen. Collapsed to one affordance until asked for;
    everything shown is read off the record by trace.ts, nothing fabricated. */
import type { VeriDocument } from '@verikb/core';
import { h } from '../dom.ts';
import { TYPE_META, statusColor } from '../theme.ts';
import { fmtElapsed, traceChain } from '../trace.ts';
import type { TraceNode } from '../trace.ts';
import { displayTitle, idChip } from '../widgets.ts';
import type { Ctx } from '../app.ts';

/** Verdict rels wear the home view's outcome hues (hv-verdict precedent). */
const VERDICT_COLORS: Record<string, string> = {
  supports: 'var(--green)',
  refutes: 'var(--amber)',
  tests: 'var(--muted)',
};

function statusInk(node: TraceNode): string {
  return node.role === 'outcome' ? (VERDICT_COLORS[node.statusLabel] ?? 'var(--muted)') : statusColor(node.statusLabel);
}

function nodeCard(ctx: Ctx, node: TraceNode): HTMLElement {
  const commits =
    node.commits.length === 0
      ? null
      : h(
          'div',
          { class: 'tr-commits' },
          ...node.commits.map((c) => h('span', { class: 'tr-commit' }, `${c.sha} · receipt`)),
        );
  return h(
    'div',
    { class: node.role === 'work-order' ? 'tr-card tr-card-wo' : 'tr-card' },
    h(
      'div',
      { class: 'tr-card-head' },
      idChip(ctx.byId, node.doc.id, ctx),
      h('span', { class: 'tr-card-title' }, displayTitle(node.doc.title)),
      h('span', { class: 'tr-status', style: `color:${statusInk(node)};` }, node.statusLabel),
    ),
    h('div', { class: 'tr-meta' }, node.meta),
    commits,
  );
}

/** The spine: type-colored node dots on a hairline, cards at each node,
    connector labels between hops, absences named in place. */
function spine(ctx: Ctx, rows: NonNullable<ReturnType<typeof traceChain>>['rows']): HTMLElement {
  const out: HTMLElement[] = [];
  rows.forEach((row, i) => {
    const lineAbove = i > 0;
    const lineBelow = i < rows.length - 1;
    if (row.kind === 'node') {
      const { node } = row;
      if (node.connector !== null) {
        out.push(
          h(
            'div',
            { class: 'tr-row' },
            h('div', { class: 'tr-rail' }, h('span', { class: 'tr-line tr-line-full' })),
            h(
              'div',
              { class: `tr-conn tr-conn-${node.connector.tone}` },
              `${node.connector.glyph} ${node.connector.label}`,
            ),
          ),
        );
      }
      out.push(
        h(
          'div',
          { class: 'tr-row' },
          h(
            'div',
            { class: 'tr-rail' },
            lineAbove ? h('span', { class: 'tr-line tr-line-top' }) : null,
            h('span', { class: 'tr-dot', style: `background:${node.role === 'work-order' ? 'var(--ember)' : TYPE_META[node.doc.type].color};margin-top:${lineAbove ? 0 : 16}px;` }),
            lineBelow ? h('span', { class: 'tr-line tr-line-grow' }) : null,
          ),
          nodeCard(ctx, node),
        ),
      );
    } else {
      out.push(
        h(
          'div',
          { class: 'tr-row' },
          h(
            'div',
            { class: 'tr-rail' },
            lineAbove ? h('span', { class: 'tr-line tr-line-top' }) : null,
            h('span', { class: 'tr-dot tr-dot-absent', style: `margin-top:${lineAbove ? 0 : 16}px;` }),
            lineBelow ? h('span', { class: 'tr-line tr-line-grow' }) : null,
          ),
          h('div', { class: 'tr-absence' }, `○ ${row.text}`),
        ),
      );
    }
  });
  return h('div', { class: 'tr-spine' }, ...out);
}

function ledgerCard(trace: NonNullable<ReturnType<typeof traceChain>>): HTMLElement {
  const rows =
    trace.stamps.length === 0
      ? [h('div', { class: 'tr-rail-empty' }, 'no stamps on record yet')]
      : trace.stamps.map((s) =>
          h(
            'div',
            { class: 'tr-ledger-row' },
            h('span', { style: `color:${s.color};` }, s.label),
            h('span', { class: 'tr-ledger-when' }, s.by === null ? s.date.slice(5) : `${s.date.slice(5)} · ${s.by}`),
          ),
        );
  return h('div', { class: 'tr-rail-card' }, h('div', { class: 'micro-label tr-rail-label' }, 'STAMPS ON THIS TURN'), ...rows);
}

function elapsedCard(trace: NonNullable<ReturnType<typeof traceChain>>): HTMLElement {
  const rows =
    trace.elapsed.length === 0
      ? [h('div', { class: 'tr-rail-empty' }, 'not enough recorded dates yet')]
      : trace.elapsed.map((leg) =>
          h(
            'div',
            { class: 'tr-ledger-row' },
            h('span', { class: 'tr-elapsed-label' }, leg.label),
            h('span', { class: 'tr-elapsed-days' }, fmtElapsed(leg.days)),
          ),
        );
  return h('div', { class: 'tr-rail-card' }, h('div', { class: 'micro-label tr-rail-label' }, 'ELAPSED'), ...rows);
}

/** The work-order detail's entry: collapsed, one "Trace this change" line;
    expanded, the spine plus the stamp ledger and elapsed rail. */
export function traceSection(ctx: Ctx, doc: VeriDocument): HTMLElement[] {
  const key = `trace:${doc.id}`;
  const open = ctx.state.expanded.has(key);
  const toggle = (): void => {
    const expanded = new Set(ctx.state.expanded);
    if (open) expanded.delete(key);
    else expanded.add(key);
    ctx.update({ expanded });
  };
  const head = h(
    'button',
    { class: 'btn-reset tr-toggle', expanded: open, fkey: 'trace-toggle', onClick: toggle },
    h('span', { class: 'tr-chev' }, open ? '▾' : '▸'),
    h('span', { class: 'tr-toggle-label' }, 'Trace this change'),
    open ? null : h('span', { class: 'tr-toggle-hint' }, 'one turn of the loop, read off the record'),
  );
  if (!open) return [h('div', { class: 'tr-section' }, head)];
  const trace = traceChain(ctx.snap.documents, doc.id);
  if (trace === null) return [h('div', { class: 'tr-section' }, head)];
  return [
    h(
      'div',
      { class: 'tr-section' },
      head,
      h(
        'div',
        { class: 'tr-cap' },
        'Who asked, what the agent produced, who approved, what reality said — as far as the record states.',
      ),
      spine(ctx, trace.rows),
      h('div', { class: 'tr-rails' }, ledgerCard(trace), elapsedCard(trace)),
    ),
  ];
}
