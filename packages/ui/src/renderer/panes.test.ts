import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import {
  anyEntryPanes,
  clampRatio,
  focusPane,
  focusedState,
  navigateFocused,
  openBeside,
  persistPanes,
  restorePanes,
  retainPanes,
  setPane,
  singlePane,
} from './panes.ts';
import type { PaneState } from './panes.ts';
import { activeTarget, currentTarget } from './tabs.ts';
import type { TabState } from './tabs.ts';

/** Terse tab-state builder, same shape as tabs.test.ts. */
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

const split = (a: TabState, b: TabState, focused = 0): PaneState => ({ panes: [a, b], focused });

const shown = (ps: PaneState): Array<string | null> => ps.panes.map((p) => activeTarget(p));

describe('singlePane / focusPane', () => {
  it('boots as one empty pane, focused', () => {
    const ps = singlePane();
    strictEqual(ps.panes.length, 1);
    strictEqual(ps.focused, 0);
    deepStrictEqual(focusedState(ps).tabs, []);
  });

  it('focusPane moves focus between existing panes and ignores bad indices', () => {
    const ps = split(s([{ t: ['A'] }], 0), s([{ t: ['B'] }], 0));
    strictEqual(focusPane(ps, 1).focused, 1);
    strictEqual(focusPane(ps, 0), ps); // already focused: identity
    strictEqual(focusPane(ps, 2), ps);
    strictEqual(focusPane(ps, -1), ps);
  });
});

describe('setPane and split collapse', () => {
  it('replaces the addressed pane and keeps focus', () => {
    const ps = split(s([{ t: ['A'] }], 0), s([{ t: ['B'] }], 0), 1);
    const next = setPane(ps, 0, s([{ t: ['A', 'C'] }], 0));
    deepStrictEqual(shown(next), ['C', 'B']);
    strictEqual(next.focused, 1);
  });

  it('closing a pane\'s last tab collapses the split with the survivor\'s state intact', () => {
    const survivor = s([{ t: ['A', 'B'], i: 0 }, { t: ['C'] }], 1);
    const ps = split(survivor, s([{ t: ['D'] }], 0), 1);
    const next = setPane(ps, 1, s([], null));
    strictEqual(next.panes.length, 1);
    strictEqual(next.focused, 0);
    deepStrictEqual(next.panes[0], survivor); // full history, active key, index survive
  });

  it('a lone pane emptied stays a lone empty pane (app empty state)', () => {
    const next = setPane(singlePane(s([{ t: ['A'] }], 0)), 0, s([], null));
    strictEqual(next.panes.length, 1);
    deepStrictEqual(next.panes[0].tabs, []);
  });
});

describe('navigateFocused routing', () => {
  it('routes doc navigation into the focused pane only', () => {
    const ps = split(s([{ t: ['A'] }], 0), s([{ t: ['B'] }], 0), 1);
    const next = navigateFocused(ps, 'C');
    deepStrictEqual(shown(next), ['A', 'C']);
    strictEqual(next.focused, 1);
    deepStrictEqual(next.panes[1].tabs[0].entries.map((e) => e.target), ['B', 'C']);
  });

  it('a view open in the other pane focuses that pane\'s tab instead of duplicating', () => {
    const ps = split(s([{ t: ['homeview'] }, { t: ['A'] }], 1), s([{ t: ['B'] }], 0), 1);
    const next = navigateFocused(ps, 'homeview');
    strictEqual(next.focused, 0);
    strictEqual(activeTarget(next.panes[0]), 'homeview');
    // pane 1 untouched — no duplicate view tab anywhere
    deepStrictEqual(shown(next), ['homeview', 'B']);
    strictEqual(next.panes.flatMap((p) => p.tabs).filter((t) => currentTarget(t) === 'homeview').length, 1);
  });

  it('a background open of a view held by the other pane is a no-op', () => {
    const ps = split(s([{ t: ['search'] }], 0), s([{ t: ['B'] }], 0), 1);
    strictEqual(navigateFocused(ps, 'search', { surface: 'background' }), ps);
  });

  it('a view open in the focused pane is handled by the per-pane singleton rule', () => {
    const ps = split(s([{ t: ['A'] }], 0), s([{ t: ['settings'] }, { t: ['B'] }], 1), 1);
    const next = navigateFocused(ps, 'settings');
    strictEqual(next.focused, 1);
    strictEqual(activeTarget(next.panes[1]), 'settings');
  });

  it('documents may open in both panes', () => {
    const ps = split(s([{ t: ['A'] }], 0), s([{ t: ['B'] }], 0), 1);
    const next = navigateFocused(ps, 'A');
    deepStrictEqual(shown(next), ['A', 'A']);
  });
});

