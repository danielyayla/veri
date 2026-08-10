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
  onClick?: (e: MouseEvent) => void;
  onDblclick?: (e: MouseEvent) => void;
  onMousedown?: (e: MouseEvent) => void;
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
  if (attrs.onClick !== undefined) el.addEventListener('click', attrs.onClick as EventListener);
  if (attrs.onDblclick !== undefined) el.addEventListener('dblclick', attrs.onDblclick as EventListener);
  if (attrs.onMousedown !== undefined) el.addEventListener('mousedown', attrs.onMousedown as EventListener);
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
