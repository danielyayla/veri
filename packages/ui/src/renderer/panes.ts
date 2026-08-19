/**
 * Pure pane-layer operations (WO-055, SRC-027): at most two side-by-side
 * panes, each a complete TabState, plus a focused-pane index. This layer sits
 * above the single-surface ops in tabs.ts — every per-pane mechanic (history,
 * preview, close, reorder) stays a tabs.ts concern; this module only decides
 * which pane an operation lands in, when a split collapses, and how the pair
 * persists. No DOM.
 */
import {
  EMPTY_TABS,
  activateTab,
  activeTarget,
  anyEntry,
  currentTarget,
  isViewKey,
  navigate,
  persistTabs,
  restoreTabs,
  retainTabs,
} from './tabs.ts';
import type { NavOpts, PersistedTab, TabState } from './tabs.ts';

export interface PaneState {
  /** One or two panes, left to right. Never empty; a lone pane may have
      zero tabs (the app-wide empty state), but in a split each pane always
      has at least one — emptying one collapses the split. */
  panes: TabState[];
  /** Index of the focused pane — the one that drives everything
      single-valued (sidebar highlight, crumb, editView, transients). */
  focused: number;
}

/** The boot shape: one pane, no tabs. */
export function singlePane(tabs: TabState = EMPTY_TABS): PaneState {
  return { panes: [tabs], focused: 0 };
}

export function focusedState(ps: PaneState): TabState {
  return ps.panes[ps.focused];
}

export function focusPane(ps: PaneState, idx: number): PaneState {
  return idx >= 0 && idx < ps.panes.length && idx !== ps.focused ? { panes: ps.panes, focused: idx } : ps;
}

/**
 * Replace one pane's TabState. A pane emptied while split collapses the
 * split — the survivor keeps its full state and takes focus. `focus`
 * overrides the focused index (pre-collapse numbering); it clamps to
 * whatever panes remain.
 */
export function setPane(ps: PaneState, idx: number, next: TabState, focus?: number): PaneState {
  const panes = ps.panes.map((p, i) => (i === idx ? next : p));
  let focused = focus ?? ps.focused;
  if (panes.length === 2 && next.tabs.length === 0) {
    panes.splice(idx, 1);
    focused = 0;
  }
  return { panes, focused: Math.min(Math.max(0, focused), panes.length - 1) };
}

/**
 * Navigation routed to the focused pane, with the one cross-pane rule
 * (SRC-027): view tabs are app-global singletons — a view already open in
 * the OTHER pane focuses that pane's tab instead of duplicating. Documents
 * may open in both panes. A background open of a view the other pane holds
 * is a no-op, matching navigate()'s own background-view rule.
 */
export function navigateFocused(ps: PaneState, target: string, opts: NavOpts = {}): PaneState {
  if (isViewKey(target) && ps.panes.length === 2) {
    const other = 1 - ps.focused;
    const hit = ps.panes[other].tabs.find((t) => currentTarget(t) === target);
    if (hit !== undefined) {
      if ((opts.surface ?? 'inplace') === 'background') return ps;
      return { panes: ps.panes.map((p, i) => (i === other ? activateTab(p, hit.key) : p)), focused: other };
    }
  }
  return setPane(ps, ps.focused, navigate(focusedState(ps), target, opts), ps.focused);
}

/**
 * ⌘\ "Open beside" (SRC-027): open the focused pane's current entry in the
 * other pane — creating the pane if absent — and focus it. A tab already
 * showing the target is reused; otherwise a new pinned tab opens. View
 * entries never open beside (views are singletons and this one is, by
 * definition, already open here); an empty pane has nothing to open.
 */
