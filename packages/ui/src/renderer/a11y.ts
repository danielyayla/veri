/**
 * Accessibility floor (WO-043, SRC-019). Pure — no DOM.
 *
 * The renderer rebuilds its tree with replaceChildren on every update, so
 * keyboard focus must be captured before the rebuild and restored after,
 * exactly like scroll. Elements carry a stable identity-derived `data-fkey`;
 * the logic that decides where focus lands lives here so it is testable.
 */

/** Everything render() treats as focusable when walking a subtree in order. */
export const FOCUSABLE_SEL =
  'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Where focus should land after a rebuild. `prev`/`next` are the DOM-order
 * fkey lists before and after; `captured` is the fkey that held focus.
 * Exact survivor wins; otherwise the nearest old-order neighbour that still
 * exists (following siblings first, then preceding); null when nothing
 * survives — the caller leaves focus alone rather than sending it to <body>.
 */
export function resolveFocus(prev: string[], next: string[], captured: string): string | null {
  if (next.includes(captured)) return captured;
  const at = prev.indexOf(captured);
  if (at === -1) return null;
  for (let i = at + 1; i < prev.length; i++) if (next.includes(prev[i])) return prev[i];
  for (let i = at - 1; i >= 0; i--) if (next.includes(prev[i])) return prev[i];
  return null;
}

/**
 * Tab / Shift-Tab inside a trapping layer: cycle through the layer's
 * focusables (DOM-order fkeys) with wrap. Focus outside the list re-enters
 * at the edge the direction implies.
 */
export function trapTarget(order: string[], current: string | null, backward: boolean): string | null {
  if (order.length === 0) return null;
  const at = current === null ? -1 : order.indexOf(current);
  if (at === -1) return backward ? order[order.length - 1] : order[0];
  return order[(at + (backward ? -1 : 1) + order.length) % order.length];
}

/**
 * Roving tabindex for tablist / radiogroup: which index holds tabindex=0
 * and receives focus after an arrow key. Wraps; Home/End jump.
 */
export function roveIndex(len: number, current: number, key: 'prev' | 'next' | 'home' | 'end'): number {
  if (len === 0) return -1;
  if (key === 'home') return 0;
  if (key === 'end') return len - 1;
  const at = current < 0 || current >= len ? 0 : current;
  return (at + (key === 'next' ? 1 : -1) + len) % len;
}

/** Map a KeyboardEvent.key to a roving move, or null if it isn't one. */
export function roveKey(key: string): 'prev' | 'next' | 'home' | 'end' | null {
  if (key === 'ArrowLeft' || key === 'ArrowUp') return 'prev';
  if (key === 'ArrowRight' || key === 'ArrowDown') return 'next';
  if (key === 'Home') return 'home';
  if (key === 'End') return 'end';
  return null;
}
