/** Shared view fragments: id chips, markdown block rendering, activity feed. */
import type { VeriDocument } from '@veri/core';
import { h } from './dom.ts';
import type { Child } from './dom.ts';
import { TYPE_META, statusColor, tint } from './theme.ts';
import { parseBlocks } from './markdown.ts';
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
  const btn = h(
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
  // Hover preview (WO-047, SRC-021). Broken chips returned above — nothing to preview.
  attachPreview(btn, byId, id, nav);
  return btn;
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

/** Document titles for display (WO-064, SRC-034): bind a spaced em-dash to
    the word before it, so a narrow pane never wraps a line down to a lone
    "—". Presentation only — the stored title is untouched. */
export function displayTitle(title: string): string {
  return title.replace(/ — /g, '\u00A0— ');
}

export function statusChip(status: string): HTMLElement {
  const color = statusColor(status);
  return h('span', { class: 'chip-status', style: `color:${color};background:${tint(color)};` }, status);
}

export function typeChip(type: VeriDocument['type']): HTMLElement {
  const meta = TYPE_META[type];
  return h('span', { class: 'chip-status', style: `color:${meta.color};background:${tint(meta.color)};` }, meta.label);
}

/** A ref inside the preview excerpt (SRC-021): inert colored text, not a chip
    — a preview previews one hop, it does not become a navigation surface. */
function inertRef(byId: DocsById, id: string): Child {
  const target = byId.get(id);
  if (target === undefined) return document.createTextNode(`[[${id}]]`);
  return h('span', { class: 'pv-ref', style: `color:${TYPE_META[target.type].color};` }, id);
}

export function renderSegs(segs: Seg[], byId: DocsById, nav: Nav, opts: { inertRefs?: boolean } = {}): Child[] {
  return segs.map((seg): Child => {
    if (seg.kind === 'ref') return opts.inertRefs === true ? inertRef(byId, seg.id) : idChip(byId, seg.id, nav);
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
  opts: { muted?: boolean; imgDir?: string; inertRefs?: boolean } = {},
): HTMLElement[] {
  const segOpts = { inertRefs: opts.inertRefs };
  const out: HTMLElement[] = [];
  for (const block of blocks) {
    if (block.kind === 'heading') {
      out.push(h('h2', { class: 'rd-h2' }, block.text));
    } else if (block.kind === 'para') {
      out.push(h('p', { class: opts.muted === true ? 'rd-p rd-p-muted' : 'rd-p' }, ...renderSegs(block.segs, byId, nav, segOpts)));
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
            h('thead', {}, h('tr', {}, ...block.header.map((c) => h('th', {}, ...renderSegs(c, byId, nav, segOpts))))),
            h('tbody', {}, ...block.rows.map((r) => h('tr', {}, ...r.map((c) => h('td', {}, ...renderSegs(c, byId, nav, segOpts)))))),
          ),
        ),
      );
    } else if (block.kind === 'quote') {
      out.push(h('blockquote', { class: 'rd-quote' }, ...renderSegs(block.segs, byId, nav, segOpts)));
    } else if (block.kind === 'img') {
      out.push(imageBlock(block.alt, block.src, opts.imgDir));
    } else if (block.kind === 'check') {
      out.push(
        h(
          'div',
          { class: 'rd-check' },
          h('span', { class: block.done ? 'rd-box rd-box-done' : 'rd-box' }, block.done ? '✓' : ''),
          h('span', { class: block.done ? 'rd-check-text rd-check-done' : 'rd-check-text' }, ...renderSegs(block.segs, byId, nav, segOpts)),
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
          h('span', {}, ...renderSegs(block.segs, byId, nav, segOpts)),
        ),
      );
    }
  }
  return out;
}

