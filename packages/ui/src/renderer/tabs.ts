/**
 * Pure tab-state operations. A tab is a history surface (WO-039, SRC-018):
 * a stable key plus an entry stack and an index — the strip renders the
 * current entry. Plain link clicks navigate the active tab in place
 * (superseding SRC-004's spawn-a-pinned-tab rule); browsing surfaces still
 * share the single preview tab; ⌘-click still opens a background pinned
 * tab. No DOM — the app shell owns rendering and derives view/doc from the
 * active tab's current entry.
 */

/** View tabs alongside document tabs; targets are doc ids or these keys.
    'graph' is retired (WO-052, SRC-024): the graph lives on the document
    surface now. 'architecture' retired with the layer (DEC-144, SRC-067).
    'board' and 'outcomes' folded into Home (DEC-145, SRC-068): the Work
    Orders panel and the detail's status control carry the lifecycle, and
    Home carries outcome evidence and untested bets. Persisted retired-view
    tabs restore away via restoreTabs — a stale session lands on Home,
    silently. */
export type ViewKey = 'homeview' | 'gates' | 'search' | 'settings' | 'import';

export const VIEW_META: Record<ViewKey, { label: string; glyph: string }> = {
  homeview: { label: 'Home', glyph: '⌂' },
  // Gate Queue (WO-162, SRC-076): the approval pass as a first-class view.
  gates: { label: 'Gates', glyph: '▦' },
  // The palette's thorough sibling (WO-048, SRC-022): one query, every hit.
  search: { label: 'Search', glyph: '⌕' },
  // One Settings tab hosts Templates and Agent connection too (WO-036).
  settings: { label: 'Settings', glyph: '⚙' },
  // Brownfield import (WO-075, SRC-039): kickoff, live filing, done.
  import: { label: 'Import', glyph: '⇲' },
};

export function isViewKey(id: string): id is ViewKey {
  return id in VIEW_META;
}

/** One history entry: what the tab showed, and where it was scrolled to
    (one position per scrollable region, captured by the shell on leave). */
export interface Entry {
  target: string;
  scroll: number[];
}

export interface Tab {
  /** Stable identity — never the target, which changes as the tab navigates. */
  key: string;
  preview: boolean;
  entries: Entry[];
  index: number;
}

export interface TabState {
  tabs: Tab[];
  activeKey: string | null;
  /** Key allocator — ops are pure, so the counter travels with the state. */
  nextKey: number;
}

export const EMPTY_TABS: TabState = { tabs: [], activeKey: null, nextKey: 1 };

/** Which surface a navigation came from (SRC-018 gesture table). */
export type Surface = 'inplace' | 'preview' | 'background';

export interface NavOpts {
  surface?: Surface;
  /** The SRC-004 settings flag — false disables preview semantics. */
  previewTabs?: boolean;
}

const HISTORY_CAP = 50;

export function currentTarget(tab: Tab): string {
  return tab.entries[tab.index].target;
}

export function activeTab(state: TabState): Tab | null {
  return state.tabs.find((t) => t.key === state.activeKey) ?? null;
}

export function activeTarget(state: TabState): string | null {
  const tab = activeTab(state);
  return tab === null ? null : currentTarget(tab);
}

/** Does any tab's history still reference this target (dirty-buffer guard)? */
export function anyEntry(state: TabState, target: string): boolean {
  return state.tabs.some((t) => t.entries.some((e) => e.target === target));
}

/** Push browser-style: truncate forward, skip a no-op, cap the stack.
    Earlier entry objects are reused so scroll captured by reference holds. */
function pushInto(tab: Tab, target: string): Tab {
  if (currentTarget(tab) === target) return tab;
  const entries = tab.entries.slice(0, tab.index + 1);
  entries.push({ target, scroll: [] });
  const trimmed = entries.length > HISTORY_CAP ? entries.slice(entries.length - HISTORY_CAP) : entries;
  return { ...tab, entries: trimmed, index: trimmed.length - 1 };
}

function freshTab(state: TabState, target: string, preview: boolean): { tab: Tab; nextKey: number } {
  return {
    tab: { key: `t${state.nextKey}`, preview, entries: [{ target, scroll: [] }], index: 0 },
    nextKey: state.nextKey + 1,
  };
}

