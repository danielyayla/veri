import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approve, check, init } from './commands.ts';
import { CORPUS_FILE, SHIPPED_METHODS_ROOT, collectShellFacts, collectShells, loadShippedMethods, skillsEval, skillsInstall, skillsUpgrade } from './skills.ts';
import { DEFAULT_SKILL_SLUGS, casesForSkill, checkCorpusIntegrity, claudeCodeEmitter, parseTriggerCorpus } from '@verikb/core';

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

test('a draft review method emits no shell; an accepted one emits exactly one (WO-146)', async (t) => {
  const cwd = project(t);
  const file = writeMethod(cwd, 'review', methodText('MET-001', 'review', { status: 'draft' }));

  const drafted = await skillsInstall(cwd, { yes: true, all: true });
  assert.equal(drafted.code, 0, drafted.lines.join('\n'));
  assert.match(drafted.lines.join('\n'), /skip\s+MET-001 — status draft/);
  assert.deepEqual(shellPaths(cwd), []);

  writeFileSync(
    file,
    readFileSync(file, 'utf8').replace('status: draft', 'status: accepted\napproved: 2026-08-02'),
    'utf8',
  );
  const accepted = await skillsInstall(cwd, { yes: true, all: true });
  assert.equal(accepted.code, 0, accepted.lines.join('\n'));
  assert.deepEqual(shellPaths(cwd), ['.claude/skills/veri-review/SKILL.md']);
  const shell = readFileSync(join(cwd, '.claude/skills/veri-review/SKILL.md'), 'utf8');
  assert.match(shell, /^name: veri-review$/m);
  assert.match(shell, /MET-001/);
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

test('the shipped method library parses: the nine defaults REQ-040 names, plus the advanced review gate (WO-146)', () => {
  const shipped = loadShippedMethods();
  assert.equal(shipped.length, 10);
  assert.deepEqual(
    shipped.map((entry) => entry.slug).sort(),
    [...DEFAULT_SKILL_SLUGS, 'review'].sort(),
  );
  for (const entry of shipped) {
    assert.ok(entry.description.trim() !== '', `${entry.slug} ships an empty description`);
    assert.ok(entry.body.trim() !== '', `${entry.slug} ships an empty body`);
  }
});

test("every shipped method's skill id is declared in the trigger corpus at its REQ-040 tier — veri:review's cases and the did-it-work-vs-review pair now name a real method (WO-146)", () => {
  const corpus = parseTriggerCorpus(readFileSync(join(REPO_ROOT, 'skills/trigger-corpus.yaml'), 'utf8'));
  const declared = new Map(corpus.skills.map((skill) => [skill.id, skill.tier]));
  const shipped = loadShippedMethods();
  for (const method of shipped) {
    const id = `veri:${method.slug}`;
    assert.ok(declared.has(id), `${id} is not a declared corpus skill`);
    const tier = DEFAULT_SKILL_SLUGS.includes(method.slug) ? 'default' : 'advanced';
    assert.equal(declared.get(id), tier, `${id}: corpus tier disagrees with REQ-040's tiering`);
    assert.ok(casesForSkill(corpus, id).length > 0, `no corpus case expects ${id}`);
  }
  // The near-miss pair's second target is a method that exists, not a declared ghost.
  const pair = corpus.near_miss_pairs.find((candidate) => candidate.id === 'did-it-work-vs-review');
  assert.ok(pair, 'the did-it-work-vs-review pair is not declared');
  assert.ok(pair.skills.includes('veri:review'), 'the pair does not name veri:review');
  assert.ok(shipped.some((method) => method.slug === 'review'), 'no shipped method stands behind veri:review');
  assert.ok(
    corpus.cases.some((entry) => entry.pair === 'did-it-work-vs-review' && entry.expect === 'veri:review'),
    'the pair has no case on the veri:review side',
  );
});

test('the shipped corpus has referential integrity: every entry names a skill a shipped method stands behind (WO-147)', () => {
  const corpus = parseTriggerCorpus(readFileSync(join(REPO_ROOT, CORPUS_FILE), 'utf8'));
  const backed = loadShippedMethods().map((method) => `veri:${method.slug}`);
  assert.deepEqual(checkCorpusIntegrity(corpus, backed), []);
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

// --- Shell drift through veri check (WO-136) ----------------------------------

/**
 * The host half of WO-136: the collector feeding core's comparator, and the
 * severity that whole design turns on. The rules themselves are unit-tested
 * in core against fabricated facts; what needs a filesystem is that a real
 * harness directory reaches them, and that a drifted shell leaves both gates
 * open — `veri check` exits 0, and `veri approve` still works.
 */

function advisoriesIn(lines: string[]): string[] {
  return lines.filter((line) => line.startsWith('(advisory) '));
}

test('a project that never installed shells is never nagged about drift', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));

  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
  assert.equal(existsSync(join(cwd, '.claude')), false);
  assert.deepEqual(advisoriesIn(checked.lines).filter((line) => line.includes('SKILL.md')), []);
  assert.deepEqual(checked.lines.filter((line) => line.startsWith('(shell drift: skipped')), []);
});

test('a freshly installed shell is not drift', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  await skillsInstall(cwd, { yes: true });

  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
  assert.deepEqual(advisoriesIn(checked.lines).filter((line) => line.includes('SKILL.md')), []);
});