describe('openBeside', () => {
  it('splits a single pane: the current entry opens in a new pinned tab, that pane focused', () => {
    const ps = singlePane(s([{ t: ['A', 'B'] }], 0));
    const next = openBeside(ps);
    strictEqual(next.panes.length, 2);
    strictEqual(next.focused, 1);
    deepStrictEqual(shown(next), ['B', 'B']);
    strictEqual(next.panes[1].tabs[0].preview, false);
    // the origin pane keeps its history untouched
    deepStrictEqual(next.panes[0].tabs[0].entries.map((e) => e.target), ['A', 'B']);
  });

  it('with a split already up, reuses a tab showing the target', () => {
    const ps = split(s([{ t: ['B'] }], 0), s([{ t: ['A'] }, { t: ['B'] }], 0), 0);
    const next = openBeside(ps);
    strictEqual(next.focused, 1);
    strictEqual(next.panes[1].activeKey, 't2');
    strictEqual(next.panes[1].tabs.length, 2); // no new tab
  });

  it('with a split already up and no tab showing the target, opens a new pinned tab and focuses it', () => {
    const ps = split(s([{ t: ['C'] }], 0), s([{ t: ['A'] }], 0, 7), 0);
    const next = openBeside(ps);
    strictEqual(next.focused, 1);
    strictEqual(activeTarget(next.panes[1]), 'C');
    strictEqual(next.panes[1].tabs.length, 2);
    strictEqual(next.panes[1].tabs.find((t) => currentTarget(t) === 'C')?.preview, false);
  });

  it('a view entry never opens beside (views are singletons)', () => {
    const ps = singlePane(s([{ t: ['homeview'] }], 0));
    strictEqual(openBeside(ps), ps);
  });

  it('an empty pane has nothing to open', () => {
    const ps = singlePane();
    strictEqual(openBeside(ps), ps);
  });
});

describe('retainPanes', () => {
  const exists = (ok: string[]) => (id: string): boolean => ok.includes(id);

  it('runs retainTabs over both panes', () => {
    const ps = split(s([{ t: ['A', 'X'] }], 0), s([{ t: ['B'] }, { t: ['X'] }], 0), 1);
    const next = retainPanes(ps, exists(['A', 'B']));
    deepStrictEqual(shown(next), ['A', 'B']);
    strictEqual(next.panes.length, 2);
    strictEqual(next.focused, 1);
  });

  it('a pane emptied by retainTabs collapses the split', () => {
    const ps = split(s([{ t: ['A'] }], 0), s([{ t: ['X'] }], 0), 0);
    const next = retainPanes(ps, exists(['A']));
    strictEqual(next.panes.length, 1);
    strictEqual(activeTarget(next.panes[0]), 'A');
    strictEqual(next.focused, 0);
  });

  it('views always survive; both panes emptied leaves one empty pane', () => {
    const ps = split(s([{ t: ['X'] }], 0), s([{ t: ['search'] }], 0), 0);
    const kept = retainPanes(ps, exists([]));
    strictEqual(kept.panes.length, 1);
    strictEqual(activeTarget(kept.panes[0]), 'search');
    const both = retainPanes(split(s([{ t: ['X'] }], 0), s([{ t: ['Y'] }], 0)), exists([]));
    strictEqual(both.panes.length, 1);
    deepStrictEqual(both.panes[0].tabs, []);
  });
});