/** New tab immediately after the active one (SRC-004 placement). */
function insertAfterActive(state: TabState, tab: Tab, nextKey: number, focus: boolean): TabState {
  const tabs = state.tabs.slice();
  const i = tabs.findIndex((t) => t.key === state.activeKey);
  tabs.splice(i < 0 ? tabs.length : i + 1, 0, tab);
  return { tabs, activeKey: focus || state.activeKey === null ? tab.key : state.activeKey, nextKey };
}

function replaceTab(state: TabState, tab: Tab, focus: boolean): TabState {
  return {
    tabs: state.tabs.map((t) => (t.key === tab.key ? tab : t)),
    activeKey: focus ? tab.key : state.activeKey,
    nextKey: state.nextKey,
  };
}

/**
 * The one navigation op (SRC-018): `inplace` pushes onto the active tab,
 * `preview` pushes onto the shared preview tab (creating it if none),
 * `background` opens a new pinned tab without focus. View targets are
 * singletons — a tab already showing one is focused instead.
 */
export function navigate(state: TabState, target: string, opts: NavOpts = {}): TabState {
  const surface = opts.surface ?? 'inplace';
  const previewTabs = opts.previewTabs ?? true;
  if (isViewKey(target)) {
    const hit = state.tabs.find((t) => currentTarget(t) === target);
    if (hit !== undefined) {
      return surface === 'background' ? state : { ...state, tabs: state.tabs.slice(), activeKey: hit.key };
    }
  }
  if (surface === 'background') {
    const { tab, nextKey } = freshTab(state, target, false);
    return insertAfterActive(state, tab, nextKey, false);
  }
  if (surface === 'preview') {
    if (!previewTabs) {
      const { tab, nextKey } = freshTab(state, target, false);
      return insertAfterActive(state, tab, nextKey, true);
    }
    const pv = state.tabs.find((t) => t.preview);
    if (pv !== undefined) return replaceTab(state, pushInto(pv, target), true);
    const { tab, nextKey } = freshTab(state, target, true);
    return insertAfterActive(state, tab, nextKey, true);
  }
  const act = activeTab(state);
  if (act === null) {
    const { tab, nextKey } = freshTab(state, target, previewTabs);
    return insertAfterActive(state, tab, nextKey, true);
  }
  return replaceTab(state, pushInto(act, target), true);
}

/** ⌘[ — step the active tab back through its history. */
export function back(state: TabState): TabState {
  const act = activeTab(state);
  if (act === null || act.index === 0) return state;
  return replaceTab(state, { ...act, index: act.index - 1 }, false);
}

/** ⌘] — step the active tab forward. */
export function forward(state: TabState): TabState {
  const act = activeTab(state);
  if (act === null || act.index >= act.entries.length - 1) return state;
  return replaceTab(state, { ...act, index: act.index + 1 }, false);
}

/** Rule 5: closing the active tab activates the right neighbor, else the left. */
export function closeTab(state: TabState, key: string): TabState {
  const i = state.tabs.findIndex((t) => t.key === key);
  if (i < 0) return state;
  const tabs = state.tabs.slice();
  tabs.splice(i, 1);
  const activeKey =
    state.activeKey === key ? (tabs.length > 0 ? tabs[Math.min(i, tabs.length - 1)].key : null) : state.activeKey;
  return { tabs, activeKey, nextKey: state.nextKey };
}

export function pinTab(state: TabState, key: string): TabState {
  return {
    tabs: state.tabs.map((t) => (t.key === key ? { ...t, preview: false } : t)),
    activeKey: state.activeKey,
    nextKey: state.nextKey,
  };
}

export function activateTab(state: TabState, key: string): TabState {
  return state.tabs.some((t) => t.key === key)
    ? { tabs: state.tabs.slice(), activeKey: key, nextKey: state.nextKey }
    : state;
}

