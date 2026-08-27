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
