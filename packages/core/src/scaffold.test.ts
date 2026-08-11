import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProjectExistsError, VERI_SUBDIRS, scaffoldProject } from './scaffold.ts';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'veri-scaffold-'));
}

/** A stand-in for packages/cli/demo: a project root with veri/ + the two extras. */
function fakeDemo(): string {
  const root = tmp();
  mkdirSync(join(root, 'veri', 'requirements'), { recursive: true });
  writeFileSync(join(root, 'veri', 'requirements', 'REQ-001-x.md'), '---\nid: REQ-001\n---\n');
  writeFileSync(join(root, 'veri', 'notes.txt'), 'not a document');
  writeFileSync(join(root, 'README.md'), 'demo readme');
  writeFileSync(join(root, 'CLAUDE.md'), 'demo conventions');
  return root;
}

test('empty scaffold creates the four subdirectories with .gitkeep', () => {
  const root = tmp();
  const result = scaffoldProject(root);

  assert.equal(result.veriDir, join(root, 'veri'));
  assert.equal(result.docCount, 0);
  assert.deepEqual(result.filesWritten, []);
  assert.deepEqual(readdirSync(result.veriDir).sort(), [...VERI_SUBDIRS].sort());
  for (const sub of VERI_SUBDIRS) {
    assert.deepEqual(readdirSync(join(result.veriDir, sub)), ['.gitkeep']);
  }
});

test('a non-empty directory is fine — Veri lives alongside code', () => {
  const root = tmp();
  writeFileSync(join(root, 'package.json'), '{}');
  mkdirSync(join(root, 'src'));

  scaffoldProject(root);

  assert.equal(readFileSync(join(root, 'package.json'), 'utf8'), '{}');
  assert.ok(readdirSync(root).includes('veri'));
});

test('an existing veri/ throws ProjectExistsError and writes nothing', () => {
  const root = tmp();
  mkdirSync(join(root, 'veri'));
  writeFileSync(join(root, 'veri', 'mine.md'), 'do not touch');

  assert.throws(() => scaffoldProject(root), ProjectExistsError);
  assert.deepEqual(readdirSync(join(root, 'veri')), ['mine.md']);
});

test('demo scaffold copies veri/ verbatim and counts only markdown', () => {
  const demoRoot = fakeDemo();
  const root = tmp();

  const result = scaffoldProject(root, { demo: true, demoRoot });

  assert.equal(result.docCount, 1);
  assert.deepEqual(result.filesWritten, ['README.md', 'CLAUDE.md']);
  assert.deepEqual(result.filesSkipped, []);
  assert.equal(readFileSync(join(root, 'veri', 'notes.txt'), 'utf8'), 'not a document');
  assert.equal(readFileSync(join(root, 'README.md'), 'utf8'), 'demo readme');
});

test("demo scaffold never clobbers the user's own README/CLAUDE.md", () => {
  const demoRoot = fakeDemo();
  const root = tmp();
  writeFileSync(join(root, 'README.md'), 'mine');

  const result = scaffoldProject(root, { demo: true, demoRoot });

  assert.deepEqual(result.filesWritten, ['CLAUDE.md']);
  assert.deepEqual(result.filesSkipped, ['README.md']);
  assert.equal(readFileSync(join(root, 'README.md'), 'utf8'), 'mine');
});

test('demo scaffold without demoRoot is rejected before anything is written', () => {
  const root = tmp();
  assert.throws(() => scaffoldProject(root, { demo: true }), /demoRoot/);
  assert.equal(readdirSync(root).length, 0);
});
