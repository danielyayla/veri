import { deepStrictEqual, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import { activateTab, closeTab, cycleTab, isViewKey, openTab, pinTab, reorderTab, retainTabs } from './tabs.ts';
import type { TabState } from './tabs.ts';

const s = (tabs: Array<[string, boolean]>, active: string | null): TabState => ({
  tabs: tabs.map(([id, preview]) => ({ id, preview })),
  activeTabId: active,
});

describe('openTab', () => {
  it('link open inserts a pinned tab immediately after the active tab and focuses it', () => {
    const next = openTab(s([['REQ-001', false], ['WO-005', false]], 'REQ-001'), 'DEC-002');
    deepStrictEqual(next, s([['REQ-001', false], ['DEC-002', false], ['WO-005', false]], 'DEC-002'));
  });

  it('appends when there is no active tab (empty strip)', () => {
    deepStrictEqual(openTab(s([], null), 'REQ-001'), s([['REQ-001', false]], 'REQ-001'));
  });

  it('focuses an existing tab instead of duplicating', () => {
    const state = s([['REQ-001', false], ['DEC-002', false]], 'DEC-002');
    deepStrictEqual(openTab(state, 'REQ-001'), s([['REQ-001', false], ['DEC-002', false]], 'REQ-001'));
  });

  it('a pinned open of the current preview tab pins it in place', () => {
    const next = openTab(s([['REQ-001', false], ['DEC-002', true]], 'REQ-001'), 'DEC-002');
    deepStrictEqual(next, s([['REQ-001', false], ['DEC-002', false]], 'DEC-002'));
  });

  it('a preview click on an already-pinned tab does not demote it', () => {
    const next = openTab(s([['REQ-001', false]], 'REQ-001'), 'REQ-001', { preview: true });
    deepStrictEqual(next, s([['REQ-001', false]], 'REQ-001'));
  });

  it('preview opens reuse the single preview tab in place', () => {
    const state = s([['DEC-002', true], ['REQ-001', false]], 'REQ-001');
    const next = openTab(state, 'WO-005', { preview: true });
    deepStrictEqual(next, s([['WO-005', true], ['REQ-001', false]], 'WO-005'));
  });

  it('first preview open inserts after the active tab', () => {
    const next = openTab(s([['REQ-001', false], ['WO-005', false]], 'REQ-001'), 'DEC-002', { preview: true });
    deepStrictEqual(next, s([['REQ-001', false], ['DEC-002', true], ['WO-005', false]], 'DEC-002'));
  });

  it('background open keeps the current tab focused', () => {
    const next = openTab(s([['REQ-001', false]], 'REQ-001'), 'DEC-002', { background: true });
    deepStrictEqual(next, s([['REQ-001', false], ['DEC-002', false]], 'REQ-001'));
  });

  it('previewTabs=false turns preview opens into pinned opens', () => {
    const state = s([['DEC-002', true], ['REQ-001', false]], 'REQ-001');
    const next = openTab(state, 'WO-005', { preview: true, previewTabs: false });
    deepStrictEqual(next, s([['DEC-002', true], ['REQ-001', false], ['WO-005', false]], 'WO-005'));
  });
});

describe('closeTab', () => {
  it('closing the active tab activates the right neighbor', () => {
    const next = closeTab(s([['A', false], ['B', false], ['C', false]], 'B'), 'B');
    deepStrictEqual(next, s([['A', false], ['C', false]], 'C'));
  });

  it('closing the active last tab falls back to the left neighbor', () => {
    const next = closeTab(s([['A', false], ['B', false]], 'B'), 'B');
    deepStrictEqual(next, s([['A', false]], 'A'));
  });

  it('closing an inactive tab keeps the active tab', () => {
    const next = closeTab(s([['A', false], ['B', false]], 'B'), 'A');
    deepStrictEqual(next, s([['B', false]], 'B'));
  });

  it('closing the only tab empties the strip', () => {
    deepStrictEqual(closeTab(s([['A', false]], 'A'), 'A'), s([], null));
  });
});

describe('pin / activate / reorder / cycle', () => {
  it('pinTab clears the preview flag', () => {
    deepStrictEqual(pinTab(s([['A', true]], 'A'), 'A'), s([['A', false]], 'A'));
  });

  it('activateTab focuses an open tab and ignores unknown ids', () => {
    strictEqual(activateTab(s([['A', false]], 'A'), 'B').activeTabId, 'A');
    strictEqual(activateTab(s([['A', false], ['B', false]], 'A'), 'B').activeTabId, 'B');
  });

  it('reorderTab moves a tab without changing focus', () => {
    const next = reorderTab(s([['A', false], ['B', false], ['C', false]], 'A'), 0, 2);
    deepStrictEqual(next, s([['B', false], ['C', false], ['A', false]], 'A'));
  });

  it('cycleTab wraps in both directions', () => {
    const state = s([['A', false], ['B', false], ['C', false]], 'C');
    strictEqual(cycleTab(state, 1).activeTabId, 'A');
    strictEqual(cycleTab({ ...state, activeTabId: 'A' }, -1).activeTabId, 'C');
  });
});

describe('retainTabs', () => {
  it('drops tabs for deleted docs, keeps view tabs, and re-activates like a close', () => {
    const state = s([['REQ-001', false], ['board', false], ['DEC-002', false]], 'DEC-002');
    const next = retainTabs(state, (id) => id === 'REQ-001');
    deepStrictEqual(next, s([['REQ-001', false], ['board', false]], 'board'));
  });

  it('view keys are recognized', () => {
    strictEqual(isViewKey('board') && isViewKey('mcp') && !isViewKey('REQ-001'), true);
  });
});
