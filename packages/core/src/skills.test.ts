import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument } from './parse.ts';
import { AMENDMENTS_DIR, METHODS_DIR } from './pending.ts';
import {
  DEFAULT_SKILL_SLUGS,
  SHELL_MARKER,
  claudeCodeEmitter,
  isDefaultTier,
  isEmittable,
  methodSlug,
  planMethodUpgrade,
  planSkillInstall,
  shippedMethodFrom,
  skillName,
} from './skills.ts';
import type { VeriDocument } from './types.ts';

/**
 * The pure half of WO-135. Everything the acceptance tests turn on that does
 * not need a filesystem lives here: the thin-pointer property DEC-018
 * requires (asserted against the method body, never assumed), the accepted-
 * only rule, tiering read from REQ-040's enumerated list, idempotence, and
 * upgrade's match-on-`upstream:` behaviour.
 */

const BODY = [
  '## Purpose',
  '',
  'The gate where a vague want becomes a requirement somebody can approve.',
  '',
  '## What it reads',
  '',
  'The current intent, the sources nearby, and whatever the user names.',
  '',
  '## The interview',
  '',
  'Ask what breaks today before asking what to build.',
  '',
  '## What it files',
  '',
  'A draft requirement, linked to the evidence it came from.',
  '',
  '## Guardrails',
  '',
  'Never stamp an approval. Never invent evidence to silence an advisory.',
  '',
  '## Handoff',
  '',
  'Approve it, then run veri:plan-work.',
  '',
].join('\n');

interface MethodSpec {
  id: string;
  slug?: string;
  status?: string;
  title?: string;
  description?: string;
  requires?: string[];
  upstream?: string | null;
  body?: string;
}

function method(spec: MethodSpec): VeriDocument {
  const slug = spec.slug ?? 'define';
  const upstream = spec.upstream === null ? undefined : (spec.upstream ?? `veri/${slug}`);
  const text = [
    '---',
    `id: ${spec.id}`,
    'type: method',
    `title: ${JSON.stringify(spec.title ?? `veri:${slug} — a gate`)}`,
    `status: ${spec.status ?? 'accepted'}`,
    `description: ${JSON.stringify(spec.description ?? `Routes utterances about ${slug} to this gate: "an example", "another one".`)}`,
    'requires:',
    ...(spec.requires ?? ['get_context', 'file_requirement']).map((tool) => `  - ${tool}`),
    ...(upstream === undefined ? [] : [`upstream: ${upstream}`]),
    'created: 2026-08-01',
    'updated: 2026-08-01',
    ...(spec.status === 'accepted' || spec.status === undefined ? ['approved: 2026-08-02'] : []),
    '---',
    '',
    spec.body ?? BODY,
  ].join('\n');
  const outcome = parseDocument(`${METHODS_DIR}/${slug}.md`, text);
  assert.ok(outcome.document, `fixture ${spec.id} did not parse: ${outcome.issues.map((issue) => issue.message).join('; ')}`);
  return outcome.document;
}

// --- The default tier is REQ-040's list, transcribed --------------------------

test('the default tier is exactly the nine methods REQ-040 enumerates by name', () => {
  assert.deepEqual([...DEFAULT_SKILL_SLUGS].sort(), [
    'decide',
    'define',
    'did-it-work',
    'evidence-intake',
    'health',
    'implement',
    'plan-work',
    'product-discovery',
    'wayfinder',
  ]);
  assert.equal(DEFAULT_SKILL_SLUGS.length, 9);
});

test('an advanced shipped method is not default tier; a project-authored one is', () => {
  assert.equal(isDefaultTier(method({ id: 'MET-001', slug: 'archaeology' })), false);
  assert.equal(isDefaultTier(method({ id: 'MET-002', slug: 'define' })), true);
  // No upstream: means the project wrote and approved it deliberately.
  assert.equal(isDefaultTier(method({ id: 'MET-003', slug: 'our-own', upstream: null })), true);
});

test('a method slug comes from upstream first, then the title token', () => {
  assert.equal(methodSlug(method({ id: 'MET-001', slug: 'plan-work' })), 'plan-work');
  assert.equal(methodSlug(method({ id: 'MET-002', slug: 'x', upstream: null, title: 'veri:triage — our own gate' })), 'triage');
  assert.equal(methodSlug(method({ id: 'MET-003', slug: 'x', upstream: null, title: 'Our Release Review' })), 'our-release-review');
  assert.equal(skillName(method({ id: 'MET-004', slug: 'health' })), 'veri-health');
});

// --- The shell is a thin pointer (DEC-018) -----------------------------------

