/**
 * Find in document (WO-057, SRC-029) — the DOM half. The one bar component
 * (the .pv-pop shadow register, existing tokens), the rendered-text walk
 * that feeds findlogic's segment matcher, and highlight painting via the
 * CSS Custom Highlights API — ranges over the existing text nodes, zero DOM
 * mutation, so chips, previews, and their listeners stay untouched. All
 * decisions (what matches, which index is current) live in findlogic.ts;
 * this file only reads and paints.
 */
import { h } from './dom.ts';
import { countLabel } from './findlogic.ts';
import type { FindPart, SegMatch } from './findlogic.ts';

/** The registry names ::highlight() rules in styles.css bind to. */
const FIND_ALL = 'veri-find';
const FIND_CURRENT = 'veri-find-current';

/** Elements that break text flow for matching: a match never crosses from
    one of these into a sibling. Inline markup (strong, links, chips) does
    not break — "foo **bar**" still finds "foo bar". */
const BLOCK_TAGS = new Set([
  'P', 'DIV', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE',
  'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'SECTION',
  'ARTICLE', 'BUTTON', 'INPUT', 'TEXTAREA',
]);

function blockAncestor(node: Text, root: Element): Element {
  let el = node.parentElement;
  while (el !== null && el !== root && !BLOCK_TAGS.has(el.tagName)) el = el.parentElement;
  return el ?? root;
}

export interface DomParts {
  /** The live text nodes, aligned 1:1 with `parts`. */
  nodes: Text[];
  parts: FindPart[];
}

/** Collect the rendered content's text nodes in document order. Works on a
    detached tree too — render() walks the freshly built pane before it is
    attached, and the ranges stay valid because they hold the same nodes. */
export function collectParts(root: Element): DomParts {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  const parts: FindPart[] = [];
  let prevBlock: Element | null = null;
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    const t = n as Text;
    if (t.data.length === 0) continue;
    const block = blockAncestor(t, root);
    parts.push({ text: t.data, breakBefore: prevBlock !== null && block !== prevBlock });
    nodes.push(t);
    prevBlock = block;
  }
  return { nodes, parts };
}

function matchRange(nodes: readonly Text[], m: SegMatch): Range {
  const r = new Range();
  r.setStart(nodes[m.start.seg], m.start.off);
  r.setEnd(nodes[m.end.seg], m.end.off);
  return r;
}

/** Paint every match, the current one under its own stronger highlight.
    Idempotent: each call replaces both registry entries wholesale. */
export function paintFind(nodes: readonly Text[], matches: readonly SegMatch[], current: number): void {
  if (typeof CSS === 'undefined' || CSS.highlights === undefined) return;
  const all = new Highlight();
  const cur = new Highlight();
  matches.forEach((m, i) => (i === current ? cur : all).add(matchRange(nodes, m)));
  CSS.highlights.set(FIND_ALL, all);
  CSS.highlights.set(FIND_CURRENT, cur);
}

export function clearFind(): void {
  if (typeof CSS === 'undefined' || CSS.highlights === undefined) return;
  CSS.highlights.delete(FIND_ALL);
  CSS.highlights.delete(FIND_CURRENT);
}

/** Scroll the pane's own scroll container (SRC-029: respect the pane, not
    the window) so the current match sits comfortably in view. */
export function scrollFindMatch(nodes: readonly Text[], m: SegMatch): void {
  const scroller = nodes[m.start.seg]?.parentElement?.closest('.reader');
  if (scroller == null) return;
  const rect = matchRange(nodes, m).getBoundingClientRect();
  const box = scroller.getBoundingClientRect();
  if (rect.top < box.top + 40 || rect.bottom > box.bottom - 40) {
    scroller.scrollTop += rect.top - (box.top + box.height / 2);
  }
}

export interface FindBarProps {
  query: string;
  current: number;
  total: number;
  /** One-shot: focus the input (and select its text) after this build. */
  focus: boolean;
  onQuery(q: string): void;
  onStep(dir: 1 | -1): void;
  onClose(): void;
}

/** Live handles for in-place updates: typing and stepping patch the count
    and buttons directly instead of re-rendering, so the input keeps its
    caret and the editor island its scroll. */
export interface FindBarRefs {
  input: HTMLInputElement;
  count: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
}

export function updateFindBar(refs: FindBarRefs, current: number, total: number): void {
  refs.count.textContent = countLabel(current, total);
  refs.prev.disabled = total === 0;
  refs.next.disabled = total === 0;
}

/** The bar: labeled input, `3/17`, real ‹ › buttons (disabled at 0/0), ×.
    Enter/Shift+Enter cycle with wrap; Escape reaches the shell's layer
    stack, where the bar registers as the topmost transient. */
export function findBarEl(props: FindBarProps): { el: HTMLElement; refs: FindBarRefs } {
  const input = h('input', {
    class: 'fb-input',
    label: 'Find in document',
    placeholder: 'Find…',
    value: props.query,
    fkey: 'fb-input',
    onInput: (e) => props.onQuery((e.target as HTMLInputElement).value),
    onKeydown: (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        props.onStep(e.shiftKey ? -1 : 1);
      }
    },
  }) as HTMLInputElement;
  input.spellcheck = false;
  if (props.focus) {
    queueMicrotask(() => {
      input.focus();
      input.select();
    });
  }
  const count = h('span', { class: 'fb-count', live: 'polite' }, countLabel(props.current, props.total));
  const navBtn = (glyph: string, label: string, fkey: string, dir: 1 | -1): HTMLButtonElement =>
    h(
      'button',
      { class: 'btn-reset fb-nav', label, title: label, fkey, disabled: props.total === 0, onClick: () => props.onStep(dir) },
      glyph,
    ) as HTMLButtonElement;
  const prev = navBtn('‹', 'Previous match', 'fb-prev', -1);
  const next = navBtn('›', 'Next match', 'fb-next', 1);
  const el = h(
    'div',
    { class: 'fb-bar', role: 'search', label: 'Find in document' },
    input,
    count,
    prev,
    next,
    h(
      'button',
      { class: 'btn-reset fb-close', label: 'Close find', title: 'Close find — Esc', fkey: 'fb-close', onClick: () => props.onClose() },
      '×',
    ),
  );
  return { el, refs: { input, count, prev, next } };
}
