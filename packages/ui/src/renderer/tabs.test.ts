import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import {
  EMPTY_TABS,
  activateTab,
  activeTarget,
  anyEntry,
  back,
  closeTab,
  currentTarget,
  cycleTab,
  forward,
  isViewKey,
  navigate,
  persistTabs,
  pinTab,
  reorderTab,
  restoreTabs,
  retainTabs,
} from './tabs.ts';
import type { Tab, TabState } from './tabs.ts';

/** Terse state builder: each tab is [targets..., index, preview]. */
const s = (tabs: Array<{ t: string[]; i?: number; pv?: boolean }>, active: number | null, nextKey = 100): TabState => ({
  tabs: tabs.map((spec, n) => ({
    key: `t${n + 1}`,
    preview: spec.pv === true,
    entries: spec.t.map((target) => ({ target, scroll: [] })),
    index: spec.i ?? spec.t.length - 1,
  })),
  activeKey: active === null ? null : `t${active + 1}`,
  nextKey,
});

const targets = (tab: Tab): string[] => tab.entries.map((e) => e.target);

describe('navigate inplace', () => {
  it('pushes onto the active tab and keeps focus there', () => {
    const next = navigate(s([{ t: ['REQ-001'] }], 0), 'DEC-002');
    strictEqual(next.tabs.length, 1);
    deepStrictEqual(targets(next.tabs[0]), ['REQ-001', 'DEC-002']);
    strictEqual(next.tabs[0].index, 1);
    strictEqual(next.activeKey, 't1');
  });

  it('the acceptance trail: four opens then four backs return through all of them in order', () => {
    let st = s([{ t: ['WO-031'] }], 0);
    for (const id of ['REQ-014', 'DEC-009', 'SRC-021', 'REQ-002']) st = navigate(st, id);
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      st = back(st);
      seen.push(activeTarget(st)!);
    }
    deepStrictEqual(seen, ['SRC-021', 'DEC-009', 'REQ-014', 'WO-031']);
    strictEqual(back(st), st); // at the start: no-op
  });

  it('forward re-walks the same trail; navigating from mid-history truncates the forward stack', () => {
    let st = s([{ t: ['A', 'B', 'C'] }], 0);
    st = back(back(st));
    strictEqual(activeTarget(st), 'A');
    st = forward(st);
    strictEqual(activeTarget(st), 'B');
    st = navigate(st, 'D'); // browser-style: C is gone
    deepStrictEqual(targets(st.tabs[0]), ['A', 'B', 'D']);
    strictEqual(forward(st), st);
  });

  it('navigating to the current target is a no-op (no duplicate consecutive entries)', () => {
    const st = s([{ t: ['REQ-001'] }], 0);
    deepStrictEqual(targets(navigate(st, 'REQ-001').tabs[0]), ['REQ-001']);
  });

  it('caps the stack at 50 entries, dropping the oldest', () => {
    let st = s([{ t: ['D0'] }], 0);
    for (let i = 1; i <= 60; i++) st = navigate(st, `D${i}`);
    strictEqual(st.tabs[0].entries.length, 50);
    strictEqual(targets(st.tabs[0])[0], 'D11');
    strictEqual(activeTarget(st), 'D60');
  });

  it('does not change pinned-ness: a preview tab stays a preview while a trail runs through it', () => {
    const next = navigate(s([{ t: ['REQ-001'], pv: true }], 0), 'DEC-002');
    strictEqual(next.tabs[0].preview, true);
  });

  it('with no tabs at all, opens a preview tab (palette from the empty state)', () => {
    const next = navigate(EMPTY_TABS, 'REQ-001');
    strictEqual(next.tabs.length, 1);
    strictEqual(next.tabs[0].preview, true);
    strictEqual(next.activeKey, next.tabs[0].key);
  });

  it('earlier entry objects survive a push by reference (scroll capture depends on it)', () => {
    const st = s([{ t: ['A'] }], 0);
    const entry = st.tabs[0].entries[0];
    const next = navigate(st, 'B');
    entry.scroll = [120];
    deepStrictEqual(back(next).tabs[0].entries[0].scroll, [120]);
  });
});

