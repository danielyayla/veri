/**
 * The Templates settings view (WO-024, SRC-009): a thin surface over the
 * `veri/templates/<type>.md` files (DEC-023) — type list with default/custom
 * chips, the CM6 body editor, the locked generated-frontmatter preview, and
 * the inline-confirm Reset to default. No guarded ranges: templates are
 * body-only markdown with no frontmatter to protect.
 */
import type { DocType } from '@verikb/core';
import { localToday } from '@verikb/core/dates';
import { h } from '../dom.ts';
import { TYPE_META } from '../theme.ts';
import type { ActiveTpl, Ctx } from '../app.ts';

/** List order per SRC-009; the renderer can't runtime-import core (DEC-021).
    Product stays off the list (WO-121): singletons are authored at fixed
    paths, not created from a template — their surfacing is design-gated. */
export const TPL_TYPES: readonly DocType[] = ['requirement', 'decision', 'work-order', 'source', 'workflow'];

const TPL_LABEL: Record<DocType, string> = {
  requirement: 'Requirement',
  decision: 'Decision',
  'work-order': 'Work order',
  source: 'Source',
  workflow: 'Workflow',
  product: 'Product',
};

const TYPE_PREFIX: Record<DocType, string> = {
  requirement: 'REQ',
  decision: 'DEC',
  'work-order': 'WO',
  source: 'SRC',
  workflow: 'WF',
  product: 'PRD',
};

const INITIAL_STATUS: Record<DocType, string> = {
  requirement: 'draft',
  decision: 'proposed',
  'work-order': 'backlog',
  source: 'imported',
  workflow: 'draft',
  product: 'draft',
};

/** The frontmatter `veri new` will generate, as the locked preview shows it —
    placeholder id/title, the type's initial status, today's dates (SRC-009). */
export function fmPreview(type: DocType, date: string): string {
  return [
    '---',
    `id: ${TYPE_PREFIX[type]}-0XX`,
    `type: ${type}`,
    'title: (your title)',
    `status: ${INITIAL_STATUS[type]}`,
    `created: ${date}`,
    `updated: ${date}`,
    '---',
  ].join('\n');
}

/** What the save-state slot shows: a notice wins, then the dirty hint. */
export function saveStateText(tpl: { dirty: boolean; notice: { text: string } | null }): string {
  return tpl.notice?.text ?? (tpl.dirty ? 'unsaved — ⌘S' : 'saved');
}

function chipEl(customized: boolean): HTMLElement {
  return h('span', { class: customized ? 'tpl-chip tpl-chip-custom' : 'tpl-chip' }, customized ? 'custom' : 'default');
}

function cardHead(ctx: Ctx, tpl: ActiveTpl): HTMLElement {
  const resetArea = ctx.state.tplResetConfirm
    ? h(
        'span',
        { class: 'tpl-reset-confirm', role: 'alertdialog', label: 'Reset template? replaces this file' },
        'Reset? replaces this file',
        h('button', { class: 'btn-reset tpl-reset-yes', label: 'Reset template', fkey: 'tpl-reset-yes', onClick: () => ctx.tplReset() }, '✓'),
        h('button', { class: 'btn-reset tpl-reset-no', label: 'Keep template', fkey: 'tpl-reset-no', onClick: () => ctx.tplSetResetConfirm(false) }, '✕'),
      )
    : tpl.customized
      ? h('button', { class: 'tpl-reset-btn', fkey: 'tpl-reset', onClick: () => ctx.tplSetResetConfirm(true) }, 'Reset to default')
      : null;
  return h(
    'div',
    { class: 'tpl-card-head' },
    h('span', { class: 'tpl-fname' }, `veri/templates/${tpl.type}.md`),
    chipEl(tpl.customized),
    h(
      'span',
      { class: 'tpl-head-right' },
      resetArea,
      tpl.dirty
        ? h(
            'button',
            {
              class: `btn-reset tpl-save tpl-save-dirty${tpl.notice?.warn === true ? ' tpl-save-warn' : ''}`,
              fkey: 'tpl-save',
              onClick: () => ctx.tplSave(),
            },
            saveStateText(tpl),
          )
        : h('span', { class: `tpl-save${tpl.notice?.warn === true ? ' tpl-save-warn' : ''}` }, saveStateText(tpl)),
    ),
  );
}

function conflictBanner(ctx: Ctx, tpl: ActiveTpl): HTMLElement | null {
  if (tpl.conflict !== 'disk-changed') return null;
  const btn = (label: string, action: 'reload' | 'keep'): HTMLElement =>
    h('button', { class: 'ed-banner-btn', fkey: `tpl-conflict:${action}`, onClick: () => ctx.tplResolveConflict(action) }, label);
  return h(
    'div',
    { class: 'ed-banner' },
    h('span', {}, '⚠ changed on disk while you were editing'),
    h('span', { class: 'ed-banner-acts' }, btn('Reload', 'reload'), btn('Keep mine', 'keep')),
  );
}

export function templatesView(ctx: Ctx): HTMLElement {
  const active = ctx.state.tplType;
  const tpl = ctx.tplView();
  const today = localToday();

  const rows = TPL_TYPES.map((type) => {
    const customized = ctx.tplChip(type);
    return h(
      'button',
      {
        class: type === active ? 'btn-reset btn-block tpl-row tpl-row-active' : 'btn-reset btn-block tpl-row',
        pressed: type === active,
        fkey: `tpl:${type}`,
        onClick: () => ctx.tplSelect(type),
      },
      h('span', { class: 'sb-swatch', style: `background:${TYPE_META[type].color};` }),
      h('span', { class: 'tpl-row-label' }, TPL_LABEL[type]),
      customized !== null ? chipEl(customized) : null,
    );
  });

  const card =
    tpl === null
      ? h('div', { class: 'tpl-card' }, h('div', { class: 'tpl-loading' }, 'loading…'))
      : h(
          'div',
          { class: 'tpl-card' },
          cardHead(ctx, tpl),
          conflictBanner(ctx, tpl),
          h(
            'div',
            { class: 'tpl-fm' },
            h('div', { class: 'tpl-fm-label' }, '⛭ generated by veri — not part of the template'),
            h('div', { class: 'tpl-fm-body' }, fmPreview(tpl.type, today)),
          ),
          h('div', { class: 'tpl-ed-host' }, tpl.dom),
        );

  return h(
    'div',
    { class: 'screen-homeview' },
    h(
      'div',
      { class: 'tpl-wrap' },
      h(
        'div',
        { class: 'tpl-head' },
        h('h1', { class: 'hv-title' }, 'Templates'),
        h('span', { class: 'tpl-path' }, 'veri/templates/'),
      ),
      h(
        'div',
        { class: 'tpl-sub' },
        'How new documents start. Edits apply to the next document created — existing documents never change.',
      ),
      h('div', { class: 'tpl-panes' }, h('div', { class: 'tpl-list' }, ...rows), card),
    ),
  );
}
