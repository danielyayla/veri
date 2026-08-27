import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, init } from './commands.ts';
import { SHIPPED_METHODS_ROOT, collectShells, loadShippedMethods, skillsInstall, skillsUpgrade } from './skills.ts';
import { DEFAULT_SKILL_SLUGS, claudeCodeEmitter } from '@verikb/core';

/**
 * The host half of WO-135: the two commands over a real filesystem. These
 * cover the acceptance tests that need one — idempotence, retirement, the
 * ask-before-writing rule on a bare repository, upgrade's amendments, and
 * `veri check` reporting zero issues after each command.
 */

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

const BODY = [
  '## Purpose',
  '',
  'One gate, stated once.',
  '',
  '## What it reads',
  '',
  'The intent and whatever the user named.',
  '',
  '## The interview',
  '',
  'Ask what breaks before asking what to build.',
  '',
  '## What it files',
  '',
  'A draft document, linked to its evidence.',
  '',
  '## Guardrails',
  '',
  'Never stamp an approval.',
  '',
  '## Handoff',
  '',
  'Name the next gate.',
  '',
].join('\n');

function methodText(
  id: string,
  slug: string,
  { status = 'accepted', description = `Routes ${slug} utterances here and not to the gate next door.`, upstream = `veri/${slug}` as string | null, body = BODY, requires = ['get_context'], title = `veri:${slug} — a gate` } = {},
): string {
  return [
    '---',
    `id: ${id}`,
    'type: method',
    `title: ${JSON.stringify(title)}`,
    `status: ${status}`,
    `description: ${JSON.stringify(description)}`,
    'requires:',
    ...requires.map((tool) => `  - ${tool}`),
    ...(upstream === null ? [] : [`upstream: ${upstream}`]),
    'created: 2026-08-01',
    'updated: 2026-08-01',
    ...(status === 'accepted' ? ['approved: 2026-08-02'] : []),
    '---',
    '',
    body,
  ].join('\n');
}