/** Rule 6: live reorder while dragging over sibling tabs. */
export function reorderTab(state: TabState, from: number, to: number): TabState {
  if (from === to || from < 0 || to < 0 || from >= state.tabs.length || to >= state.tabs.length) return state;
  const tabs = state.tabs.slice();
  const [moved] = tabs.splice(from, 1);
  tabs.splice(to, 0, moved);
  return { tabs, activeKey: state.activeKey, nextKey: state.nextKey };
}

/** ⌃Tab / ⌃⇧Tab: cycle through the strip in order, wrapping. */
export function cycleTab(state: TabState, dir: 1 | -1): TabState {
  if (state.tabs.length === 0) return state;
  const i = state.tabs.findIndex((t) => t.key === state.activeKey);
  const next = ((i < 0 ? 0 : i) + dir + state.tabs.length) % state.tabs.length;
  return { tabs: state.tabs.slice(), activeKey: state.tabs[next].key, nextKey: state.nextKey };
}

/** The persisted shape of one tab (WO-054, SRC-026): its *current* target
    and its preview flag, nothing else — history stays session-only per
    SRC-018, so the stack is never written. */
export interface PersistedTab {
  target: string;
  preview: boolean;
}

/** Serialize the open set for the DEC-014 workspace file (SRC-026): one
    current target per tab, the active tab as an index into that list. */
export function persistTabs(state: TabState): { tabs: PersistedTab[]; active: number } {
  const active = state.tabs.findIndex((t) => t.key === state.activeKey);
  return {
    tabs: state.tabs.map((t) => ({ target: currentTarget(t), preview: t.preview })),
    active: Math.max(0, active),
  };
}

/**
 * The load-time twin of retainTabs (SRC-026): rebuild a TabState from
 * persisted targets. Unresolvable targets are dropped — byId misses and
 * retired ViewKeys ('graph', 'decisions', 'architecture', 'board',
 * 'outcomes' fail isViewKey now);
 * duplicate views collapse to their first tab (views are singletons); at
 * most one tab keeps the preview flag; every survivor starts with a
 * single-entry history; the active index moves to the nearest earlier
 * survivor and clamps. Nothing survives → EMPTY_TABS, and the caller
 * falls back to the single Home tab.
 */
export function restoreTabs(
  persisted: PersistedTab[],
  active: number | undefined,
  exists: (id: string) => boolean,
): TabState {
  const seenViews = new Set<string>();
  const kept = persisted.map((p) => {
    if (isViewKey(p.target)) {
      if (seenViews.has(p.target)) return false;
      seenViews.add(p.target);
      return true;
    }
    return exists(p.target);
  });
  let hasPreview = false;
  const tabs: Tab[] = [];
  persisted.forEach((p, i) => {
    if (!kept[i]) return;
    const preview = p.preview && !hasPreview;
    hasPreview = hasPreview || preview;
    tabs.push({ key: `t${tabs.length + 1}`, preview, entries: [{ target: p.target, scroll: [] }], index: 0 });
  });
  if (tabs.length === 0) return EMPTY_TABS;
  const a = active !== undefined && Number.isInteger(active) && active >= 0 ? active : 0;
  const survivorsBefore = kept.slice(0, a + 1).filter(Boolean).length;
  const idx = Math.min(Math.max(0, survivorsBefore - 1), tabs.length - 1);
  return { tabs, activeKey: tabs[idx].key, nextKey: tabs.length + 1 };
}

/**
 * Drop history entries whose backing doc disappeared (views always survive);
 * the index moves to the nearest earlier survivor. A tab left with nothing
 * closes like a × click (SRC-018 history rule 6).
 */
export function retainTabs(state: TabState, exists: (id: string) => boolean): TabState {
  let out = state;
  for (const tab of state.tabs) {
    const keep = tab.entries.filter((e) => isViewKey(e.target) || exists(e.target));
    if (keep.length === tab.entries.length) continue;
    if (keep.length === 0) {
      out = closeTab(out, tab.key);
      continue;
    }
    const survivorsBefore = tab.entries.slice(0, tab.index + 1).filter((e) => keep.includes(e)).length;
    out = replaceTab(out, { ...tab, entries: keep, index: Math.max(0, survivorsBefore - 1) }, false);
  }
  return out;
}
