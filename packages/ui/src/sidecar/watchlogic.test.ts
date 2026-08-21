import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { MCP_SELF_WRITE_WINDOW_MS, WATCH_DEBOUNCE_MS, classifyRootEvent, createDebouncer } from './watchlogic.ts';

test('a .mcp.json event within the self-write window is not external', () => {
  const wroteAt = 10_000;
  assert.deepEqual(classifyRootEvent('.mcp.json', wroteAt, wroteAt + 200), {
    kind: 'mcp-changed',
    external: false,
  });
  assert.deepEqual(classifyRootEvent('.mcp.json', wroteAt, wroteAt + MCP_SELF_WRITE_WINDOW_MS + 1), {
    kind: 'mcp-changed',
    external: true,
  });
});

test('a never-written panel sees every .mcp.json change as external', () => {
  assert.deepEqual(classifyRootEvent('.mcp.json', 0, Date.now()), { kind: 'mcp-changed', external: true });
});

test('any other root file feeds the ordinary changed pipeline', () => {
  assert.deepEqual(classifyRootEvent('CLAUDE.md', 0, 1), { kind: 'changed' });
  assert.deepEqual(classifyRootEvent(null, 0, 1), { kind: 'changed' });
});

test('debounce collapses a burst into one trailing fire', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let fired = 0;
  const d = createDebouncer(() => {
    fired += 1;
  });
  d.bump();
  t.mock.timers.tick(WATCH_DEBOUNCE_MS - 1);
  d.bump(); // burst continues — the window restarts
  t.mock.timers.tick(WATCH_DEBOUNCE_MS - 1);
  assert.equal(fired, 0);
  t.mock.timers.tick(1);
  assert.equal(fired, 1);
  t.mock.timers.tick(WATCH_DEBOUNCE_MS * 10);
  assert.equal(fired, 1, 'one burst, one fire');
});

test('separate bursts fire separately', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let fired = 0;
  const d = createDebouncer(() => {
    fired += 1;
  });
  d.bump();
  t.mock.timers.tick(WATCH_DEBOUNCE_MS);
  d.bump();
  t.mock.timers.tick(WATCH_DEBOUNCE_MS);
  assert.equal(fired, 2);
});

test('cancel drops a pending fire — torn-down watchers stay silent', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let fired = 0;
  const d = createDebouncer(() => {
    fired += 1;
  });
  d.bump();
  d.cancel();
  t.mock.timers.tick(WATCH_DEBOUNCE_MS * 10);
  assert.equal(fired, 0);
});