function project(t: { after: (fn: () => void) => void }): string {
  const cwd = mkdtempSync(join(tmpdir(), 'veri-skills-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  assert.equal(init(cwd, { demo: false }).code, 0);
  return cwd;
}

function writeMethod(cwd: string, slug: string, text: string): string {
  const dir = join(cwd, 'veri/methods');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${slug}.md`);
  writeFileSync(file, text, 'utf8');
  return file;
}

function shellPaths(cwd: string): string[] {
  return collectShells(cwd, claudeCodeEmitter).map((shell) => shell.path);
}

// --- Nothing is written before the user is asked ------------------------------

test('neither command writes anything on a repo with no veri/ directory', async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), 'veri-skills-bare-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  writeFileSync(join(cwd, 'README.md'), '# some project\n', 'utf8');

  const installed = await skillsInstall(cwd, { yes: true });
  assert.equal(installed.code, 1);
  assert.match(installed.lines.join('\n'), /no veri\/ directory here/);
  assert.match(installed.lines.join('\n'), /veri init/);

  const upgraded = await skillsUpgrade(cwd, { yes: true });
  assert.equal(upgraded.code, 1);

  // Even with --yes, the bare repo is exactly as it was.
  assert.deepEqual(readdirSync(cwd).sort(), ['README.md']);
});

test('install without --yes and with nobody to ask writes nothing and says so', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));

  const result = await skillsInstall(cwd, {});
  assert.equal(result.code, 0);
  assert.match(result.lines.join('\n'), /Nothing was written\. Re-run with --yes/);
  assert.equal(existsSync(join(cwd, '.claude')), false);
});

test('declining the question writes nothing', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));

  const result = await skillsInstall(cwd, {}, async () => false);
  assert.equal(result.code, 0);
  assert.match(result.lines.join('\n'), /Nothing was written\./);
  assert.equal(existsSync(join(cwd, '.claude')), false);
});

// --- install ------------------------------------------------------------------

test('three accepted and two draft methods install exactly three shells, and check stays clean', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  writeMethod(cwd, 'decide', methodText('MET-002', 'decide'));
  writeMethod(cwd, 'implement', methodText('MET-003', 'implement'));
  writeMethod(cwd, 'health', methodText('MET-004', 'health', { status: 'draft' }));
  writeMethod(cwd, 'wayfinder', methodText('MET-005', 'wayfinder', { status: 'draft' }));

  const result = await skillsInstall(cwd, { yes: true });
  assert.equal(result.code, 0, result.lines.join('\n'));
  assert.deepEqual(shellPaths(cwd), [
    '.claude/skills/veri-decide/SKILL.md',
    '.claude/skills/veri-define/SKILL.md',
    '.claude/skills/veri-implement/SKILL.md',
  ]);

  const shell = readFileSync(join(cwd, '.claude/skills/veri-define/SKILL.md'), 'utf8');
  assert.match(shell, /^name: veri-define$/m);
  assert.match(shell, /MET-001/);
  assert.match(shell, /veri\/methods\/define\.md/);
  // The thin-pointer property, again at the filesystem edge: no coaching.
  assert.ok(!shell.includes('## Purpose'));
  assert.ok(!shell.includes('Ask what breaks before asking what to build.'));

  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
  assert.match(checked.lines.at(-1) ?? '', /0 issues/);
});

test('a second install over an unchanged project writes no file and reports a no-op', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  await skillsInstall(cwd, { yes: true });

  const file = join(cwd, '.claude/skills/veri-define/SKILL.md');
  const before = readFileSync(file, 'utf8');

  // No --yes and no way to ask: a no-op must not even reach the question.
  const second = await skillsInstall(cwd, {});
  assert.equal(second.code, 0);
  assert.match(second.lines.join('\n'), /Nothing to do/);
  assert.ok(!second.lines.join('\n').includes('Re-run with --yes'));
  assert.equal(readFileSync(file, 'utf8'), before);
});

test('retiring a method removes its shell; the document and its inbound links survive', async (t) => {
  const cwd = project(t);
  const file = writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  // An inbound [[MET-001]] reference from another document.
  mkdirSync(join(cwd, 'veri/sources'), { recursive: true });
  writeFileSync(
    join(cwd, 'veri/sources/SRC-001-why.md'),
    ['---', 'id: SRC-001', 'type: source', 'title: Why we staffed this gate', 'status: imported', 'created: 2026-08-01', 'updated: 2026-08-01', '---', '', 'The gate is [[MET-001]].', ''].join('\n'),
    'utf8',
  );

  await skillsInstall(cwd, { yes: true });
  assert.equal(existsSync(join(cwd, '.claude/skills/veri-define/SKILL.md')), true);

  writeFileSync(file, readFileSync(file, 'utf8').replace('status: accepted', 'status: retired'), 'utf8');
  const result = await skillsInstall(cwd, { yes: true });
  assert.equal(result.code, 0, result.lines.join('\n'));
  assert.match(result.lines.join('\n'), /remove\s+\.claude\/skills\/veri-define\/SKILL\.md/);
  assert.equal(existsSync(join(cwd, '.claude/skills/veri-define')), false);

  // The method document itself is untouched, and the inbound link still resolves.
  assert.equal(existsSync(file), true);
  assert.match(readFileSync(file, 'utf8'), /^id: MET-001$/m);
  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
});

test('a hand-authored skill beside the generated ones is never removed', async (t) => {
  const cwd = project(t);
  const file = writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  mkdirSync(join(cwd, '.claude/skills/my-own'), { recursive: true });
  writeFileSync(join(cwd, '.claude/skills/my-own/SKILL.md'), '---\nname: my-own\ndescription: mine\n---\n\nMine.\n', 'utf8');

  await skillsInstall(cwd, { yes: true });
  writeFileSync(file, readFileSync(file, 'utf8').replace('status: accepted', 'status: retired'), 'utf8');
  await skillsInstall(cwd, { yes: true });

  assert.equal(existsSync(join(cwd, '.claude/skills/my-own/SKILL.md')), true);
});

test('the advanced tier needs --all', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'archaeology', methodText('MET-001', 'archaeology'));

  const first = await skillsInstall(cwd, { yes: true });
  assert.match(first.lines.join('\n'), /advanced tier/);
  assert.deepEqual(shellPaths(cwd), []);

  await skillsInstall(cwd, { yes: true, all: true });
  assert.deepEqual(shellPaths(cwd), ['.claude/skills/veri-archaeology/SKILL.md']);
});

test('an unknown harness is refused before anything is read', async (t) => {
  const cwd = project(t);
  const result = await skillsInstall(cwd, { yes: true, harness: 'emacs' });
  assert.equal(result.code, 1);
  assert.match(result.lines.join('\n'), /unknown harness "emacs"/);
});

// --- upgrade ------------------------------------------------------------------

function shippedFixture(t: { after: (fn: () => void) => void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-shipped-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'define.md'), methodText('MET-001', 'define'), 'utf8');
  writeFileSync(join(dir, 'decide.md'), methodText('MET-002', 'decide'), 'utf8');
  return dir;
}

test('upgrade on a locally edited method proposes an amendment and does not touch the accepted file', async (t) => {
  const cwd = project(t);
  const from = shippedFixture(t);
  const file = writeMethod(cwd, 'define', methodText('MET-004', 'define', { description: 'Our own trigger paragraph, tuned for this team.' }));
  const before = readFileSync(file, 'utf8');

  const result = await skillsUpgrade(cwd, { yes: true, from });
  assert.equal(result.code, 0, result.lines.join('\n'));

  const amendment = join(cwd, 'veri/amendments/MET-004-define.md');
  assert.equal(existsSync(amendment), true);
  const text = readFileSync(amendment, 'utf8');
  assert.match(text, /Nothing was changed/);
  assert.match(text, /## Shipped `description:`/);

  // The accepted method is byte-for-byte as it was.
  assert.equal(readFileSync(file, 'utf8'), before);

  // The proposal is not a document: it never enters the graph, and check is clean.
  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
  assert.match(checked.lines.at(-1) ?? '', /0 issues/);
  assert.ok(!checked.lines.join('\n').includes('amendments/'));
});

test('upgrade leaves a method with no upstream alone, even when its title matches a shipped one', async (t) => {
  const cwd = project(t);
  const from = shippedFixture(t);
  const file = writeMethod(
    cwd,
    'define',
    methodText('MET-004', 'define', { upstream: null, title: 'veri:define — a gate', description: 'Entirely ours.', body: '## Purpose\n\nOurs alone.\n' }),
  );
  const before = readFileSync(file, 'utf8');

  const result = await skillsUpgrade(cwd, { yes: true, from });
  assert.equal(result.code, 0);
  assert.match(result.lines.join('\n'), /own\s+MET-004/);
  assert.equal(readFileSync(file, 'utf8'), before);
  assert.equal(existsSync(join(cwd, 'veri/amendments')), false);
});

test('upgrade over an unchanged project proposes nothing', async (t) => {
  const cwd = project(t);
  const from = shippedFixture(t);
  writeMethod(cwd, 'define', methodText('MET-004', 'define'));

  const result = await skillsUpgrade(cwd, { yes: true, from });
  assert.match(result.lines.join('\n'), /Nothing to propose/);
  assert.equal(existsSync(join(cwd, 'veri/amendments')), false);
});

test('upgrade without --yes and with nobody to ask writes nothing', async (t) => {
  const cwd = project(t);
  const from = shippedFixture(t);
  writeMethod(cwd, 'define', methodText('MET-004', 'define', { description: 'Ours.' }));

  const result = await skillsUpgrade(cwd, { from });
  assert.match(result.lines.join('\n'), /Nothing was written\. Re-run with --yes/);
  assert.equal(existsSync(join(cwd, 'veri/amendments')), false);
});

// --- The shipped library ------------------------------------------------------

test('the shipped method library parses and covers the nine defaults REQ-040 names', () => {
  const shipped = loadShippedMethods();
  assert.equal(shipped.length, 9);
  assert.deepEqual(
    shipped.map((entry) => entry.slug).sort(),
    [...DEFAULT_SKILL_SLUGS].sort(),
  );
  for (const entry of shipped) {
    assert.ok(entry.description.trim() !== '', `${entry.slug} ships an empty description`);
    assert.ok(entry.body.trim() !== '', `${entry.slug} ships an empty body`);
  }
});

test('the shipped library is byte-identical to the methods this repository authors', () => {
  const authored = join(REPO_ROOT, 'veri/methods');
  const names = readdirSync(authored).filter((name) => name.endsWith('.md')).sort();
  assert.deepEqual(readdirSync(SHIPPED_METHODS_ROOT).filter((name) => name.endsWith('.md')).sort(), names);
  for (const name of names) {
    assert.equal(
      readFileSync(join(SHIPPED_METHODS_ROOT, name), 'utf8'),
      readFileSync(join(authored, name), 'utf8'),
      `packages/cli/methods/${name} has drifted from veri/methods/${name} — re-copy it, the shipped library is the authored one`,
    );
  }
});