describe('navigate preview', () => {
  it('reuses the single preview tab in place, accumulating its history', () => {
    const st = s([{ t: ['DEC-002'], pv: true }, { t: ['REQ-001'] }], 1);
    const next = navigate(st, 'WO-005', { surface: 'preview' });
    deepStrictEqual(targets(next.tabs[0]), ['DEC-002', 'WO-005']);
    strictEqual(next.tabs[0].preview, true);
    strictEqual(next.activeKey, 't1');
  });

  it('creates the preview tab after the active tab when none exists', () => {
    const next = navigate(s([{ t: ['REQ-001'] }, { t: ['WO-005'] }], 0), 'DEC-002', { surface: 'preview' });
    strictEqual(next.tabs.length, 3);
    strictEqual(currentTarget(next.tabs[1]), 'DEC-002');
    strictEqual(next.tabs[1].preview, true);
    strictEqual(next.activeKey, next.tabs[1].key);
  });

  it('previewTabs=false opens a focused pinned tab instead', () => {
    const next = navigate(s([{ t: ['REQ-001'] }], 0), 'DEC-002', { surface: 'preview', previewTabs: false });
    strictEqual(next.tabs.length, 2);
    strictEqual(next.tabs[1].preview, false);
    strictEqual(next.activeKey, next.tabs[1].key);
  });
});

describe('navigate background', () => {
  it('opens a pinned tab after the active one without focusing it', () => {
    const st = s([{ t: ['REQ-001'] }, { t: ['WO-005'] }], 0);
    const next = navigate(st, 'DEC-002', { surface: 'background' });
    deepStrictEqual(next.tabs.map((t) => currentTarget(t)), ['REQ-001', 'DEC-002', 'WO-005']);
    strictEqual(next.tabs[1].preview, false);
    strictEqual(next.activeKey, 't1');
  });

  it('allows the same document in two tabs (SRC-018 supersedes the no-duplicate rule for docs)', () => {
    const st = s([{ t: ['REQ-001'] }, { t: ['DEC-002'] }], 0);
    const next = navigate(st, 'DEC-002', { surface: 'background' });
    strictEqual(next.tabs.filter((t) => currentTarget(t) === 'DEC-002').length, 2);
  });
});

describe('view singletons', () => {
  it('focuses the tab already showing a view instead of duplicating it', () => {
    const st = s([{ t: ['homeview'] }, { t: ['REQ-001'] }], 1);
    const next = navigate(st, 'homeview', { surface: 'preview' });
    strictEqual(next.tabs.length, 2);
    strictEqual(next.activeKey, 't1');
  });

  it('a view in back-history does not count as showing it', () => {
    const st = s([{ t: ['homeview', 'REQ-001'] }, { t: ['WO-005'] }], 1);
    const next = navigate(st, 'homeview', { surface: 'preview' });
    strictEqual(next.tabs.length, 3); // t1 currently shows REQ-001
  });

  it('views may sit in history: navigating from a view pushes past it and back returns', () => {
    let st = navigate(s([{ t: ['search'] }], 0), 'REQ-001');
    deepStrictEqual(targets(st.tabs[0]), ['search', 'REQ-001']);
    st = back(st);
    strictEqual(activeTarget(st), 'search');
  });
});

describe('closeTab', () => {
  it('closing the active tab activates the right neighbor, else the left', () => {
    const st = s([{ t: ['A'] }, { t: ['B'] }, { t: ['C'] }], 1);
    strictEqual(closeTab(st, 't2').activeKey, 't3');
    strictEqual(closeTab(closeTab(st, 't3'), 't2').activeKey, 't1');
    strictEqual(closeTab(st, 't1').activeKey, 't2'); // closing an inactive tab keeps focus
  });

  it('closing the last tab empties the strip', () => {
    const next = closeTab(s([{ t: ['A'] }], 0), 't1');
    deepStrictEqual(next.tabs, []);
    strictEqual(next.activeKey, null);
  });
});