export function activityFeed(rows: ActivityRow[]): HTMLElement {
  const list = rows.length > 0 ? rows : [{ agent: false, text: 'No activity yet', time: '' }];
  const rowEl = (a: ActivityRow): HTMLElement => {
    // Session rows are in-memory only (WO-062): a hollow dot plus a mono tag
    // mark them apart from file-derived rows — shape and text, not color alone.
    const dot =
      a.session === true
        ? h('span', { class: 'act-dot act-dot-session', style: `border-color:${a.agent ? 'var(--ember)' : 'var(--hover-border-2)'};` })
        : h('span', { class: 'act-dot', style: `background:${a.agent ? 'var(--ember)' : 'var(--hover-border-2)'};` });
    return h(
      'div',
      { class: 'act-row', title: a.session === true ? 'This session only — not written to the file' : undefined },
      dot,
      a.agent ? h('span', { class: 'act-agent' }, 'agent') : null,
      a.session === true ? h('span', { class: 'act-session' }, 'session') : null,
      h('span', { class: 'act-text' }, a.text),
      h('span', { class: 'act-time' }, a.time),
    );
  };
  // A lone "Last edited" (or nothing at all) doesn't earn a labeled section —
  // one quiet line (WO-062, SRC-033).
  if (rows.length <= 1 && rows.every((r) => r.session !== true)) {
    return h('div', { class: 'act act-solo' }, ...list.map(rowEl));
  }
  return h('div', { class: 'act' }, h('div', { class: 'micro-label' }, 'ACTIVITY'), ...list.map(rowEl));
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

/* ===== Hover previews on link chips (WO-047, SRC-021) =====
   One popover globally, attached wherever idChip renders. The trigger timing
   is a pure state machine (testable without a DOM); the singleton below is
   the thin DOM shell around it. */

/** In: a pause, not a pass-through — trails of chips must not strobe. */
export const PREVIEW_IN_MS = 350;
/** Out: counted after the pointer has left chip and popover both. */
export const PREVIEW_OUT_MS = 150;

export type PreviewEvent =
  | { kind: 'enter-chip'; id: string; now: number } // pointer enters or focus lands on a chip
  | { kind: 'leave-chip'; now: number } // pointer leaves / chip blurs
  | { kind: 'enter-pop'; now: number } // pointer enters the open popover
  | { kind: 'leave-pop'; now: number }
  | { kind: 'tick'; now: number } // a scheduled deadline fired
  | { kind: 'dismiss' }; // Escape, scroll, click, tab-switch — immediate

export interface PreviewState {
  /** The doc whose popover is showing, or null. */
  openId: string | null;
  /** A chip under the pointer/focus, waiting out the 350ms. */
  pendingId: string | null;
  /** Deadline for opening pendingId. */
  openAt: number | null;
  /** Deadline for closing openId. */
  closeAt: number | null;
}

export const PREVIEW_IDLE: PreviewState = { openId: null, pendingId: null, openAt: null, closeAt: null };

export function previewStep(state: PreviewState, ev: PreviewEvent): PreviewState {
  switch (ev.kind) {
    case 'enter-chip':
      // Re-entering the open popover's own chip just cancels the close;
      // entering any other chip starts its uninterrupted-hover clock.
      if (ev.id === state.openId) return { ...state, pendingId: null, openAt: null, closeAt: null };
      return { ...state, pendingId: ev.id, openAt: ev.now + PREVIEW_IN_MS };
    case 'leave-chip':
      return {
        ...state,
        pendingId: null,
        openAt: null,
        closeAt: state.openId !== null ? ev.now + PREVIEW_OUT_MS : state.closeAt,
      };
    case 'enter-pop':
      // Hoverable to finish reading a clipped line — but never pinned.
      return { ...state, closeAt: null };
    case 'leave-pop':
      return state.openId !== null ? { ...state, closeAt: ev.now + PREVIEW_OUT_MS } : state;
    case 'tick': {
      let next = state;
      if (next.closeAt !== null && ev.now >= next.closeAt) next = { ...next, openId: null, closeAt: null };
      if (next.openAt !== null && ev.now >= next.openAt) {
        // Opening one popover closes the last: openId is simply replaced.
        next = { openId: next.pendingId, pendingId: null, openAt: null, closeAt: null };
      }
      return next;
    }
    case 'dismiss':
      return PREVIEW_IDLE;
  }
}

/** The next moment previewStep needs a tick, or null when nothing is scheduled. */
export function previewDeadline(state: PreviewState): number | null {
  if (state.openAt !== null && state.closeAt !== null) return Math.min(state.openAt, state.closeAt);
  return state.openAt ?? state.closeAt;
}

/** The excerpt: the body's first two blocks, first section only (before any
    ## heading) — SRC-021. */
export function excerptBlocks(body: string): Block[] {
  const out: Block[] = [];
  for (const block of parseBlocks(body)) {
    if (block.kind === 'heading') break;
    out.push(block);
    if (out.length === 2) break;
  }
  return out;
}

export interface PreviewContent {
  id: string;
  type: VeriDocument['type'];
  status: string;
  title: string;
  blocks: Block[];
}

/** What the popover shows, assembled from the target document. */
export function previewContent(doc: VeriDocument): PreviewContent {
  return { id: doc.id, type: doc.type, status: doc.status, title: doc.title, blocks: excerptBlocks(doc.body) };
}

// ---- The DOM singleton ----

interface PreviewAnchor {
  el: HTMLElement;
  doc: VeriDocument;
  byId: DocsById;
  nav: Nav;
}

let pvState: PreviewState = PREVIEW_IDLE;
let pvTimer: ReturnType<typeof setTimeout> | null = null;
/** The chip last entered — the anchor pendingId/openId refers to. */
let pvAnchor: PreviewAnchor | null = null;
let pvEl: HTMLElement | null = null;
let pvShownId: string | null = null;
let pvListeners = false;
/** Project root for resolving excerpt images; set by the app shell. */
let pvRoot: string | null = null;

export function setPreviewRoot(root: string): void {
  pvRoot = root;
}

/** Immediate teardown: Escape, scroll, click, tab-switch, every re-render. */
export function dismissPreview(): void {
  pvDispatch({ kind: 'dismiss' });
}

function pvDispatch(ev: PreviewEvent): void {
  pvState = previewStep(pvState, ev);
  syncPreview();
}

function syncPreview(): void {
  if (pvState.openId === null) {
    if (pvEl !== null) removePopover();
  } else if (pvState.openId !== pvShownId) {
    if (pvAnchor !== null && pvAnchor.doc.id === pvState.openId && pvAnchor.el.isConnected) {
      showPopover(pvAnchor);
    } else {
      // The anchor was rebuilt out from under the timer — nothing to point at.
      pvState = PREVIEW_IDLE;
      removePopover();
    }
  }
  if (pvTimer !== null) clearTimeout(pvTimer);
  pvTimer = null;
  const deadline = previewDeadline(pvState);
  if (deadline !== null) {
    pvTimer = setTimeout(() => pvDispatch({ kind: 'tick', now: Date.now() }), Math.max(0, deadline - Date.now()));
  }
}

function removePopover(): void {
  pvEl?.remove();
  pvEl = null;
  pvShownId = null;
}

function showPopover(anchor: PreviewAnchor): void {
  removePopover();
  const content = previewContent(anchor.doc);
  const meta = TYPE_META[content.type];
  const imgDir = pvRoot !== null ? imgDirFor(pvRoot, anchor.doc.file) : undefined;
  const excerpt =
    content.blocks.length === 0
      ? null
      : h(
          'div',
          { class: 'pv-excerpt' },
          ...renderBlocks(content.blocks, anchor.byId, anchor.nav, { muted: true, inertRefs: true, imgDir }),
        );
  const pop = h(
    'div',
    {
      class: 'pv-pop',
      onMouseenter: () => pvDispatch({ kind: 'enter-pop', now: Date.now() }),
      onMouseleave: () => pvDispatch({ kind: 'leave-pop', now: Date.now() }),
    },
    h(
      'div',
      { class: 'pv-head' },
      h('span', { class: 'pv-id', style: `color:${meta.color};` }, content.id),
      typeChip(content.type),
      statusChip(content.status),
    ),
    h('div', { class: 'pv-title' }, content.title),
    excerpt,
  );
  // Presentation only (SRC-021): screen readers already get the full target
  // via the chip's label; the popover never takes focus, never traps it.
  pop.setAttribute('aria-hidden', 'true');
  document.body.append(pop);
  pvEl = pop;
  pvShownId = content.id;

  // Below the chip, flipped above at viewport clip, never overlapping it.
  const rect = anchor.el.getBoundingClientRect();
  const width = pop.offsetWidth;
  const height = pop.offsetHeight;
  const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
  let top = rect.bottom + 6;
  if (top + height > window.innerHeight - 8) top = rect.top - 6 - height;
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
  // The ~6-line fade only when the excerpt actually clipped.
  if (excerpt !== null && excerpt.scrollHeight > excerpt.clientHeight + 1) excerpt.classList.add('pv-clip');
}

function ensurePreviewListeners(): void {
  if (pvListeners) return;
  pvListeners = true;
  // Scroll and click dismiss immediately (capture: scroll doesn't bubble).
  document.addEventListener('scroll', () => dismissPreview(), { capture: true, passive: true });
  document.addEventListener('mousedown', () => dismissPreview(), true);
  // Escape closes the topmost layer (SRC-019): with a preview open, that is
  // the preview — swallow the key and keep focus exactly where it is.
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Escape') return;
      if (pvState.openId !== null) {
        // Visible popover: swallow the key so it closes only this layer.
        dismissPreview();
        e.stopPropagation();
      } else if (pvState.pendingId !== null) {
        // Nothing visible yet: cancel the pending open, let Escape act normally.
        dismissPreview();
      }
    },
    true,
  );
}

/** Wire a chip (or a Connections card, on its id only) to the shared popover.
    Hover and keyboard focus follow the same 350ms-in / 150ms-out clock. */
export function attachPreview(
  el: HTMLElement,
  byId: DocsById,
  id: string,
  nav: Nav,
  opts: { hover?: boolean; focus?: boolean } = {},
): void {
  const doc = byId.get(id);
  if (doc === undefined) return; // broken link — nothing to preview
  ensurePreviewListeners();
  const enter = (): void => {
    pvAnchor = { el, doc, byId, nav };
    pvDispatch({ kind: 'enter-chip', id, now: Date.now() });
  };
  const leave = (): void => pvDispatch({ kind: 'leave-chip', now: Date.now() });
  if (opts.hover !== false) {
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
  }
  if (opts.focus !== false) {
    el.addEventListener('focus', enter);
    el.addEventListener('blur', leave);
  }
}
