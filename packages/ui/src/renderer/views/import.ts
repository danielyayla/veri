/**
 * Import view (WO-075, SRC-039 surface 2): brownfield import — brief the
 * agent, watch filed documents land, hand off to review. Every state is
 * derived from files and links (DEC-068); nothing here is persisted.
 */
import { h } from '../dom.ts';
import { TYPE_META } from '../theme.ts';
import { compareIds } from '@veri/core/ids';
import { importGroupLabel, importKickoffPrompt, latestImportBatch } from '../derive.ts';
import type { ImportBatch } from '../derive.ts';
import type { Ctx } from '../app.ts';
import type { VeriDocument } from '@veri/core';

const SUBTITLE =
  'Your agent reads this repo — code, git history, ADRs, READMEs — and files what it finds as proposals. ' +
  'You review every one before it binds.';

const CAPTION =
  'Veri never reads your code itself. The agent works in your terminal; filed documents appear here as they land.';

function minesCard(): HTMLElement {
  const item = (glyph: string, ...children: Array<HTMLElement | string>): HTMLElement =>
    h('li', { class: 'imp-mine' }, h('span', { class: 'imp-mine-g' }, glyph), ...children);
  const chip = (text: string): HTMLElement => h('span', { class: 'gate-chip gate-chip-static' }, text);
  return h(
    'div',
    { class: 'mcp-card' },
    h('div', { class: 'mcp-eyebrow' }, 'WHAT THE AGENT MINES'),
    h(
      'div',
      { class: 'imp-mines' },
      h(
        'ul',
        { class: 'imp-mine-list' },
        h('li', { class: 'imp-mine-head' }, 'READS'),
        item('·', 'code layout'),
        item('·', 'git history'),
        item('·', 'ADRs & design docs'),
        item('·', 'READMEs'),
        item('·', 'CLAUDE.md / AGENTS.md'),
      ),
      h(
        'ul',
        { class: 'imp-mine-list' },
        h('li', { class: 'imp-mine-head' }, 'FILES'),
        item('+', 'evidence sources'),
        item('+', 'requirements ', chip('draft')),
        item('+', 'decisions ', chip('proposed')),
      ),
    ),
  );
}

/** PREFLIGHT: derived from the same static checks as the connection panel;
    one failure, one action (SRC-002). */
function preflightCard(ctx: Ctx): { el: HTMLElement; connected: boolean } {
  const status = ctx.state.mcpStatus;
  let body: HTMLElement;
  let connected = false;
  if (status === null) {
    body = h('div', { class: 'imp-pf-row' }, h('span', { class: 'imp-pf-wait' }, 'Checking the agent connection…'));
  } else if (status.state === 'ok' && status.executableFound && status.rootMatches) {
    connected = true;
    body = h(
      'div',
      { class: 'imp-pf-row' },
      h('span', { class: 'imp-pf-ok' }, '✓'),
      h('span', {}, 'Agent connection configured — config verified'),
      h('span', { class: 'imp-pf-file' }, '.mcp.json'),
    );
  } else {
    body = h(
      'div',
      { class: 'mcp-precheck' },
      h('span', { class: 'mcp-precheck-dot' }),
      h('div', { class: 'mcp-precheck-body' }, h('span', {}, 'No agent connection found for this project.')),
      h(
        'button',
        { class: 'btn-reset mcp-fail-btn', fkey: 'imp-open-panel', onClick: () => ctx.openSettings('agent') },
        'Open connection panel →',
      ),
    );
  }
  return { el: h('div', { class: 'mcp-card' }, h('div', { class: 'mcp-eyebrow' }, 'PREFLIGHT'), body), connected };
}

function kickoffCard(ctx: Ctx, connected: boolean): HTMLElement {
  const copied = ctx.state.importKickoffCopied;
  const copy = h(
    'button',
    {
      class: copied ? 'btn-reset mcp-btn-primary imp-copied' : 'btn-reset mcp-btn-primary',
      disabled: !connected,
      fkey: 'imp-copy',
      ...(connected ? { onClick: () => ctx.copyImportKickoff() } : { title: 'Connect an agent first' }),
    },
    copied ? '✓ Copied — paste into your agent' : 'Copy import kickoff',
  );
  const promptOpen = ctx.state.importPromptOpen;
  return h(
    'div',
    { class: 'mcp-card' },
    h(
      'div',
      { class: 'imp-actions' },
      copy,
      h(
        'button',
        {
          class: 'btn-reset mcp-ghost-btn',
          expanded: promptOpen,
          fkey: 'imp-show',
          onClick: () => ctx.update({ importPromptOpen: !promptOpen }),
        },
        'Show what it says',
      ),
    ),
    promptOpen ? h('div', { class: 'imp-prompt' }, importKickoffPrompt()) : null,
    h('div', { class: 'mcp-caption' }, CAPTION),
  );
}