test('a hand-edited shell is an advisory: check reports it, names the repair, and still exits 0', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  await skillsInstall(cwd, { yes: true });

  const shell = join(cwd, '.claude/skills/veri-define/SKILL.md');
  writeFileSync(shell, readFileSync(shell, 'utf8').replace('description: "', 'description: "EDITED — '), 'utf8');

  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
  const drift = advisoriesIn(checked.lines).filter((line) => line.includes('SKILL.md'));
  assert.equal(drift.length, 1, checked.lines.join('\n'));
  assert.match(drift[0], /MET-001 would emit/);
  assert.match(drift[0], /veri skills install/);
  assert.match(checked.lines.at(-1) ?? '', /0 issues/);
});

test('a method amended after install drifts from the other side', async (t) => {
  const cwd = project(t);
  const file = writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  await skillsInstall(cwd, { yes: true });
  const before = readFileSync(join(cwd, '.claude/skills/veri-define/SKILL.md'), 'utf8');

  writeFileSync(file, methodText('MET-001', 'define', { description: 'A sharper trigger, written after the shell was installed.' }), 'utf8');

  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
  const drift = advisoriesIn(checked.lines).filter((line) => line.includes('SKILL.md'));
  assert.equal(drift.length, 1, checked.lines.join('\n'));
  // Nothing touched the file on disk — the method moved, not the shell.
  assert.equal(readFileSync(join(cwd, '.claude/skills/veri-define/SKILL.md'), 'utf8'), before);

  // And the repair the advisory names actually repairs it.
  assert.equal((await skillsInstall(cwd, { yes: true })).code, 0);
  assert.deepEqual(advisoriesIn((await check(cwd)).lines).filter((line) => line.includes('SKILL.md')), []);
});

test('retiring a method leaves an orphaned trigger until install is re-run', async (t) => {
  const cwd = project(t);
  const file = writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  await skillsInstall(cwd, { yes: true });
  writeFileSync(file, readFileSync(file, 'utf8').replace('status: accepted', 'status: retired'), 'utf8');

  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
  const orphan = advisoriesIn(checked.lines).filter((line) => line.includes('SKILL.md'));
  assert.equal(orphan.length, 1, checked.lines.join('\n'));
  assert.match(orphan[0], /still triggers MET-001, which is retired/);
  assert.match(orphan[0], /veri skills install/);
});

test('drift blocks nothing: veri approve still succeeds on an otherwise clean document', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  await skillsInstall(cwd, { yes: true });
  const shell = join(cwd, '.claude/skills/veri-define/SKILL.md');
  writeFileSync(shell, `${readFileSync(shell, 'utf8')}\nedited by hand\n`, 'utf8');

  mkdirSync(join(cwd, 'veri/requirements'), { recursive: true });
  writeFileSync(
    join(cwd, 'veri/requirements/REQ-001-a-clean-requirement.md'),
    ['---', 'id: REQ-001', 'type: requirement', 'title: A clean requirement', 'status: draft', 'created: 2026-08-01', 'updated: 2026-08-01', '---', '', '## Statement', '', 'The gate holds.', '', '## Acceptance criteria', '', '- [ ] It holds.', ''].join('\n'),
    'utf8',
  );

  const approved = await approve(cwd, 'REQ-001');
  assert.equal(approved.code, 0, approved.lines.join('\n'));
  assert.match(approved.lines.join('\n'), /draft → accepted/);

  // The advisory is still there, still not blocking.
  const checked = await check(cwd);
  assert.equal(checked.code, 0);
  assert.equal(advisoriesIn(checked.lines).filter((line) => line.includes('SKILL.md')).length, 1);
});

