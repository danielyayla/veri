import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  casesForSkill,
  checkTriggerCorpus,
  normalizeUtterance,
  parseTriggerCorpus,
} from './skill-corpus.ts';

/** The committed corpus this repository ships (WO-130). Read from the repo
    root the way self.test.ts reads `veri/` — the artifact is repo-level, the
    schema that holds it is core's. */
const CORPUS_PATH = fileURLToPath(new URL('../../../skills/trigger-corpus.yaml', import.meta.url));
const corpus = parseTriggerCorpus(readFileSync(CORPUS_PATH, 'utf8'));

/** SRC-060's fourteen skills, named here so dropping one from the corpus
    fails rather than silently shrinking what the library claims to staff. */
const SRC_060_SKILLS = [
  'veri:wayfinder',
  'veri:archaeology',
  'veri:product-discovery',
  'veri:user-discovery',
  'veri:evidence-intake',
  'veri:define',
  'veri:decide',
  'veri:approval-session',
  'veri:plan-work',
  'veri:implement',
  'veri:did-it-work',
  'veri:review',
  'veri:health',
  'veri:onboard',
];

/** REQ-040's nine defaults; SRC-060's editorial note is explicit that the
    other five are advanced and that REQ-040 is the tiering authority. */
const REQ_040_DEFAULTS = [
  'veri:wayfinder',
  'veri:product-discovery',
  'veri:evidence-intake',
  'veri:define',
  'veri:decide',
  'veri:plan-work',
  'veri:implement',
  'veri:did-it-work',
  'veri:health',
];

/** The five adjacent gates WO-130 names as the ones that actually need
    discriminating. */
const NAMED_PAIRS = [
  'define-vs-decide',
  'plan-work-vs-implement',
  'product-discovery-vs-user-discovery',
  'did-it-work-vs-review',
  'wayfinder-vs-archaeology',
];

/** The vague front-door utterances REQ-040 names by example. */
const REQ_040_FRONT_DOOR = [
  'I have an idea for a product',
  'I need to change something in this codebase',
  'what should I work on next?',
  'why did we build this this way?',
];

test('the committed corpus satisfies its own invariants', () => {
  assert.deepEqual(checkTriggerCorpus(corpus), []);
});

test('every case is well-formed and every expected skill is declared', () => {
  const declared = new Set(corpus.skills.map((skill) => skill.id));
  for (const entry of corpus.cases) {
    assert.match(entry.id, /^TC-\d{3,}$/, `${entry.id}: malformed case id`);
    assert.ok(entry.utterance.trim().length > 0, `${entry.id}: empty utterance`);
    if (entry.expect === 'none') {
      assert.equal(entry.kind, 'negative', `${entry.id}: expects nothing but is not a negative`);
    } else {
      assert.ok(declared.has(entry.expect), `${entry.id}: expects unknown skill ${entry.expect}`);
    }
  }
});

test('no utterance appears twice', () => {
  const seen = new Map<string, string>();
  for (const entry of corpus.cases) {
    const normalized = normalizeUtterance(entry.utterance);
    assert.equal(seen.get(normalized), undefined, `${entry.id} repeats ${seen.get(normalized)}`);
    seen.set(normalized, entry.id);
  }
});

