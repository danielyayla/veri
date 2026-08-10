/**
 * Pure tab-state operations (WO-012, semantics from SRC-004 / VS Code):
 * links open pinned tabs after the active one, browsing reuses a single
 * preview tab, ⌘-click opens in the background. No DOM — the app shell
 * owns rendering and derives view/doc from the active tab id.
 */

/** View tabs alongside document tabs; ids are doc ids or these keys. */
export type ViewKey = 'board' | 'graph' | 'decisions' | 'mcp';

export const VIEW_META: Record<ViewKey, { label: string; glyph: string }> = {
  board: { label: 'Board', glyph: '▤' },
  graph: { label: 'Graph', glyph: '◉' },
  decisions: { label: 'Decisions', glyph: '§' },
  mcp: { label: 'Agent connection', glyph: '⌁' },
};

export function isViewKey(id: string): id is ViewKey {
  return id in VIEW_META;
}

export interface Tab {
  id: string;
  preview: boolean;
}

export interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
}

export interface OpenOpts {
  /** Browsing click (sidebar, board, …): reuse the single preview tab. */
  preview?: boolean;
  /** ⌘/Ctrl-click: open the tab without focusing it. */
  background?: boolean;
  /** The settings flag — false disables preview semantics entirely. */
  previewTabs?: boolean;
}

/**
 * SRC-004 rules 1–4. Already open → focus, never duplicate (a pinned open
 * also pins an existing preview). Preview opens replace the single preview
 * tab in place; pinned opens insert immediately after the active tab.
 */
export function openTab(state: TabState, id: string, opts: OpenOpts = {}): TabState {
  const preview = (opts.previewTabs ?? true) && opts.preview === true;
  const focus = opts.background === true ? state.activeTabId : id;
  const hit = state.tabs.find((t) => t.id === id);
  if (hit !== undefined) {
    const tabs = !preview && hit.preview ? state.tabs.map((t) => (t.id === id ? { id, preview: false } : t)) : state.tabs.slice();
    return { tabs, activeTabId: focus };
  }
  const tabs = state.tabs.slice();
  const pv = preview ? tabs.findIndex((t) => t.preview) : -1;
  if (pv >= 0) {
    tabs[pv] = { id, preview: true };
  } else {
    const i = tabs.findIndex((t) => t.id === state.activeTabId);
    tabs.splice(i < 0 ? tabs.length : i + 1, 0, { id, preview });
  }
  return { tabs, activeTabId: focus };
}

/** Rule 5: closing the active tab activates the right neighbor, else the left. */
export function closeTab(state: TabState, id: string): TabState {
  const i = state.tabs.findIndex((t) => t.id === id);
  if (i < 0) return state;
  const tabs = state.tabs.slice();
  tabs.splice(i, 1);
  const activeTabId =
    state.activeTabId === id ? (tabs.length > 0 ? tabs[Math.min(i, tabs.length - 1)].id : null) : state.activeTabId;
  return { tabs, activeTabId };
}

export function pinTab(state: TabState, id: string): TabState {
  return { tabs: state.tabs.map((t) => (t.id === id ? { id: t.id, preview: false } : t)), activeTabId: state.activeTabId };
}

export function activateTab(state: TabState, id: string): TabState {
  return state.tabs.some((t) => t.id === id) ? { tabs: state.tabs.slice(), activeTabId: id } : state;
}

/** Rule 6: live reorder while dragging over sibling tabs. */
export function reorderTab(state: TabState, from: number, to: number): TabState {
  if (from === to || from < 0 || to < 0 || from >= state.tabs.length || to >= state.tabs.length) return state;
  const tabs = state.tabs.slice();
  const [moved] = tabs.splice(from, 1);
  tabs.splice(to, 0, moved);
  return { tabs, activeTabId: state.activeTabId };
}

/** ⌃Tab / ⌃⇧Tab: cycle through the strip in order, wrapping. */
export function cycleTab(state: TabState, dir: 1 | -1): TabState {
  if (state.tabs.length === 0) return state;
  const i = state.tabs.findIndex((t) => t.id === state.activeTabId);
  const next = ((i < 0 ? 0 : i) + dir + state.tabs.length) % state.tabs.length;
  return { tabs: state.tabs.slice(), activeTabId: state.tabs[next].id };
}

/** Drop tabs whose backing doc disappeared (view tabs always survive). */
export function retainTabs(state: TabState, exists: (id: string) => boolean): TabState {
  let out = state;
  for (const t of state.tabs) {
    if (!isViewKey(t.id) && !exists(t.id)) out = closeTab(out, t.id);
  }
  return out;
}