test('a hand-authored skill beside the generated ones is never reported', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  await skillsInstall(cwd, { yes: true });
  mkdirSync(join(cwd, '.claude/skills/my-own-skill'), { recursive: true });
  writeFileSync(join(cwd, '.claude/skills/my-own-skill/SKILL.md'), '---\nname: my-own-skill\n---\nmine\n', 'utf8');

  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
  assert.deepEqual(advisoriesIn(checked.lines).filter((line) => line.includes('SKILL.md')), []);
});

test('the collector reports the one harness this build emits for (WO-153: no selector flag)', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  await skillsInstall(cwd, { yes: true });
  const collected = collectShellFacts(cwd);
  assert.equal(collected.kind, 'ok');
  assert.deepEqual(
    collected.kind === 'ok' ? collected.shells.map((shell) => shell.path) : [],
    ['.claude/skills/veri-define/SKILL.md'],
  );
});

// --- The corpus runner: veri skills eval (WO-147, DEC-129) --------------------

/** A small sound corpus over the define and decide gates, written where the
    runner looks for it. */
function writeFixtureCorpus(cwd: string, { ghost = false } = {}): void {
  mkdirSync(join(cwd, 'skills'), { recursive: true });
  const text = [
    'version: 1',
    'skills:',
    '  - id: veri:define',
    '    tier: default',
    '    gate: requirements',
    '  - id: veri:decide',
    '    tier: default',
    '    gate: tradeoffs',
    ...(ghost ? ['  - id: veri:ghost', '    tier: advanced', '    gate: the beyond'] : []),
    'near_miss_pairs:',
    '  - id: define-vs-decide',
    '    skills: [veri:define, veri:decide]',
    '    boundary: b',
    'cases:',
    '  - id: TC-001',
    '    utterance: a want',
    '    expect: veri:define',
    '    kind: coverage',
    '    pair: define-vs-decide',
    '    rationale: r',
    '  - id: TC-002',
    '    utterance: a fork',
    '    expect: veri:decide',
    '    kind: coverage',
    '    pair: define-vs-decide',
    '    rationale: r',
    '  - id: TC-003',
    '    utterance: run the tests',
    '    expect: none',
    '    kind: negative',
    ...(ghost ? ['  - id: TC-004', '    utterance: a haunting', '    expect: veri:ghost', '    kind: coverage'] : []),
    '',
  ].join('\n');
  writeFileSync(join(cwd, ...CORPUS_FILE.split('/')), text, 'utf8');
}

/** A judge as the contract sees one: a script file, run as `node <path>`,
    quoted so the command survives every platform's shell. */
function writeJudge(t: { after: (fn: () => void) => void }, source: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-judge-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'judge.mjs');
  writeFileSync(file, source, 'utf8');
  return `"${process.execPath}" "${file}"`;
}

test('eval refuses a repo with no veri/ and a project with no corpus, each loudly', async (t) => {
  const bare = mkdtempSync(join(tmpdir(), 'veri-eval-bare-'));
  t.after(() => rmSync(bare, { recursive: true, force: true }));
  const noVeri = await skillsEval(bare);
  assert.equal(noVeri.code, 1);
  assert.match(noVeri.lines.join('\n'), /no veri\/ directory here/);

  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  const noCorpus = await skillsEval(cwd);
  assert.equal(noCorpus.code, 1);
  assert.match(noCorpus.lines.join('\n'), /no trigger corpus at skills\/trigger-corpus\.yaml/);
});

test('a corpus case naming a skill with no MET document fails validation loudly, and nothing is judged', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  writeMethod(cwd, 'decide', methodText('MET-002', 'decide'));
  writeFixtureCorpus(cwd, { ghost: true });

  // Even with a judge supplied, integrity fails first: grading against a
  // phantom skill would report noise as signal.
  const result = await skillsEval(cwd, { judge: writeJudge(t, 'console.log("none");\n') });
  assert.equal(result.code, 1);
  const output = result.lines.join('\n');
  assert.match(output, /TC-004 expects veri:ghost, which has no method document/);
  assert.match(output, /skill veri:ghost is declared but no method document stands behind it/);
  assert.match(output, /nothing was judged/);
  assert.ok(!output.includes('pass    TC-001'), output);
});