describe('pin, activate, reorder, cycle', () => {
  it('pinTab clears preview by key', () => {
    strictEqual(pinTab(s([{ t: ['A'], pv: true }], 0), 't1').tabs[0].preview, false);
  });

  it('activateTab ignores unknown keys', () => {
    const st = s([{ t: ['A'] }], 0);
    strictEqual(activateTab(st, 'nope'), st);
    strictEqual(activateTab(s([{ t: ['A'] }, { t: ['B'] }], 0), 't2').activeKey, 't2');
  });

  it('reorderTab moves a tab; cycleTab wraps in both directions', () => {
    const st = s([{ t: ['A'] }, { t: ['B'] }, { t: ['C'] }], 2);
    deepStrictEqual(reorderTab(st, 0, 2).tabs.map((t) => currentTarget(t)), ['B', 'C', 'A']);
    strictEqual(cycleTab(st, 1).activeKey, 't1');
    strictEqual(cycleTab(st, -1).activeKey, 't2');
  });
});

describe('retainTabs', () => {
  const gone = (dead: string[]) => (id: string) => !dead.includes(id);

  it('prunes vanished docs from history and re-anchors the index', () => {
    const st = s([{ t: ['A', 'B', 'C'], i: 2 }], 0);
    const next = retainTabs(st, gone(['B']));
    deepStrictEqual(targets(next.tabs[0]), ['A', 'C']);
    strictEqual(next.tabs[0].index, 1); // still on C
  });

  it('a pruned current entry falls back to the nearest earlier survivor', () => {
    const next = retainTabs(s([{ t: ['A', 'B', 'C'], i: 1 }], 0), gone(['B']));
    strictEqual(activeTarget(next), 'A');
  });

  it('a tab whose whole history vanished closes', () => {
    const next = retainTabs(s([{ t: ['A'] }, { t: ['B'] }], 0), gone(['A']));
    strictEqual(next.tabs.length, 1);
    strictEqual(next.activeKey, 't2');
  });

  it('view entries always survive', () => {
    const next = retainTabs(s([{ t: ['search', 'A'] }], 0), gone(['A']));
    deepStrictEqual(targets(next.tabs[0]), ['search']);
  });

  // WO-049: workspaces persisted before the Decision log retirement may still
  // hold a 'decisions' view tab. It is no ViewKey and no doc, so restore
  // drops the entry — no migration; a tab left empty closes like a × click.
  it("a persisted 'decisions' view tab from before the retirement restores away cleanly", () => {
    ok(!isViewKey('decisions'));
    const lone = retainTabs(s([{ t: ['decisions'] }, { t: ['search'] }], 0), () => false);
    deepStrictEqual(lone.tabs.map((t) => targets(t)), [['search']]);
    strictEqual(lone.activeKey, 't2');
    // Mixed history: the dead view entry drops, surviving doc entries stay.
    const mixed = retainTabs(s([{ t: ['decisions', 'REQ-001'], i: 0 }], 0), (id) => id === 'REQ-001');
    deepStrictEqual(targets(mixed.tabs[0]), ['REQ-001']);
  });

  // WO-052 (SRC-024): the global Graph view is retired the same way — 'graph'
  // is no ViewKey anymore, so persisted graph tabs restore away, no migration.
  it("a persisted 'graph' view tab from before the retirement restores away cleanly", () => {
    ok(!isViewKey('graph'));
    const lone = retainTabs(s([{ t: ['graph'] }, { t: ['search'] }], 0), () => false);
    deepStrictEqual(lone.tabs.map((t) => targets(t)), [['search']]);
    strictEqual(lone.activeKey, 't2');
    // Mixed history: the graph entry drops, the surviving doc entry remains.
    const mixed = retainTabs(s([{ t: ['graph', 'WO-005'], i: 0 }], 0), (id) => id === 'WO-005');
    deepStrictEqual(targets(mixed.tabs[0]), ['WO-005']);
  });

  // WO-053 (SRC-025): the Board view folds into the Work Orders panel —
  // 'board' is no ViewKey anymore, so persisted board tabs restore away,
  // no migration.
  it("a persisted 'board' view tab from before the retirement restores away cleanly", () => {
    ok(!isViewKey('board'));
    const lone = retainTabs(s([{ t: ['board'] }, { t: ['search'] }], 0), () => false);
    deepStrictEqual(lone.tabs.map((t) => targets(t)), [['search']]);
    strictEqual(lone.activeKey, 't2');
    // Mixed history: the board entry drops, the surviving doc entry remains.
    const mixed = retainTabs(s([{ t: ['board', 'WO-005'], i: 0 }], 0), (id) => id === 'WO-005');
    deepStrictEqual(targets(mixed.tabs[0]), ['WO-005']);
  });
});