export function openBeside(ps: PaneState): PaneState {
  const target = activeTarget(focusedState(ps));
  if (target === null || isViewKey(target)) return ps;
  if (ps.panes.length === 1) {
    const fresh = navigate(EMPTY_TABS, target, { surface: 'inplace', previewTabs: false });
    return { panes: [ps.panes[0], fresh], focused: 1 };
  }
  const other = 1 - ps.focused;
  const pane = ps.panes[other];
  const hit = pane.tabs.find((t) => currentTarget(t) === target);
  const opened =
    hit !== undefined
      ? activateTab(pane, hit.key)
      : activateTab(navigate(pane, target, { surface: 'background' }), `t${pane.nextKey}`);
  return { panes: ps.panes.map((p, i) => (i === other ? opened : p)), focused: other };
}

/** retainTabs over both panes (every snapshot): a pane emptied by a deleted
    doc collapses the split; the focused pane keeps focus when it survives. */
export function retainPanes(ps: PaneState, exists: (id: string) => boolean): PaneState {
  const retained = ps.panes.map((p) => retainTabs(p, exists));
  if (retained.length === 2) {
    const dead = retained.findIndex((p) => p.tabs.length === 0);
    if (dead !== -1) {
      const survivor = retained[1 - dead];
      return { panes: [survivor.tabs.length > 0 ? survivor : retained[0]], focused: 0 };
    }
  }
  return { panes: retained, focused: ps.focused };
}

/** Does any tab in any pane still reference this target (buffer lifetime)? */
export function anyEntryPanes(ps: PaneState, target: string): boolean {
  return ps.panes.some((p) => anyEntry(p, target));
}

/** The persisted pair (additive over WO-054's shape): the second pane's
    list and active index exist only while split. */
export interface PersistedPanes {
  tabs: PersistedTab[];
  active: number;
  tabs2?: PersistedTab[];
  active2?: number;
}

export function persistPanes(ps: PaneState): PersistedPanes {
  const first = persistTabs(ps.panes[0]);
  if (ps.panes.length < 2) return first;
  const second = persistTabs(ps.panes[1]);
  return { ...first, tabs2: second.tabs, active2: second.active };
}

/**
 * The load-time twin: restore each pane via restoreTabs, then apply the
 * cross-pane rules — a view surviving in pane one drops from pane two
 * (singletons), and an absent or emptied second list collapses to one pane.
 * A first pane that restores empty while the second survives keeps the
 * survivor as the single pane. Focus starts on the first pane.
 */
export function restorePanes(
  tabs: PersistedTab[],
  active: number | undefined,
  tabs2: PersistedTab[] | undefined,
  active2: number | undefined,
  exists: (id: string) => boolean,
): PaneState {
  const p1 = restoreTabs(tabs, active, exists);
  if (tabs2 === undefined || tabs2.length === 0) return singlePane(p1);
  const inP1 = new Set(p1.tabs.map(currentTarget));
  const drop = (t: PersistedTab): boolean => isViewKey(t.target) && inP1.has(t.target);
  const filtered = tabs2.filter((t) => !drop(t));
  let a2 = active2;
  if (a2 !== undefined && Number.isInteger(a2) && a2 >= 0) {
    a2 -= tabs2.slice(0, Math.min(a2 + 1, tabs2.length)).filter(drop).length;
    a2 = Math.max(0, a2);
  }
  const p2 = restoreTabs(filtered, a2, exists);
  if (p2.tabs.length === 0) return singlePane(p1);
  if (p1.tabs.length === 0) return singlePane(p2);
  return { panes: [p1, p2], focused: 0 };
}

/** Divider minimum per side, px (SRC-027). */
export const PANE_MIN = 320;

/** Clamp a divider ratio so both panes keep PANE_MIN px of `width`; a
    container too narrow for two minimums pins the divider at 50/50, and a
    non-finite ratio (corrupt persistence) resets there too. */
export function clampRatio(ratio: number, width: number, min = PANE_MIN): number {
  if (!Number.isFinite(ratio) || width <= 2 * min) return 0.5;
  return Math.min(1 - min / width, Math.max(min / width, ratio));
}