/** FILING (state 2c): the live feed — files landing re-render this view
    through the ordinary watcher chain; there is no import state machine. */
function filingCard(ctx: Ctx, batch: ImportBatch): HTMLElement {
  const docs: VeriDocument[] = [batch.manifest, ...batch.evidence, ...batch.claims].sort(
    (a, b) => b.created.localeCompare(a.created) || compareIds(b.id, a.id),
  );
  const counts = [
    `${batch.evidence.length + 1} source${batch.evidence.length === 0 ? '' : 's'}`,
    `${batch.claims.filter((d) => d.type === 'requirement').length} requirements`,
    `${batch.claims.filter((d) => d.type === 'decision').length} decisions`,
  ].join(' · ');
  return h(
    'div',
    { class: 'mcp-card' },
    h(
      'div',
      { class: 'imp-feed-head' },
      h('div', { class: 'mcp-eyebrow imp-eyebrow-ember' }, 'FILING'),
      h('span', { class: 'imp-feed-counts' }, counts),
    ),
    h(
      'div',
      { class: 'imp-feed' },
      ...docs.map((doc) =>
        h(
          'button',
          {
            class: 'btn-reset btn-block imp-feed-row',
            fkey: `imp-feed:${doc.id}`,
            onClick: () => ctx.openDoc(doc.id, { preview: true }),
          },
          h('span', { class: 'imp-feed-dot' }),
          h('span', { class: 'imp-feed-tag' }, 'agent'),
          h('span', { class: 'hv-id', style: `color:${TYPE_META[doc.type].color};` }, doc.id),
          h('span', { class: 'imp-feed-title' }, doc.title),
          h('span', { class: 'hv-time' }, ctx.rel(doc.created)),
        ),
      ),
      h(
        'div',
        { class: 'imp-watch' },
        h('span', { class: 'imp-watch-dot' }),
        'Watching veri/ for filed documents…',
      ),
    ),
  );
}

/** Done (state 2d): the manifest receipt landed — summarize and hand off. */
function doneCard(ctx: Ctx, batch: ImportBatch): HTMLElement {
  const total = 1 + batch.evidence.length + batch.claims.length;
  const counts = [
    `${batch.evidence.length + 1} sources`,
    `${batch.claims.filter((d) => d.type === 'requirement').length} requirements`,
    `${batch.claims.filter((d) => d.type === 'decision').length} decisions`,
  ].join(' · ');
  return h(
    'div',
    { class: 'imp-done' },
    h('div', { class: 'imp-done-h' }, `✓ Import complete — ${total} documents filed`),
    h('div', { class: 'imp-done-counts' }, counts),
    h('div', { class: 'imp-done-sub' }, importGroupLabel(batch.manifest)),
    h(
      'div',
      { class: 'imp-actions' },
      h(
        'button',
        { class: 'btn-reset mcp-btn-primary', fkey: 'imp-review', onClick: () => ctx.setView('homeview') },
        'Review imported documents',
      ),
    ),
  );
}

export function importView(ctx: Ctx): HTMLElement {
  // The preflight derives from the connection panel's static checks; fetch
  // them once if this view is the first to need them.
  if (ctx.state.mcpStatus === null) void ctx.refreshMcp();
  const batch = latestImportBatch(ctx.snap);
  let cards: HTMLElement[];
  if (batch !== null && batch.complete) {
    cards = [doneCard(ctx, batch)];
  } else if (batch !== null) {
    cards = [filingCard(ctx, batch)];
  } else {
    const preflight = preflightCard(ctx);
    cards = [minesCard(), preflight.el, kickoffCard(ctx, preflight.connected)];
  }
  return h(
    'div',
    { class: 'screen-homeview' },
    h(
      'div',
      { class: 'mcp-col' },
      h('div', { class: 'imp-crumb' }, `${ctx.snap.projectName} / `, h('span', { class: 'imp-crumb-here' }, 'import')),
      h('h1', { class: 'imp-h1' }, 'Import project knowledge'),
      batch === null ? h('p', { class: 'imp-sub' }, SUBTITLE) : null,
      ...cards,
    ),
  );
}
