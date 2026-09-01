import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

/**
 * The skill library's trigger corpus (WO-130, DEC-129): utterances paired
 * with the gate that should answer them, plus a negative set that must fire
 * nothing. This module is the schema and its invariants — pure over the
 * corpus text, with no runner and no filesystem knowledge. The committed
 * corpus lives at `skills/trigger-corpus.yaml`; a later work order's runner
 * and the shell emitter both read it through this parse so there is one
 * statement of what each skill is for.
 *
 * DEC-129 sets the floor as no regression against the corpus plus zero false
 * triggers on the negative set — never a percentage. Nothing here scores
 * anything: what this file protects is that the corpus stays well-formed and
 * keeps covering every gate and every declared boundary.
 */

/** A skill id: the `veri:` prefix DEC-125 fixes as the user-facing name. */
export const SKILL_ID_RE = /^veri:[a-z][a-z0-9-]*$/;

/** A case id: stable across rewordings, so no-regression tracking follows the
    case rather than the string it currently holds. */
export const CASE_ID_RE = /^TC-\d{3,}$/;

/** A near-miss pair id: `<skill>-vs-<skill>`, without the `veri:` prefixes. */
export const PAIR_ID_RE = /^[a-z][a-z0-9-]*-vs-[a-z][a-z0-9-]*$/;

/** The expectation for a negative case — nothing at all should fire. */
export const NO_SKILL = 'none';

const skillIdField = z.string().regex(SKILL_ID_RE, 'must be a `veri:<name>` skill id');

const skillSchema = z.object({
  id: skillIdField,
  /** REQ-040 enumerates the nine defaults; the rest are advanced (SRC-060). */
  tier: z.enum(['default', 'advanced']),
  gate: z.string().min(1),
});

const nearMissPairSchema = z.object({
  id: z.string().regex(PAIR_ID_RE, 'must be a `<skill>-vs-<skill>` pair id'),
  skills: z.tuple([skillIdField, skillIdField]),
  /** Where one gate ends and its neighbour begins — the reviewable claim. */
  boundary: z.string().min(1),
});

const caseSchema = z.object({
  id: z.string().regex(CASE_ID_RE, 'must be a `TC-nnn` case id'),
  utterance: z.string().min(1),
  /** A declared skill id, or `none` for a negative. */
  expect: z.union([skillIdField, z.literal(NO_SKILL)]),
  kind: z.enum(['coverage', 'front-door', 'negative']),
  /** A declared near-miss pair this case discriminates, when it does. */
  pair: z.string().min(1).optional(),
  rationale: z.string().min(1).optional(),
});

const corpusSchema = z.object({
  version: z.literal(1),
  skills: z.array(skillSchema).min(1),
  near_miss_pairs: z.array(nearMissPairSchema).min(1),
  cases: z.array(caseSchema).min(1),
});

export type SkillEntry = z.infer<typeof skillSchema>;
export type NearMissPair = z.infer<typeof nearMissPairSchema>;
export type TriggerCase = z.infer<typeof caseSchema>;
export type TriggerCorpus = z.infer<typeof corpusSchema>;

/** Parse the corpus text. Throws on malformed YAML or a shape violation —
    the corpus is a committed artifact, so a broken one is a build error, not
    a value to be carried around half-valid. */
export function parseTriggerCorpus(text: string): TriggerCorpus {
  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (err) {
    const firstLine = (err as Error).message.split('\n', 1)[0];
    throw new Error(`trigger corpus: YAML parse error: ${firstLine}`);
  }
  const result = corpusSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    throw new Error(`trigger corpus: ${problems.join('; ')}`);
  }
  return result.data;
}

/** Utterances compared the way a duplicate would actually be a duplicate:
    case-insensitively, with surrounding and repeated whitespace collapsed. */
