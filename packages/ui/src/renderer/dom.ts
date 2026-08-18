/** Tiny DOM-building helper: h('div', { class: 'card', onClick }, ...children). */

export type Child = Node | string | number | null | undefined | false;

export interface Attrs {
  class?: string;
  style?: string;
  title?: string;
  placeholder?: string;
  value?: string;
  id?: string;
  html?: never;
  draggable?: boolean;
  disabled?: boolean;
  /** Accessibility floor (SRC-019): explicit roles, states, and the stable
      focus key render() uses to restore focus across rebuilds. */
  role?: string;
  label?: string; // → aria-label
  selected?: boolean; // → aria-selected
  pressed?: boolean; // → aria-pressed
  checked?: boolean; // → aria-checked
  modal?: boolean; // → aria-modal
  expanded?: boolean; // → aria-expanded
  activedesc?: string; // → aria-activedescendant
  controls?: string; // → aria-controls
  live?: 'polite' | 'assertive'; // → aria-live
  tabindex?: number;
  fkey?: string; // → data-fkey
  src?: string; // → <img> source
  alt?: string; // → <img> alternative text
  onError?: (e: Event) => void; // e.g. a broken <img>
  onFocus?: (e: FocusEvent) => void;
  onClick?: (e: MouseEvent) => void;
  onDblclick?: (e: MouseEvent) => void;
  onMousedown?: (e: MouseEvent) => void;
  onMouseenter?: (e: MouseEvent) => void;
  onMouseleave?: (e: MouseEvent) => void;
  onDragstart?: (e: DragEvent) => void;
  onDragover?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
  onInput?: (e: Event) => void;
  onKeydown?: (e: KeyboardEvent) => void;
}

export function h(tag: string, attrs: Attrs = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  if (attrs.class !== undefined) el.className = attrs.class;
  if (attrs.style !== undefined) el.setAttribute('style', attrs.style);
  if (attrs.title !== undefined) el.title = attrs.title;
  if (attrs.id !== undefined) el.id = attrs.id;
  if (attrs.placeholder !== undefined) (el as HTMLInputElement).placeholder = attrs.placeholder;
  if (attrs.value !== undefined) (el as HTMLInputElement).value = attrs.value;
  if (attrs.draggable === true) el.draggable = true;
  if (attrs.disabled === true) (el as HTMLButtonElement).disabled = true;
  if (tag === 'button') (el as HTMLButtonElement).type = 'button';
  if (attrs.role !== undefined) el.setAttribute('role', attrs.role);
  if (attrs.label !== undefined) el.setAttribute('aria-label', attrs.label);
  if (attrs.selected !== undefined) el.setAttribute('aria-selected', String(attrs.selected));
  if (attrs.pressed !== undefined) el.setAttribute('aria-pressed', String(attrs.pressed));
  if (attrs.checked !== undefined) el.setAttribute('aria-checked', String(attrs.checked));
  if (attrs.modal !== undefined) el.setAttribute('aria-modal', String(attrs.modal));
  if (attrs.expanded !== undefined) el.setAttribute('aria-expanded', String(attrs.expanded));
  if (attrs.activedesc !== undefined) el.setAttribute('aria-activedescendant', attrs.activedesc);
  if (attrs.controls !== undefined) el.setAttribute('aria-controls', attrs.controls);
  if (attrs.live !== undefined) el.setAttribute('aria-live', attrs.live);
  if (attrs.tabindex !== undefined) el.tabIndex = attrs.tabindex;
  if (attrs.fkey !== undefined) el.dataset['fkey'] = attrs.fkey;
  if (attrs.src !== undefined) (el as HTMLImageElement).src = attrs.src;
  if (attrs.alt !== undefined) (el as HTMLImageElement).alt = attrs.alt;
  if (attrs.onError !== undefined) el.addEventListener('error', attrs.onError);
  if (attrs.onFocus !== undefined) el.addEventListener('focus', attrs.onFocus as EventListener);
  if (attrs.onClick !== undefined) el.addEventListener('click', attrs.onClick as EventListener);
  if (attrs.onDblclick !== undefined) el.addEventListener('dblclick', attrs.onDblclick as EventListener);
  if (attrs.onMousedown !== undefined) el.addEventListener('mousedown', attrs.onMousedown as EventListener);
  if (attrs.onMouseenter !== undefined) el.addEventListener('mouseenter', attrs.onMouseenter as EventListener);
  if (attrs.onMouseleave !== undefined) el.addEventListener('mouseleave', attrs.onMouseleave as EventListener);
  if (attrs.onDragstart !== undefined) el.addEventListener('dragstart', attrs.onDragstart as EventListener);
  if (attrs.onDragover !== undefined) el.addEventListener('dragover', attrs.onDragover as EventListener);
  if (attrs.onDrop !== undefined) el.addEventListener('drop', attrs.onDrop as EventListener);
  if (attrs.onInput !== undefined) el.addEventListener('input', attrs.onInput);
  if (attrs.onKeydown !== undefined) el.addEventListener('keydown', attrs.onKeydown as EventListener);
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

export function svgEl(tag: string, attrs: Record<string, string>): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