// WO-054 (SRC-026): the open set persists across a project switch — one
// current target per tab, never the history stack (SRC-018).
describe('persistTabs / restoreTabs', () => {
  it('round-trips a mixed set: order, preview flag, and active index survive; history collapses to one entry', () => {
    const live = s([{ t: ['WO-005', 'REQ-001'], i: 1 }, { t: ['homeview'] }, { t: ['DEC-002'], pv: true }], 2);
    const saved = persistTabs(live);
    deepStrictEqual(saved, {
      tabs: [
        { target: 'REQ-001', preview: false },
        { target: 'homeview', preview: false },
        { target: 'DEC-002', preview: true },
      ],
      active: 2,
    });
    const restored = restoreTabs(saved.tabs, saved.active, () => true);
    deepStrictEqual(restored.tabs.map((t) => targets(t)), [['REQ-001'], ['homeview'], ['DEC-002']]);
    deepStrictEqual(restored.tabs.map((t) => t.preview), [false, false, true]);
    deepStrictEqual(restored.tabs.map((t) => t.index), [0, 0, 0]);
    strictEqual(activeTarget(restored), 'DEC-002');
    strictEqual(restored.nextKey, 4);
  });

  it('persist with no active tab clamps the index to 0', () => {
    deepStrictEqual(persistTabs(s([{ t: ['REQ-001'] }], null)).active, 0);
    deepStrictEqual(persistTabs(EMPTY_TABS), { tabs: [], active: 0 });
  });

  it('drops targets that no longer resolve, retired view keys included', () => {
    const saved = [
      { target: 'graph', preview: false }, // retired WO-052
      { target: 'REQ-001', preview: false },
      { target: 'board', preview: false }, // retired WO-053
      { target: 'decisions', preview: false }, // retired WO-049
      { target: 'GONE-001', preview: false }, // byId miss
      { target: 'search', preview: false },
    ];
    const restored = restoreTabs(saved, 1, (id) => id === 'REQ-001');
    deepStrictEqual(restored.tabs.map((t) => targets(t)), [['REQ-001'], ['search']]);
    strictEqual(activeTarget(restored), 'REQ-001');
  });

  it('maps a dropped active tab to the nearest earlier survivor and clamps an out-of-range index', () => {
    const saved = [
      { target: 'A', preview: false },
      { target: 'GONE', preview: false },
      { target: 'B', preview: false },
    ];
    const exists = (id: string): boolean => id !== 'GONE';
    strictEqual(activeTarget(restoreTabs(saved, 1, exists)), 'A'); // active was the dropped tab
    strictEqual(activeTarget(restoreTabs(saved, 99, exists)), 'B'); // clamp high
    strictEqual(activeTarget(restoreTabs(saved, -3, exists)), 'A'); // junk falls back to first
    strictEqual(activeTarget(restoreTabs(saved, undefined, exists)), 'A'); // absent field
  });

  it('normalizes a hand-edited file: at most one preview tab, duplicate views collapse to the first', () => {
    const saved = [
      { target: 'homeview', preview: false },
      { target: 'REQ-001', preview: true },
      { target: 'homeview', preview: false },
      { target: 'DEC-002', preview: true },
    ];
    const restored = restoreTabs(saved, 0, () => true);
    deepStrictEqual(restored.tabs.map((t) => targets(t)), [['homeview'], ['REQ-001'], ['DEC-002']]);
    deepStrictEqual(restored.tabs.map((t) => t.preview), [false, true, false]);
  });

  it('an empty list or one with nothing resolvable restores to EMPTY_TABS (caller falls back to Home)', () => {
    deepStrictEqual(restoreTabs([], 0, () => true), EMPTY_TABS);
    deepStrictEqual(restoreTabs([{ target: 'GONE', preview: false }], 0, () => false), EMPTY_TABS);
  });
});

describe('helpers', () => {
  it('anyEntry sees back-history, not just current entries', () => {
    const st = s([{ t: ['A', 'B'], i: 1 }], 0);
    ok(anyEntry(st, 'A'));
    ok(!anyEntry(st, 'C'));
  });

  it('isViewKey knows every view key', () => {
    ok(isViewKey('homeview') && isViewKey('settings') && isViewKey('search') && !isViewKey('REQ-001'));
  });
});