export function normalizeUtterance(utterance: string): string {
  return utterance.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Every case whose expected answer is this skill. */
export function casesForSkill(corpus: TriggerCorpus, skillId: string): TriggerCase[] {
  return corpus.cases.filter((entry) => entry.expect === skillId);
}

/**
 * The corpus's invariants, as a list of human-readable problems — empty when
 * the corpus is sound. Separate from `parseTriggerCorpus` so a reviewer sees
 * every problem at once instead of the first one.
 */
export function checkTriggerCorpus(corpus: TriggerCorpus): string[] {
  const problems: string[] = [];
  const skillIds = new Set<string>();
  for (const skill of corpus.skills) {
    if (skillIds.has(skill.id)) problems.push(`duplicate skill id ${skill.id}`);
    skillIds.add(skill.id);
  }

  const pairs = new Map<string, NearMissPair>();
  for (const pair of corpus.near_miss_pairs) {
    if (pairs.has(pair.id)) problems.push(`duplicate near-miss pair id ${pair.id}`);
    pairs.set(pair.id, pair);
    if (pair.skills[0] === pair.skills[1]) problems.push(`near-miss pair ${pair.id} names the same skill twice`);
    for (const skill of pair.skills) {
      if (!skillIds.has(skill)) problems.push(`near-miss pair ${pair.id} names undeclared skill ${skill}`);
    }
  }

  const caseIds = new Set<string>();
  const utterances = new Map<string, string>();
  for (const entry of corpus.cases) {
    if (caseIds.has(entry.id)) problems.push(`duplicate case id ${entry.id}`);
    caseIds.add(entry.id);

    const normalized = normalizeUtterance(entry.utterance);
    const seen = utterances.get(normalized);
    if (seen) problems.push(`${entry.id} repeats the utterance already used by ${seen}`);
    else utterances.set(normalized, entry.id);

    if (entry.expect === NO_SKILL) {
      if (entry.kind !== 'negative') problems.push(`${entry.id} expects nothing but is not kind negative`);
    } else {
      if (entry.kind === 'negative') problems.push(`${entry.id} is kind negative but expects ${entry.expect}`);
      if (!skillIds.has(entry.expect)) problems.push(`${entry.id} expects undeclared skill ${entry.expect}`);
    }

    if (entry.pair !== undefined) {
      const pair = pairs.get(entry.pair);
      if (!pair) {
        problems.push(`${entry.id} names undeclared near-miss pair ${entry.pair}`);
      } else if (!pair.skills.includes(entry.expect)) {
        problems.push(`${entry.id} is paired on ${entry.pair} but expects ${entry.expect}, which is not one of its two gates`);
      }
      // DEC-129: the near-miss rationale is the part a reviewer checks, and
      // the part cited when a boundary is later disputed.
      if (entry.rationale === undefined) problems.push(`${entry.id} is a near-miss case with no rationale`);
    }
  }

  // Coverage, which is the artifact DEC-129 says is worth defending: a skill
  // with no case is a skill whose boundary was never stated, and a pair with
  // an empty side discriminates nothing.
  for (const skill of corpus.skills) {
    if (casesForSkill(corpus, skill.id).length === 0) problems.push(`no case expects ${skill.id}`);
  }
  for (const pair of corpus.near_miss_pairs) {
    for (const skill of pair.skills) {
      const paired = corpus.cases.filter((entry) => entry.pair === pair.id && entry.expect === skill);
      if (paired.length === 0) problems.push(`near-miss pair ${pair.id} has no case on the ${skill} side`);
    }
  }

  if (corpus.cases.every((entry) => entry.kind !== 'negative')) {
    problems.push('the corpus has no negative set — zero false triggers is the hard half of the floor');
  }

  return problems;
}

// --- Referential integrity against the method library (WO-147) ---------------

/**
 * The corpus against the skills that actually exist: every declared skill,
 * every near-miss pair side, and every case expectation must name a skill
 * with a MET document standing behind it. A corpus entry pointing at a
 * phantom skill is a hard failure, not a style problem — it grades trigger
 * descriptions that no method emits, so its pass/fail says nothing.
 *
 * Pure over the corpus plus the backing set; who counts as backed is the
 * caller's fact to collect (`methodTriggerLineup` derives it from loaded
 * documents). Empty when the corpus is fully backed.
 */
export function checkCorpusIntegrity(corpus: TriggerCorpus, backedSkillIds: Iterable<string>): string[] {
  const backed = new Set(backedSkillIds);
  const problems: string[] = [];
  for (const skill of corpus.skills) {
    if (!backed.has(skill.id)) {
      problems.push(`skill ${skill.id} is declared but no method document stands behind it — the corpus grades trigger descriptions, and this skill has none to grade`);
    }
  }
  for (const pair of corpus.near_miss_pairs) {
    for (const skill of pair.skills) {
      if (!backed.has(skill)) problems.push(`near-miss pair ${pair.id} discriminates against ${skill}, which has no method document`);
    }
  }
  for (const entry of corpus.cases) {
    if (entry.expect !== NO_SKILL && !backed.has(entry.expect)) {
      problems.push(`${entry.id} expects ${entry.expect}, which has no method document`);
    }
  }
  return problems;
}

// --- The judged run's pure half (WO-147, DEC-129) ----------------------------

/** One skill as the judge sees it: the id and the trigger description the
    emitter would put in its shell. The lineup is the whole context a judge
    gets — a trigger description sees the utterance, never the project. */
export interface TriggerSkill {
  id: string;
  description: string;
}

/**
 * The judge contract's input: one JSON object per case on the judge's stdin —
 * `{ utterance, skills: [{ id, description }, …] }`. The judge answers with
 * the id of the one skill whose description should fire, or `none`, on
 * stdout. Defined here so the runner, the tests, and any replacement judge
 * read one statement of the shape.
 */
export function judgeInputFor(skills: TriggerSkill[], utterance: string): string {
  return JSON.stringify({ utterance, skills });
}

/** What a judge invocation produced: a verdict inside the contract, or the
    reason it was outside it. An error is never a pass and never a false
    trigger — it fails the run loudly as its own thing. */
export type JudgeAnswer = { answer: string } | { error: string };

/**
 * Read a judge's stdout against the contract. The verdict is the last
 * non-empty line — a judge that reasons aloud before answering stays inside
 * the contract — and it must be `none` or a skill id in the lineup; anything
 * else is a contract violation, reported verbatim rather than coerced.
 */
export function parseJudgeAnswer(stdout: string, skills: TriggerSkill[]): JudgeAnswer {
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  const verdict = lines.at(-1);
  if (verdict === undefined) return { error: 'the judge printed nothing — the contract is one line: a skill id from the lineup, or `none`' };
  if (verdict === NO_SKILL || skills.some((skill) => skill.id === verdict)) return { answer: verdict };
  return { error: `the judge answered "${verdict}", which is neither \`none\` nor a skill in the lineup` };
}

/** One case, judged. */
export interface TriggerEvalCaseResult {
  id: string;
  utterance: string;
  kind: TriggerCase['kind'];
  expect: string;
  /** The judge's verdict, when there was one inside the contract. */
  answer?: string;
  /** Why there was no verdict, when there was not. */
  error?: string;
  pass: boolean;
  /** A negative case the judge routed somewhere — the failure DEC-129 weights
      above every other, because it is the one that gets a library uninstalled. */
  falseTrigger: boolean;
}

export interface TriggerEvalReport {
  results: TriggerEvalCaseResult[];
  passed: number;
  failed: number;
  /** Judge invocations that produced no verdict inside the contract. */
  errors: number;
  negatives: number;
  falseTriggers: number;
  /**
   * DEC-129's floor, mechanical: every committed case keeps passing. The
   * corpus is the known-good artifact — there is no score to slip against and
   * no side file of tolerated failures, so "no regression" means exactly
   * this, and zero false triggers on the negative set is its hardest subset.
   */
  ok: boolean;
}

/** Score collected verdicts against the corpus. A case nobody judged is an
    error, never a silent skip — a floor with holes in it holds nothing. */
export function scoreTriggerEval(corpus: TriggerCorpus, answers: ReadonlyMap<string, JudgeAnswer>): TriggerEvalReport {
  const results: TriggerEvalCaseResult[] = corpus.cases.map((entry) => {
    const judged = answers.get(entry.id) ?? { error: 'no verdict was collected for this case' };
    if ('error' in judged) {
      return { id: entry.id, utterance: entry.utterance, kind: entry.kind, expect: entry.expect, error: judged.error, pass: false, falseTrigger: false };
    }
    const pass = judged.answer === entry.expect;
    return {
      id: entry.id,
      utterance: entry.utterance,
      kind: entry.kind,
      expect: entry.expect,
      answer: judged.answer,
      pass,
      falseTrigger: entry.expect === NO_SKILL && judged.answer !== NO_SKILL,
    };
  });
  const passed = results.filter((entry) => entry.pass).length;
  const errors = results.filter((entry) => entry.error !== undefined).length;
  return {
    results,
    passed,
    failed: results.length - passed,
    errors,
    negatives: results.filter((entry) => entry.expect === NO_SKILL).length,
    falseTriggers: results.filter((entry) => entry.falseTrigger).length,
    ok: passed === results.length,
  };
}
