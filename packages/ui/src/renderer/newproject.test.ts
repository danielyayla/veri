import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeTarget, dirBasename, isValidProjectName } from './newproject.ts';

test('name equal to the picked basename targets the picked folder itself', () => {
  assert.equal(composeTarget('/Users/d/Projects/harbor', 'harbor'), '/Users/d/Projects/harbor');
  // Trailing slashes on the picked dir don't change what "same name" means.
  assert.equal(composeTarget('/Users/d/Projects/harbor/', 'harbor'), '/Users/d/Projects/harbor/');
});

test('any other name composes a subfolder of the picked dir', () => {
  assert.equal(composeTarget('/Users/d/Projects', 'harbor'), '/Users/d/Projects/harbor');
  assert.equal(composeTarget('/Users/d/Projects/', 'harbor'), '/Users/d/Projects/harbor');
  // Editing back and forth is stateless — only the current name matters.
  assert.equal(composeTarget('/Users/d/Projects', 'Projects'), '/Users/d/Projects');
});

test('dirBasename takes the last segment, ignoring trailing slashes', () => {
  assert.equal(dirBasename('/a/b/c'), 'c');
  assert.equal(dirBasename('/a/b/c///'), 'c');
});

test('only names no folder can have are invalid', () => {
  for (const bad of ['', '.', '..', 'a/b', 'a\\b', 'a\0b']) {
    assert.equal(isValidProjectName(bad), false, JSON.stringify(bad));
  }
  // Everything else is the filesystem's call (SRC-007 addendum).
  for (const ok of ['harbor', 'my project', '.config', '...', 'öl', 'a.b', ' ']) {
    assert.equal(isValidProjectName(ok), true, JSON.stringify(ok));
  }
});