test('case ids are unique', () => {
  const ids = corpus.cases.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("SRC-060's fourteen skills are declared, tiered, and covered", () => {
  assert.deepEqual([...corpus.skills.map((skill) => skill.id)].sort(), [...SRC_060_SKILLS].sort());
  const defaults = corpus.skills.filter((skill) => skill.tier === 'default').map((skill) => skill.id);
  assert.deepEqual(defaults.sort(), [...REQ_040_DEFAULTS].sort());
  for (const id of SRC_060_SKILLS) {
    assert.ok(casesForSkill(corpus, id).length > 0, `no utterance expects ${id}`);
  }
});

test('each named near-miss pair has a case on both sides, each with a rationale', () => {
  const declared = corpus.near_miss_pairs.map((pair) => pair.id);
  for (const id of NAMED_PAIRS) {
    const pair = corpus.near_miss_pairs.find((candidate) => candidate.id === id);
    assert.ok(pair, `${id} is not declared (declared: ${declared.join(', ')})`);
    assert.ok(pair.boundary.trim().length > 0, `${id}: no boundary statement`);
    for (const skill of pair.skills) {
      const cases = corpus.cases.filter((entry) => entry.pair === id && entry.expect === skill);
      assert.ok(cases.length > 0, `${id}: no case on the ${skill} side`);
      for (const entry of cases) {
        assert.ok(entry.rationale && entry.rationale.trim().length > 0, `${entry.id}: no rationale`);
      }
    }
  }
});

test('the negative set covers coding requests, codebase questions, and chit-chat', () => {
  const negatives = corpus.cases.filter((entry) => entry.kind === 'negative');
  assert.ok(negatives.length >= 10, `negative set is thin: ${negatives.length} cases`);
  for (const entry of negatives) {
    assert.equal(entry.expect, 'none', `${entry.id}: a negative must expect nothing`);
    assert.equal(entry.pair, undefined, `${entry.id}: a negative cannot sit on a near-miss pair`);
  }
});

test("REQ-040's four front-door utterances are present and route to the front door", () => {
  for (const utterance of REQ_040_FRONT_DOOR) {
    const entry = corpus.cases.find(
      (candidate) => normalizeUtterance(candidate.utterance) === normalizeUtterance(`${utterance}.`)
        || normalizeUtterance(candidate.utterance) === normalizeUtterance(utterance),
    );
    assert.ok(entry, `missing front-door utterance: ${utterance}`);
    assert.equal(entry.kind, 'front-door', `${entry.id}: not marked front-door`);
    assert.equal(entry.expect, 'veri:wayfinder', `${entry.id}: front-door utterances route to the front door`);
  }
});

test('checkTriggerCorpus reports the problems it is there to catch', () => {
  const sound = {
    version: 1 as const,
    skills: [
      { id: 'veri:define', tier: 'default' as const, gate: 'requirements' },
      { id: 'veri:decide', tier: 'default' as const, gate: 'tradeoffs' },
    ],
    near_miss_pairs: [
      { id: 'define-vs-decide', skills: ['veri:define', 'veri:decide'] as [string, string], boundary: 'b' },
    ],
    cases: [
      { id: 'TC-001', utterance: 'a want', expect: 'veri:define', kind: 'coverage' as const, pair: 'define-vs-decide', rationale: 'r' },
      { id: 'TC-002', utterance: 'a fork', expect: 'veri:decide', kind: 'coverage' as const, pair: 'define-vs-decide', rationale: 'r' },
      { id: 'TC-003', utterance: 'run the tests', expect: 'none', kind: 'negative' as const },
    ],
  };
  assert.deepEqual(checkTriggerCorpus(sound), []);

  const duplicated = { ...sound, cases: [...sound.cases, { ...sound.cases[0]!, id: 'TC-004', utterance: 'A  Want ' }] };
  assert.deepEqual(checkTriggerCorpus(duplicated), ['TC-004 repeats the utterance already used by TC-001']);

  const unknown = { ...sound, cases: [...sound.cases, { id: 'TC-005', utterance: 'x', expect: 'veri:ghost', kind: 'coverage' as const }] };
  assert.deepEqual(checkTriggerCorpus(unknown), ['TC-005 expects undeclared skill veri:ghost']);

  const unpaired = { ...sound, cases: sound.cases.slice(1) };
  assert.deepEqual(checkTriggerCorpus(unpaired), [
    'no case expects veri:define',
    'near-miss pair define-vs-decide has no case on the veri:define side',
  ]);

  const noRationale = {
    ...sound,
    cases: sound.cases.map((entry) => (entry.id === 'TC-001' ? { ...entry, rationale: undefined } : entry)),
  };
  assert.deepEqual(checkTriggerCorpus(noRationale), ['TC-001 is a near-miss case with no rationale']);

  const misKinded = {
    ...sound,
    cases: sound.cases.map((entry) => (entry.id === 'TC-003' ? { ...entry, kind: 'coverage' as const } : entry)),
  };
  assert.deepEqual(checkTriggerCorpus(misKinded), [
    'TC-003 expects nothing but is not kind negative',
    'the corpus has no negative set — zero false triggers is the hard half of the floor',
  ]);
});

test('parseTriggerCorpus refuses malformed corpora', () => {
  assert.throws(() => parseTriggerCorpus('version: 2\nskills: []\n'), /trigger corpus:/);
  assert.throws(() => parseTriggerCorpus('cases: [\n'), /YAML parse error/);
  assert.throws(
    () => parseTriggerCorpus('version: 1\nskills:\n  - id: define\n    tier: default\n    gate: g\nnear_miss_pairs: []\ncases: []\n'),
    /skill id/,
  );
});