test('the shell carries the description byte-identically and a resolvable pointer to the MET- id', () => {
  const description = 'Routes "I have an idea" and nothing else — not "start WO-12", which is veri:implement\'s.\nA second line, with a colon: and a #hash.';
  const doc = method({ id: 'MET-007', slug: 'product-discovery', description });
  const shell = claudeCodeEmitter.emit(doc);

  assert.equal(shell.path, '.claude/skills/veri-product-discovery/SKILL.md');
  assert.equal(shell.name, 'veri-product-discovery');
  assert.equal(shell.methodId, 'MET-007');

  // Byte-identical: the emitted frontmatter parses back to the same string.
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(shell.content);
  assert.ok(frontmatter, 'the shell has no frontmatter');
  const line = /^description: (.*)$/m.exec(frontmatter[1]);
  assert.ok(line, 'the shell frontmatter has no description');
  assert.equal(JSON.parse(line[1]), description);

  // Resolvable pointer: the id and the method's own file, both named.
  assert.match(shell.content, /MET-007/);
  assert.match(shell.content, /veri\/methods\/product-discovery\.md/);
});

test('the shell contains no section of the method body — asserted, not assumed', () => {
  const doc = method({ id: 'MET-005', slug: 'define' });
  const shell = claudeCodeEmitter.emit(doc);

  for (const heading of doc.body.match(/^## .+$/gm) ?? []) {
    assert.ok(!shell.content.includes(heading), `the shell repeats the method's ${heading}`);
  }
  const prose = doc.body
    .split('\n')
    .map((each) => each.trim())
    .filter((each) => each !== '' && !each.startsWith('#'));
  assert.ok(prose.length >= 5, 'the fixture body is too thin to prove anything');
  for (const sentence of prose) {
    assert.ok(!shell.content.includes(sentence), `the shell repeats coaching from the method body: ${sentence}`);
  }
  // What it does carry: the marker, the id, and the declared tools.
  assert.ok(shell.content.includes(SHELL_MARKER));
  assert.match(shell.content, /`get_context`/);
});

test('emitting is deterministic — the same method emits the same bytes', () => {
  const doc = method({ id: 'MET-006', slug: 'decide' });
  assert.equal(claudeCodeEmitter.emit(doc).content, claudeCodeEmitter.emit(doc).content);
});

test('the emitter owns its own paths and nothing else', () => {
  assert.equal(claudeCodeEmitter.owns('.claude/skills/veri-define/SKILL.md'), true);
  assert.equal(claudeCodeEmitter.owns('.claude/skills/veri-define/reference.md'), false);
  assert.equal(claudeCodeEmitter.owns('.claude/agents/thing.md'), false);
  assert.equal(claudeCodeEmitter.owns('veri/methods/define.md'), false);
});

// --- planSkillInstall --------------------------------------------------------

test('three accepted and two draft methods produce exactly three shells', () => {
  const documents = [
    method({ id: 'MET-001', slug: 'define' }),
    method({ id: 'MET-002', slug: 'decide' }),
    method({ id: 'MET-003', slug: 'implement' }),
    method({ id: 'MET-004', slug: 'health', status: 'draft' }),
    method({ id: 'MET-005', slug: 'wayfinder', status: 'draft' }),
  ];
  const plan = planSkillInstall(documents, []);
  assert.equal(plan.write.length, 3);
  assert.deepEqual(
    plan.write.map((shell) => shell.methodId),
    ['MET-001', 'MET-002', 'MET-003'],
  );
  assert.equal(plan.skipped.length, 2);
  assert.ok(plan.skipped.every((skip) => skip.reason.includes('status draft')));
  assert.equal(plan.noop, false);
});

test('retired and withdrawn methods never emit', () => {
  for (const status of ['draft', 'retired', 'withdrawn']) {
    const plan = planSkillInstall([method({ id: 'MET-001', slug: 'define', status })], []);
    assert.equal(plan.write.length, 0, `${status} emitted a shell`);
    assert.equal(isEmittable(method({ id: 'MET-001', slug: 'define', status })), false);
  }
});

test('a second install over an unchanged project is a no-op', () => {
  const documents = [method({ id: 'MET-001', slug: 'define' }), method({ id: 'MET-002', slug: 'decide' })];
  const first = planSkillInstall(documents, []);
  const onDisk = first.write.map((shell) => ({ path: shell.path, content: shell.content }));
  const second = planSkillInstall(documents, onDisk);
  assert.deepEqual(second.write, []);
  assert.deepEqual(second.remove, []);
  assert.equal(second.unchanged.length, 2);
  assert.equal(second.noop, true);
});

test('an edited shell is refreshed rather than left drifted', () => {
  const documents = [method({ id: 'MET-001', slug: 'define' })];
  const shell = planSkillInstall(documents, []).write[0];
  const plan = planSkillInstall(documents, [{ path: shell.path, content: `${shell.content}\nhand-edited\n` }]);
  assert.equal(plan.write.length, 1);
  assert.equal(plan.noop, false);
});

test('the advanced tier is skipped by default and emitted with --all', () => {
  const documents = [method({ id: 'MET-001', slug: 'define' }), method({ id: 'MET-002', slug: 'archaeology' })];
  const byDefault = planSkillInstall(documents, []);
  assert.deepEqual(
    byDefault.write.map((shell) => shell.methodId),
    ['MET-001'],
  );
  assert.deepEqual(
    byDefault.skipped.map((skip) => skip.id),
    ['MET-002'],
  );
  assert.match(byDefault.skipped[0].reason, /advanced tier/);

  const all = planSkillInstall(documents, [], { all: true });
  assert.equal(all.write.length, 2);
});

test('an advanced shell already installed is kept current, never silently removed', () => {
  const documents = [method({ id: 'MET-002', slug: 'archaeology' })];
  const shell = planSkillInstall(documents, [], { all: true }).write[0];
  const plan = planSkillInstall(documents, [{ path: shell.path, content: shell.content }]);
  assert.deepEqual(plan.remove, []);
  assert.equal(plan.unchanged.length, 1);
  assert.equal(plan.noop, true);
});

test('retiring a method removes its generated shell and nothing else', () => {
  const accepted = [method({ id: 'MET-001', slug: 'define' })];
  const shell = planSkillInstall(accepted, []).write[0];
  const onDisk = [
    { path: shell.path, content: shell.content },
    // A hand-authored skill in the same directory: no marker, never ours.
    { path: '.claude/skills/my-own-skill/SKILL.md', content: '---\nname: my-own-skill\n---\nmine\n' },
  ];
  const plan = planSkillInstall([method({ id: 'MET-001', slug: 'define', status: 'retired' })], onDisk);
  assert.deepEqual(
    plan.remove.map((stale) => stale.path),
    [shell.path],
  );
  assert.match(plan.remove[0].reason, /no longer an accepted method/);
});

// --- planMethodUpgrade -------------------------------------------------------

const SHIPPED = [
  shippedMethodFrom(method({ id: 'MET-000', slug: 'define' })),
  shippedMethodFrom(method({ id: 'MET-000', slug: 'decide' })),
];

test('an unedited project method is up to date and gets no amendment', () => {
  const plan = planMethodUpgrade([method({ id: 'MET-001', slug: 'define' })], SHIPPED);
  assert.deepEqual(plan.amendments, []);
  assert.deepEqual(plan.upToDate, ['MET-001']);
  assert.equal(plan.noop, true);
});

test('a locally edited method produces a reviewable amendment outside methods/', () => {
  const edited = method({
    id: 'MET-001',
    slug: 'define',
    description: 'We rewrote this trigger paragraph for our team.',
    body: `${BODY}\n## Our extra section\n\nOurs.\n`,
  });
  const plan = planMethodUpgrade([edited], SHIPPED);
  assert.equal(plan.amendments.length, 1);
  const amendment = plan.amendments[0];
  assert.deepEqual(amendment.changed, ['description', 'body']);
  assert.equal(amendment.file, `${AMENDMENTS_DIR}/MET-001-define.md`);
  assert.ok(!amendment.file.startsWith(`${METHODS_DIR}/`), 'the proposal must not land in methods/');
  assert.match(amendment.content, /Nothing was changed/);
  // The proposal carries the shipped text, so it is reviewable on its own.
  assert.ok(amendment.content.includes(SHIPPED[0].description));
  assert.ok(amendment.content.includes('## Shipped body'));
  // And it is not a document: no id in frontmatter, no frontmatter at all.
  assert.ok(!amendment.content.startsWith('---'));
});

test('a changed requires: list is proposed on its own', () => {
  const edited = method({ id: 'MET-001', slug: 'define', requires: ['get_context'] });
  const plan = planMethodUpgrade([edited], SHIPPED);
  assert.deepEqual(plan.amendments[0].changed, ['requires']);
});

test('a method with no upstream: is left completely alone, title collision included', () => {
  const own = method({
    id: 'MET-009',
    slug: 'define',
    upstream: null,
    title: 'veri:define — interviewing intent into a requirement worth approving',
    description: 'Our own thing entirely.',
    body: '## Purpose\n\nOurs.\n',
  });
  const plan = planMethodUpgrade([own], SHIPPED);
  assert.deepEqual(plan.amendments, []);
  assert.deepEqual(plan.own, ['MET-009']);
  assert.equal(plan.noop, true);
});

test('upgrade reports what it will not do: unknown upstreams and uninstalled gates', () => {
  const plan = planMethodUpgrade([method({ id: 'MET-001', slug: 'define' }), method({ id: 'MET-002', slug: 'gone', upstream: 'veri/gone' })], SHIPPED);
  assert.deepEqual(plan.unmatched, [{ id: 'MET-002', upstream: 'veri/gone' }]);
  assert.deepEqual(plan.absent, ['veri/decide']);
});

test('shippedMethodFrom refuses a method with no upstream — the library is keyed on it', () => {
  assert.throws(() => shippedMethodFrom(method({ id: 'MET-001', slug: 'define', upstream: null })), /upstream/);
});
