/** The edit-mode screen (WO-022, SRC-008): crumb + toggle, conflict banners,
    the CodeMirror island, and the status row — same column geometry as the
    reader, Connections panel intact. */
import type { DocType } from '@veri/core';
import { h } from '../dom.ts';
import { TYPE_META } from '../theme.ts';
import { modeToggle } from '../widgets.ts';
import { connectionsPanel } from './reader.ts';
import type { ActiveEdit, Ctx } from '../app.ts';

/** Type from the id prefix — for the crumb of a deleted doc that core no
    longer loads (the renderer can't runtime-import core; DEC-021 bundles it
    out). */
const PREFIX_TYPE: Record<string, DocType> = {
  REQ: 'requirement',
  DEC: 'decision',
  WO: 'work-order',
  SRC: 'source',
  WF: 'workflow',
};

function conflictBanner(ctx: Ctx, edit: ActiveEdit): HTMLElement | null {
  const btn = (label: string, action: 'reload' | 'keep' | 'restore' | 'closetab'): HTMLElement =>
    h('button', { class: 'ed-banner-btn', onClick: () => ctx.resolveConflict(action) }, label);
  if (edit.conflict === 'disk-changed') {
    return h(
      'div',
      { class: 'ed-banner' },
      h('span', {}, '⚠ changed on disk while you were editing'),
      h('span', { class: 'ed-banner-acts' }, btn('Reload', 'reload'), btn('Keep mine', 'keep')),
    );
  }
  if (edit.conflict === 'deleted') {
    return h(
      'div',
      { class: 'ed-banner' },
      h('span', {}, '⚠ file was deleted'),
      h('span', { class: 'ed-banner-acts' }, btn('Restore', 'restore'), btn('Close tab', 'closetab')),
    );
  }
  return null;
}

function statusRow(edit: ActiveEdit): HTMLElement {
  return h(
    'div',
    { class: 'ed-status' },
    edit.dirty ? h('span', { class: 'ed-status-dot' }) : null,
    h(
      'span',
      { class: edit.notice?.warn === true ? 'ed-status-note ed-status-warn' : 'ed-status-note' },
      edit.notice?.text ?? (edit.dirty ? 'unsaved changes' : ''),
    ),
    h('span', { class: 'ed-status-hints' }, '⌘S save · ⌘E read'),
  );
}

export function editorScreen(ctx: Ctx, edit: ActiveEdit): HTMLElement {
  const doc = ctx.byId.get(edit.id) ?? null;
  const type = doc?.type ?? PREFIX_TYPE[edit.id.split('-')[0]];
  const meta = type !== undefined ? TYPE_META[type] : null;
  return h(
    'div',
    { class: 'screen-home' },
    h(
      'div',
      { class: 'reader' },
      h(
        'div',
        { class: 'reader-col ed-col' },
        h(
          'div',
          { class: 'crumb crumb-row' },
          meta !== null
            ? type !== undefined && type !== 'workflow'
              ? h(
                  'span',
                  { class: 'crumb-live', title: `Browse ${meta.crumb.toLowerCase()}`, onClick: () => ctx.openPanel(type) },
                  meta.crumb,
                )
              : h('span', {}, meta.crumb)
            : null,
          meta !== null ? h('span', { class: 'crumb-sep' }, '/') : null,
          h('span', { style: meta !== null ? `color:${meta.color};` : undefined }, edit.id),
          // A deleted file has no read mode to show; the banner is the exit.
          doc !== null ? modeToggle(ctx, edit.id) : null,
        ),
        conflictBanner(ctx, edit),
        h('div', { class: 'ed-host' }, edit.dom),
        statusRow(edit),
      ),
    ),
    doc !== null ? connectionsPanel(ctx) : null,
  );
}