describe('anyEntryPanes', () => {
  it('sees history entries in either pane', () => {
    const ps = split(s([{ t: ['A', 'B'], i: 1 }], 0), s([{ t: ['C'] }], 0));
    ok(anyEntryPanes(ps, 'A')); // back-history of pane 0
    ok(anyEntryPanes(ps, 'C'));
    ok(!anyEntryPanes(ps, 'D'));
  });
});

describe('persistPanes / restorePanes round trip', () => {
  const exists = (): boolean => true;

  it('a single pane persists exactly the WO-054 shape — no second-pane fields', () => {
    const out = persistPanes(singlePane(s([{ t: ['A'] }, { t: ['B'], pv: true }], 1)));
    deepStrictEqual(out, { tabs: [{ target: 'A', preview: false }, { target: 'B', preview: true }], active: 1 });
    ok(!('tabs2' in out));
  });

  it('a split persists both lists and restores to both panes', () => {
    const ps = split(s([{ t: ['A'] }, { t: ['homeview'] }], 0), s([{ t: ['B'] }, { t: ['C'] }], 1));
    const out = persistPanes(ps);
    const back = restorePanes(out.tabs, out.active, out.tabs2, out.active2, exists);
    strictEqual(back.panes.length, 2);
    deepStrictEqual(shown(back), ['A', 'C']);
    strictEqual(back.focused, 0);
  });

  it('an absent or empty second list restores to one pane', () => {
    const one = restorePanes([{ target: 'A', preview: false }], 0, undefined, undefined, exists);
    strictEqual(one.panes.length, 1);
    const empty = restorePanes([{ target: 'A', preview: false }], 0, [], undefined, exists);
    strictEqual(empty.panes.length, 1);
  });

  it('a second list that restores empty (all targets gone) collapses to one pane', () => {
    const back = restorePanes(
      [{ target: 'A', preview: false }],
      0,
      [{ target: 'GONE', preview: false }],
      0,
      (id) => id === 'A',
    );
    strictEqual(back.panes.length, 1);
    strictEqual(activeTarget(back.panes[0]), 'A');
  });

  it('a view persisted in both lists keeps only the first pane\'s copy, active index adjusting', () => {
    const back = restorePanes(
      [{ target: 'settings', preview: false }, { target: 'A', preview: false }],
      0,
      [{ target: 'settings', preview: false }, { target: 'B', preview: false }],
      1,
      exists,
    );
    strictEqual(back.panes.length, 2);
    deepStrictEqual(back.panes[1].tabs.map((t) => currentTarget(t)), ['B']);
    strictEqual(activeTarget(back.panes[1]), 'B');
    strictEqual(back.panes.flatMap((p) => p.tabs).filter((t) => currentTarget(t) === 'settings').length, 1);
  });

  it('a first pane that restores empty keeps the surviving second pane as the single pane', () => {
    const back = restorePanes(
      [{ target: 'GONE', preview: false }],
      0,
      [{ target: 'B', preview: false }],
      0,
      (id) => id === 'B',
    );
    strictEqual(back.panes.length, 1);
    strictEqual(activeTarget(back.panes[0]), 'B');
  });
});

describe('clampRatio', () => {
  it('enforces the 320px minimum per side', () => {
    strictEqual(clampRatio(0.1, 1000), 0.32);
    strictEqual(clampRatio(0.95, 1000), 1 - 0.32);
    strictEqual(clampRatio(0.5, 1000), 0.5);
  });

  it('pins to 50/50 when the container cannot fit two minimums, and on corrupt input', () => {
    strictEqual(clampRatio(0.3, 600), 0.5);
    strictEqual(clampRatio(Number.NaN, 1000), 0.5);
    strictEqual(clampRatio(Number.POSITIVE_INFINITY, 1000), 0.5);
  });
});