test('without a judge the run is integrity only, and says so with the contract', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  writeMethod(cwd, 'decide', methodText('MET-002', 'decide'));
  writeFixtureCorpus(cwd);

  const result = await skillsEval(cwd);
  assert.equal(result.code, 0, result.lines.join('\n'));
  const output = result.lines.join('\n');
  assert.match(output, /validates clean: 3 cases over 2 skills/);
  assert.match(output, /No judge supplied/);
  assert.match(output, /stdin/);
});

test('a judge that routes every utterance somewhere breaks the floor: false triggers counted, per-case failures named', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  writeMethod(cwd, 'decide', methodText('MET-002', 'decide'));
  writeFixtureCorpus(cwd);

  const result = await skillsEval(cwd, { judge: writeJudge(t, 'console.log("veri:define");\n') });
  assert.equal(result.code, 1);
  const output = result.lines.join('\n');
  assert.match(output, /pass    TC-001 → veri:define/);
  assert.match(output, /fail    TC-002 — expected veri:decide, the judge said veri:define/);
  assert.match(output, /FALSE   TC-003 — expected nothing, the judge fired veri:define/);
  assert.match(output, /1\/3 cases pass; negative set: 1 false trigger across 1 cases\./);
  assert.match(output, /floor is broken/);
});

test('a judge outside the contract is a judge error, reported per case and never a pass', async (t) => {
  const cwd = project(t);
  writeMethod(cwd, 'define', methodText('MET-001', 'define'));
  writeMethod(cwd, 'decide', methodText('MET-002', 'decide'));
  writeFixtureCorpus(cwd);

  const result = await skillsEval(cwd, { judge: writeJudge(t, 'console.log("veri:hallucinated");\n') });
  assert.equal(result.code, 1);
  const output = result.lines.join('\n');
  assert.match(output, /error   TC-001 — the judge answered "veri:hallucinated"/);
  assert.match(output, /3 judge errors/);
});

test('the full shipped corpus runs end to end: integrity clean, every case judged, per-case results reported (WO-147)', async (t) => {
  // The oracle judge answers from the corpus's own expectations — a stub, not
  // a model. What this proves is the runner: the lineup reaches the judge on
  // stdin per the contract, all coverage and negative cases execute, and the
  // report carries a line per case plus the negative set's count.
  const corpus = parseTriggerCorpus(readFileSync(join(REPO_ROOT, CORPUS_FILE), 'utf8'));
  const dir = mkdtempSync(join(tmpdir(), 'veri-oracle-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const oracle = Object.fromEntries(corpus.cases.map((entry) => [entry.utterance, entry.expect]));
  writeFileSync(join(dir, 'oracle.json'), JSON.stringify(oracle), 'utf8');
  writeFileSync(
    join(dir, 'judge.mjs'),
    [
      "import { readFileSync } from 'node:fs';",
      "const input = JSON.parse(readFileSync(0, 'utf8'));",
      "const oracle = JSON.parse(readFileSync(new URL('./oracle.json', import.meta.url), 'utf8'));",
      "if (!Array.isArray(input.skills) || input.skills.some((skill) => typeof skill.description !== 'string')) {",
      "  console.error('no lineup on stdin'); process.exit(2);",
      '}',
      "console.log('considering…');",
      "console.log(oracle[input.utterance] ?? 'none');",
      '',
    ].join('\n'),
    'utf8',
  );

  const result = await skillsEval(REPO_ROOT, { judge: `"${process.execPath}" "${join(dir, 'judge.mjs')}"` });
  assert.equal(result.code, 0, result.lines.join('\n'));
  const output = result.lines.join('\n');
  assert.match(output, /validates clean/);
  const perCase = result.lines.filter((line) => line.startsWith('pass    TC-'));
  assert.equal(perCase.length, corpus.cases.length, output);
  const negatives = corpus.cases.filter((entry) => entry.kind === 'negative').length;
  assert.match(output, new RegExp(`${corpus.cases.length}/${corpus.cases.length} cases pass; negative set: 0 false triggers across ${negatives} cases\\.`));
  assert.match(output, /floor holds/);
});
