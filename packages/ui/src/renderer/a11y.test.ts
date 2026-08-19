import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFocus, trapTarget, roveIndex, roveKey } from './a11y.ts';

// resolveFocus — SRC-019 rule 2: survivor wins, else nearest old neighbour.

test('focus stays on the same fkey when it survives the rebuild', () => {
  assert.equal(resolveFocus(['a', 'b', 'c'], ['c', 'b', 'a'], 'b'), 'b');
});

test('closed element falls to its following sibling first', () => {
  // Closing tab t2 while focused on its close button: t3 survives.
  assert.equal(resolveFocus(['tab:t1', 'tab:t2', 'tab:t3'], ['tab:t1', 'tab:t3'], 'tab:t2'), 'tab:t3');
});

test('last element falls back to the preceding sibling', () => {
  assert.equal(resolveFocus(['tab:t1', 'tab:t2', 'tab:t3'], ['tab:t1', 'tab:t2'], 'tab:t3'), 'tab:t2');
});

test('nothing survives → null, focus is left alone', () => {
  assert.equal(resolveFocus(['pal:1', 'pal:2'], ['side:homeview'], 'pal:1'), null);
  assert.equal(resolveFocus([], ['a'], 'x'), null);
});

test('captured key absent from the old order → null', () => {
  assert.equal(resolveFocus(['a', 'b'], ['a', 'b'], 'ghost'), null);
});

test('nearest following neighbour is preferred over a distant one', () => {
  assert.equal(resolveFocus(['a', 'b', 'c', 'd'], ['a', 'd'], 'b'), 'd');
  assert.equal(resolveFocus(['a', 'b', 'c', 'd'], ['a', 'c', 'd'], 'b'), 'c');
});

// trapTarget — SRC-019 rule 3: Tab cycles inside the topmost layer.

test('Tab cycles forward with wrap inside a trap', () => {
  assert.equal(trapTarget(['x', 'y', 'z'], 'x', false), 'y');
  assert.equal(trapTarget(['x', 'y', 'z'], 'z', false), 'x');
});

test('Shift-Tab cycles backward with wrap', () => {
  assert.equal(trapTarget(['x', 'y', 'z'], 'y', true), 'x');
  assert.equal(trapTarget(['x', 'y', 'z'], 'x', true), 'z');
});

test('focus outside the trap re-enters at the direction edge', () => {
  assert.equal(trapTarget(['x', 'y'], null, false), 'x');
  assert.equal(trapTarget(['x', 'y'], null, true), 'y');
  assert.equal(trapTarget(['x', 'y'], 'elsewhere', false), 'x');
});

test('empty trap yields null', () => {
  assert.equal(trapTarget([], 'x', false), null);
});

// roveIndex / roveKey — tablist and radiogroup arrow-key movement.

test('arrows move the roving index with wrap', () => {
  assert.equal(roveIndex(3, 0, 'next'), 1);
  assert.equal(roveIndex(3, 2, 'next'), 0);
  assert.equal(roveIndex(3, 0, 'prev'), 2);
});

test('Home and End jump to the edges', () => {
  assert.equal(roveIndex(5, 3, 'home'), 0);
  assert.equal(roveIndex(5, 1, 'end'), 4);
});

test('out-of-range current normalizes before moving', () => {
  assert.equal(roveIndex(3, -1, 'next'), 1);
  assert.equal(roveIndex(0, 0, 'next'), -1);
});

test('roveKey maps arrow and edge keys, ignores the rest', () => {
  assert.equal(roveKey('ArrowLeft'), 'prev');
  assert.equal(roveKey('ArrowUp'), 'prev');
  assert.equal(roveKey('ArrowRight'), 'next');
  assert.equal(roveKey('ArrowDown'), 'next');
  assert.equal(roveKey('Home'), 'home');
  assert.equal(roveKey('End'), 'end');
  assert.equal(roveKey('Enter'), null);
  assert.equal(roveKey('a'), null);
});
