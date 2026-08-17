import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProjectExistsError, VERI_SUBDIRS, scaffoldProject } from './scaffold.ts';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'veri-scaffold-'));
}

/** A stand-in for packages/cli/demo: a project root with veri/ + a README. */
function fakeDemo(): string {
  const root = tmp();
  mkdirSync(join(root, 'veri', 'requirements'), { recursive: true });
  writeFileSync(join(root, 'veri', 'requirements', 'REQ-001-x.md'), '---\nid: REQ-001\n---\n');
  writeFileSync(join(root, 'veri', 'notes.txt'), 'not a document');
  writeFileSync(join(root, 'README.md'), 'demo readme');
  return root;
}

test('empty scaffold creates the four subdirectories, the default workflow, and pointer files', () => {
  const root = tmp();
  const result = scaffoldProject(root);

  assert.equal(result.veriDir, join(root, 'veri'));
  assert.equal(result.docCount, 1);
  assert.deepEqual(result.filesWritten, ['AGENTS.md', 'CLAUDE.md']);
  assert.deepEqual(readdirSync(result.veriDir).sort(), [...VERI_SUBDIRS, 'format', 'templates', 'workflow.md'].sort());
  // Every new project is born at the current format (REQ-015, DEC-030).
  assert.equal(readFileSync(join(result.veriDir, 'format'), 'utf8'), '1\n');
  for (const sub of VERI_SUBDIRS) {
    assert.deepEqual(readdirSync(join(result.veriDir, sub)), ['.gitkeep']);
  }
  // Default templates ship as project files (REQ-010 / DEC-023), one per type,
  // excluded from docCount — templates are not documents.
  assert.deepEqual(
    readdirSync(join(result.veriDir, 'templates')).sort(),
    ['decision.md', 'requirement.md', 'source.md', 'work-order.md', 'workflow.md'],
  );

  const workflow = readFileSync(join(result.veriDir, 'workflow.md'), 'utf8');
  assert.match(workflow, /^---\nid: WF-001\ntype: workflow\n/);
  assert.match(workflow, /\nstatus: accepted\napproved: \d{4}-\d{2}-\d{2}\n/);
  // The default workflow is harness-neutral: no vendor, harness, or model names.
  for (const name of ['Claude', 'Codex', 'Cursor', 'Copilot', 'GPT', 'Gemini', 'Anthropic', 'OpenAI']) {
    assert.ok(!workflow.includes(name), `default workflow must not mention ${name}`);
  }
  assert.match(readFileSync(join(root, 'AGENTS.md'), 'utf8'), /managed with Veri/);
  assert.match(readFileSync(join(root, 'CLAUDE.md'), 'utf8'), /See AGENTS\.md/);
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

test('demo scaffold copies veri/ verbatim, adds the default workflow, and counts only markdown', () => {
  const demoRoot = fakeDemo();
  const root = tmp();

  const result = scaffoldProject(root, { demo: true, demoRoot });

  assert.equal(result.docCount, 2); // REQ-001-x.md + the default workflow.md
  assert.deepEqual(result.filesWritten, ['README.md', 'AGENTS.md', 'CLAUDE.md']);
  assert.deepEqual(result.filesSkipped, []);
  assert.equal(readFileSync(join(root, 'veri', 'notes.txt'), 'utf8'), 'not a document');
  assert.equal(readFileSync(join(root, 'README.md'), 'utf8'), 'demo readme');
  assert.match(readFileSync(join(root, 'veri', 'workflow.md'), 'utf8'), /id: WF-001/);
  // A demo without its own marker gets stamped at the current format.
  assert.equal(readFileSync(join(root, 'veri', 'format'), 'utf8'), '1\n');
});

test("a demo's own format marker wins over the stamp", () => {
  const demoRoot = fakeDemo();
  writeFileSync(join(demoRoot, 'veri', 'format'), '1\n');
  const root = tmp();
  scaffoldProject(root, { demo: true, demoRoot });
  assert.equal(readFileSync(join(root, 'veri', 'format'), 'utf8'), '1\n');
});

test("a demo's own workflow.md wins over the default", () => {
  const demoRoot = fakeDemo();
  writeFileSync(join(demoRoot, 'veri', 'workflow.md'), 'DEMO-WORKFLOW-MARKER');
  const root = tmp();

  scaffoldProject(root, { demo: true, demoRoot });

  assert.equal(readFileSync(join(root, 'veri', 'workflow.md'), 'utf8'), 'DEMO-WORKFLOW-MARKER');
});

test("demo scaffold never clobbers the user's own root files", () => {
  const demoRoot = fakeDemo();
  const root = tmp();
  writeFileSync(join(root, 'README.md'), 'mine');
  writeFileSync(join(root, 'AGENTS.md'), 'my agents file');

  const result = scaffoldProject(root, { demo: true, demoRoot });

  assert.deepEqual(result.filesWritten, ['CLAUDE.md']);
  assert.deepEqual(result.filesSkipped, ['README.md', 'AGENTS.md']);
  assert.equal(readFileSync(join(root, 'README.md'), 'utf8'), 'mine');
  assert.equal(readFileSync(join(root, 'AGENTS.md'), 'utf8'), 'my agents file');
});

test('demo scaffold without demoRoot is rejected before anything is written', () => {
  const root = tmp();
  assert.throws(() => scaffoldProject(root, { demo: true }), /demoRoot/);
  assert.equal(readdirSync(root).length, 0);
});
